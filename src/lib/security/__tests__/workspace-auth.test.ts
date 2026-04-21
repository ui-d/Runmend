import { describe, it, expect } from "vitest";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeMember } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

describe("getWorkspaceMembership", () => {
  it("returns the role when the user is a member", async () => {
    const mock = createSupabaseMock();
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: "ws-1", user_id: "u-1", role: "admin" }),
    ]);
    const result = await getWorkspaceMembership(
      mock.client as unknown as SupabaseClient<Database>,
      "ws-1",
    );
    expect(result).toEqual({ role: "admin" });
  });

  it("returns null when not a member", async () => {
    const mock = createSupabaseMock();
    mock.setTable("workspace_members", []);
    const result = await getWorkspaceMembership(
      mock.client as unknown as SupabaseClient<Database>,
      "ws-other",
    );
    expect(result).toBeNull();
  });

  it("filters by workspace_id", async () => {
    const mock = createSupabaseMock();
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: "ws-a", role: "viewer" }),
      makeMember({ workspace_id: "ws-b", role: "admin" }),
    ]);
    const result = await getWorkspaceMembership(
      mock.client as unknown as SupabaseClient<Database>,
      "ws-b",
    );
    expect(result).toEqual({ role: "admin" });
  });
});
