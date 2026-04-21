import { describe, it, expect } from "vitest";
import {
  getDueSchedules,
  updateScheduleAfterRun,
  getProfileSchedule,
  upsertSchedule,
  toggleSchedule,
} from "@/lib/queries/schedules";
import { createSupabaseMock } from "@/test/supabase-mock";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

function schedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "s-1",
    profile_id: "p-1",
    cron_expression: "0 8 * * *",
    is_active: true,
    last_run_at: null,
    next_run_at: new Date(Date.now() - 60_000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getDueSchedules", () => {
  it("returns only active schedules with next_run_at in the past", async () => {
    const { mock, client } = wire();
    mock.setTable("audit_schedules", [
      schedule({ id: "a", is_active: true }),
      schedule({ id: "b", is_active: false }),
      schedule({ id: "c", next_run_at: new Date(Date.now() + 60_000).toISOString() }),
    ]);
    const result = await getDueSchedules(client);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("returns [] when no rows", async () => {
    const { mock, client } = wire();
    mock.setTable("audit_schedules", []);
    expect(await getDueSchedules(client)).toEqual([]);
  });
});

describe("updateScheduleAfterRun", () => {
  it("writes last_run_at + next_run_at for the id", async () => {
    const { mock, client } = wire();
    await updateScheduleAfterRun(client, "s-1", "0 8 * * *");
    const upd = mock.getCalls("audit_schedules").find((c) => c.op === "update");
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.last_run_at).toBeTypeOf("string");
    expect(payload.next_run_at).toBeTypeOf("string");
    expect(upd!.eq).toContainEqual(["id", "s-1"]);
  });
});

describe("getProfileSchedule", () => {
  it("returns null when none", async () => {
    const { mock, client } = wire();
    mock.setTable("audit_schedules", []);
    expect(await getProfileSchedule(client, "p-x")).toBeNull();
  });

  it("returns the row when one exists", async () => {
    const { mock, client } = wire();
    mock.setTable("audit_schedules", [schedule({ profile_id: "p-1" })]);
    const result = await getProfileSchedule(client, "p-1");
    expect(result?.profile_id).toBe("p-1");
  });
});

describe("upsertSchedule", () => {
  it("defaults cron to 0 8 * * * and is_active true", async () => {
    const { mock, client } = wire();
    await upsertSchedule(client, "p-1");
    const call = mock.getCalls("audit_schedules").find((c) => c.op === "upsert");
    const payload = call!.payload as Record<string, unknown>;
    expect(payload.cron_expression).toBe("0 8 * * *");
    expect(payload.is_active).toBe(true);
  });
});

describe("toggleSchedule", () => {
  it("sets next_run_at to null when deactivating", async () => {
    const { mock, client } = wire();
    await toggleSchedule(client, "p-1", false);
    const upd = mock.getCalls("audit_schedules").find((c) => c.op === "update");
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.is_active).toBe(false);
    expect(payload.next_run_at).toBeNull();
  });

  it("schedules a next run when activating", async () => {
    const { mock, client } = wire();
    await toggleSchedule(client, "p-1", true);
    const upd = mock.getCalls("audit_schedules").find((c) => c.op === "update");
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.is_active).toBe(true);
    expect(payload.next_run_at).toBeTypeOf("string");
  });
});
