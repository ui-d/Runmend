import { describe, it, expect } from "vitest";
import { getLtdAllocation, getWorkspaceUsage } from "@/lib/queries/usage";
import { createSupabaseMock } from "@/test/supabase-mock";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("getLtdAllocation", () => {
  it("returns defaults when no row", async () => {
    const { mock, client } = wire();
    mock.setTable("ltd_allocations", []);
    const result = await getLtdAllocation(client);
    expect(result.totalSeats).toBe(20);
    expect(result.seatsRemaining).toBe(20);
    expect(result.soldOut).toBe(false);
  });

  it("derives remaining + soldOut", async () => {
    const { mock, client } = wire();
    mock.setTable("ltd_allocations", [
      { id: 1, total_seats: 100, seats_sold: 100, updated_at: new Date().toISOString() },
    ]);
    const result = await getLtdAllocation(client);
    expect(result.soldOut).toBe(true);
    expect(result.seatsRemaining).toBe(0);
  });
});

describe("getWorkspaceUsage", () => {
  it("returns zero diagnostics when no profiles", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", []);
    mock.setTable("diagnostic_reports", []);
    const result = await getWorkspaceUsage(client, "ws-1", "free");
    expect(result.profiles.used).toBe(0);
    expect(result.diagnosticsThisMonth.used).toBe(0);
    expect(result.profiles.limit).toBeGreaterThan(0);
  });

  it("reports diagnostics for the current month", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", [
      { id: "p-1", workspace_id: "ws-1" },
    ]);
    mock.setTable("diagnostic_reports", [
      {
        id: "r-1",
        profile_id: "p-1",
        created_at: new Date().toISOString(),
      },
    ]);
    const result = await getWorkspaceUsage(client, "ws-1", "pro");
    expect(result.profiles.used).toBe(1);
    expect(result.diagnosticsThisMonth.used).toBe(1);
  });
});
