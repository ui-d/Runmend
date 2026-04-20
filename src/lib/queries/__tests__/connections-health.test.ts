import { describe, it, expect, vi } from "vitest";
import {
  getConnectionsWithHealth,
  getInterestVoteCounts,
  type ConnectionHealth,
} from "@/lib/queries/connections";

type Row = Record<string, unknown>;

interface Recorded {
  table: string;
  select?: string;
  eq?: Array<[string, unknown]>;
  gte?: Array<[string, unknown]>;
  in?: Array<[string, unknown[]]>;
  order?: { column: string; options: { ascending: boolean } };
  returned: Row[];
}

function createRecorder() {
  return {
    calls: [] as Recorded[],
    fixtures: new Map<string, Row[]>(),
    setFixture(table: string, rows: Row[]) {
      this.fixtures.set(table, rows);
    },
  };
}

type Recorder = ReturnType<typeof createRecorder>;

function mockSupabase(recorder: Recorder) {
  return {
    from(table: string) {
      const state: Recorded = { table, eq: [], gte: [], in: [], returned: [] };
      const chain: Record<string, (...args: unknown[]) => unknown> = {};
      const finalize = () => {
        state.returned = recorder.fixtures.get(table) ?? [];
        recorder.calls.push(state);
        return Promise.resolve({ data: state.returned, error: null });
      };

      chain.select = (sel: unknown) => {
        state.select = String(sel);
        return chain;
      };
      chain.eq = (column: unknown, value: unknown) => {
        state.eq?.push([String(column), value]);
        return chain;
      };
      chain.gte = (column: unknown, value: unknown) => {
        state.gte?.push([String(column), value]);
        return chain;
      };
      chain.in = (column: unknown, values: unknown) => {
        state.in?.push([String(column), values as unknown[]]);
        return chain;
      };
      chain.order = (column: unknown, options: unknown) => {
        state.order = {
          column: String(column),
          options: options as { ascending: boolean },
        };
        return chain;
      };
      (chain as unknown as { then: PromiseLike<unknown>["then"] }).then = ((
        resolve: (value: unknown) => unknown,
      ) => finalize().then(resolve)) as unknown as PromiseLike<unknown>["then"];

      return chain;
    },
  };
}

describe("getConnectionsWithHealth", () => {
  it("rolls up 24h executions into hourly buckets and returns 24 entries", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-23T12:00:00Z");
    vi.setSystemTime(now);

    const recorder = createRecorder();
    recorder.setFixture("platform_connections", [
      {
        id: "conn-1",
        workspace_id: "ws-1",
        platform: "make",
        display_name: "Primary",
        status: "active",
        last_synced_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        error_message: null,
        last_tested_at: null,
        auth_type: "api_key",
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        api_key_encrypted: "xxx",
        instance_url: null,
        team_id: 1,
        updated_at: now.toISOString(),
        zone: "eu1",
        credentials_vault_id: null,
      },
    ]);
    recorder.setFixture("automations", [
      { id: "a-1", connection_id: "conn-1", profile_id: "p-1" },
      { id: "a-2", connection_id: "conn-1", profile_id: "p-1" },
      { id: "a-3", connection_id: "conn-1", profile_id: "p-2" },
    ]);

    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    recorder.setFixture("execution_logs", [
      {
        automation_id: "a-1",
        status: "success",
        started_at: new Date(windowStart.getTime() + 60 * 60 * 1000).toISOString(),
      },
      {
        automation_id: "a-1",
        status: "error",
        started_at: new Date(windowStart.getTime() + 60 * 60 * 1000 + 5000).toISOString(),
      },
      {
        automation_id: "a-2",
        status: "success",
        started_at: new Date(windowStart.getTime() + 23 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    const supabase = mockSupabase(recorder) as unknown as Parameters<
      typeof getConnectionsWithHealth
    >[0];
    const result = await getConnectionsWithHealth(supabase, "ws-1");

    expect(result).toHaveLength(1);
    const conn = result[0] as ConnectionHealth;
    expect(conn.automationCount).toBe(3);
    expect(conn.profileCount).toBe(2);
    expect(conn.executions24h).toBe(3);
    expect(conn.executions24hFailed).toBe(1);
    expect(conn.failureRate24h).toBeCloseTo(1 / 3);
    expect(conn.sparkline24h).toHaveLength(24);
    expect(conn.sparkline24h[1]).toEqual({ hour: 1, total: 2, failed: 1 });
    expect(conn.sparkline24h[23]).toEqual({ hour: 23, total: 1, failed: 0 });
    expect(conn.nextSyncAt).not.toBeNull();
    expect(conn.freshness).toBe("fresh");

    vi.useRealTimers();
  });

  it("returns empty array for workspaces with no connections", async () => {
    const recorder = createRecorder();
    recorder.setFixture("platform_connections", []);
    const supabase = mockSupabase(recorder) as unknown as Parameters<
      typeof getConnectionsWithHealth
    >[0];
    const result = await getConnectionsWithHealth(supabase, "empty-ws");
    expect(result).toEqual([]);
  });
});

describe("getInterestVoteCounts", () => {
  it("returns 0 for every requested slug, even when there are no rows", async () => {
    const recorder = createRecorder();
    recorder.setFixture("connection_interest", []);
    const supabase = mockSupabase(recorder) as unknown as Parameters<
      typeof getInterestVoteCounts
    >[0];
    const result = await getInterestVoteCounts(supabase, "ws-1", ["bardeen", "lindy"]);
    expect(result).toEqual({ bardeen: 0, lindy: 0 });
  });

  it("aggregates votes across users", async () => {
    const recorder = createRecorder();
    recorder.setFixture("connection_interest", [
      { platform_slug: "bardeen" },
      { platform_slug: "bardeen" },
      { platform_slug: "lindy" },
    ]);
    const supabase = mockSupabase(recorder) as unknown as Parameters<
      typeof getInterestVoteCounts
    >[0];
    const result = await getInterestVoteCounts(supabase, "ws-1", [
      "bardeen",
      "lindy",
      "airtable_automations",
    ]);
    expect(result).toEqual({ bardeen: 2, lindy: 1, airtable_automations: 0 });
  });

  it("short-circuits when no slugs requested", async () => {
    const recorder = createRecorder();
    const supabase = mockSupabase(recorder) as unknown as Parameters<
      typeof getInterestVoteCounts
    >[0];
    const result = await getInterestVoteCounts(supabase, "ws-1", []);
    expect(result).toEqual({});
    expect(recorder.calls).toHaveLength(0);
  });
});
