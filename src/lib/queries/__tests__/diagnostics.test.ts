import { describe, it, expect } from "vitest";
import { saveDiagnosticReport, getProfileDiagnostics } from "@/lib/queries/diagnostics";
import { createSupabaseMock } from "@/test/supabase-mock";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return {
    mock,
    client: mock.client as unknown as SupabaseClient<Database>,
  };
}

describe("saveDiagnosticReport", () => {
  it("inserts the report and returns it", async () => {
    const { mock, client } = wire();
    mock.setTable("diagnostic_reports", []);
    const result = await saveDiagnosticReport(client, {
      profile_id: "p-1",
      model_used: "claude-sonnet-4-5",
      most_dangerous: "Silent failure",
      overall_health: "At risk",
      recommendations: "Do the thing",
      triggered_by: "manual",
    });
    expect(result.profile_id).toBe("p-1");
    expect(mock.getCalls("diagnostic_reports").some((c) => c.op === "insert")).toBe(true);
  });

  it("throws when supabase returns an error", async () => {
    const { mock, client } = wire();
    mock.setTableError("diagnostic_reports", { message: "bad input" });
    await expect(
      saveDiagnosticReport(client, {
        profile_id: "p-1",
        model_used: "m",
        most_dangerous: "x",
        overall_health: "x",
        recommendations: "x",
        triggered_by: "cron",
      }),
    ).rejects.toMatchObject({ message: "bad input" });
  });
});

describe("getProfileDiagnostics", () => {
  it("returns reports filtered by profile", async () => {
    const { mock, client } = wire();
    mock.setTable("diagnostic_reports", [
      {
        id: "r1",
        profile_id: "p-1",
        created_at: "2026-04-21T00:00:00Z",
        model_used: "x",
        most_dangerous: "x",
        overall_health: "x",
        recommendations: "x",
        tokens_used: 100,
        triggered_by: "manual",
      },
      {
        id: "r2",
        profile_id: "p-2",
        created_at: "2026-04-21T00:00:00Z",
        model_used: "x",
        most_dangerous: "x",
        overall_health: "x",
        recommendations: "x",
        tokens_used: 100,
        triggered_by: "manual",
      },
    ]);
    const result = await getProfileDiagnostics(client, "p-1");
    expect(result.map((r) => r.id)).toEqual(["r1"]);
  });

  it("respects the limit", async () => {
    const { mock, client } = wire();
    mock.setTable(
      "diagnostic_reports",
      Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        profile_id: "p-1",
        created_at: "2026-04-21T00:00:00Z",
        model_used: "x",
        most_dangerous: "x",
        overall_health: "x",
        recommendations: "x",
        tokens_used: 100,
        triggered_by: "manual",
      })),
    );
    const result = await getProfileDiagnostics(client, "p-1", 3);
    expect(result.length).toBe(3);
  });
});
