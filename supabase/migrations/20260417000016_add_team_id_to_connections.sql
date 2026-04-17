-- Add team_id column for Make.com API — required to list scenarios
ALTER TABLE public.platform_connections ADD COLUMN team_id integer;
