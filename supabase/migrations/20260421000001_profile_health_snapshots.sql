-- Daily health snapshots per profile. Powers the workspace Pulse hero trend
-- and per-profile sparklines. One row per (profile, day); sync engine upserts
-- the latest value for today on every successful sync.

create table if not exists profile_health_snapshots (
  profile_id uuid not null references automation_profiles(id) on delete cascade,
  captured_on date not null default (now() at time zone 'utc')::date,
  health_score integer not null check (health_score between 0 and 100),
  open_issue_count integer not null default 0,
  critical_issue_count integer not null default 0,
  automation_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (profile_id, captured_on)
);

create index if not exists idx_profile_snapshots_recent
  on profile_health_snapshots (profile_id, captured_on desc);

alter table profile_health_snapshots enable row level security;

drop policy if exists "workspace members read snapshots" on profile_health_snapshots;
create policy "workspace members read snapshots" on profile_health_snapshots
  for select using (
    profile_id in (
      select id from automation_profiles
      where workspace_id in (select get_user_workspace_ids())
    )
  );

-- Seed today's snapshot for any existing profiles so the dashboard has an anchor point.
insert into profile_health_snapshots (profile_id, captured_on, health_score, open_issue_count, critical_issue_count, automation_count)
select
  p.id,
  (now() at time zone 'utc')::date,
  coalesce(p.health_score, 0),
  coalesce((select count(*) from automation_issues i where i.profile_id = p.id and i.status = 'open'), 0),
  coalesce((select count(*) from automation_issues i where i.profile_id = p.id and i.status = 'open' and i.severity = 'critical'), 0),
  coalesce(p.scenario_count, 0)
from automation_profiles p
on conflict (profile_id, captured_on) do nothing;
