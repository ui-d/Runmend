import { describe, it, expect } from "vitest";
import {
  getWorkspaceProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
} from "@/lib/queries/profiles";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeProfile } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("getWorkspaceProfiles", () => {
  it("returns rows for the workspace", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "a", workspace_id: "ws-1" }), automation_issues: [] },
      { ...makeProfile({ id: "b", workspace_id: "ws-2" }), automation_issues: [] },
    ]);
    const result = await getWorkspaceProfiles(client, "ws-1");
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("getProfileById", () => {
  it("returns the profile when found", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), automation_issues: [] },
    ]);
    const result = await getProfileById(client, "p-1");
    expect(result?.id).toBe("p-1");
  });

  it("returns null when PGRST116", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", []);
    const result = await getProfileById(client, "missing");
    expect(result).toBeNull();
  });
});

describe("createProfile", () => {
  it("inserts workspace_id, name, platform, and nullable fields", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", []);
    const result = await createProfile(client, {
      workspaceId: "ws-1",
      name: "New",
      platform: "make",
    });
    expect(result.name).toBe("New");
    const insert = mock.getCalls("automation_profiles").find((c) => c.op === "insert");
    expect(insert!.payload).toMatchObject({
      workspace_id: "ws-1",
      name: "New",
      platform: "make",
      industry: null,
      description: null,
    });
  });
});

describe("updateProfile", () => {
  it("updates by id and returns the new row", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", [makeProfile({ id: "p-1", name: "Old" })]);
    const result = await updateProfile(client, "p-1", { name: "New" });
    expect(result.name).toBe("New");
  });
});

describe("deleteProfile", () => {
  it("records the delete filter", async () => {
    const { mock, client } = wire();
    mock.setTable("automation_profiles", [makeProfile({ id: "p-1" })]);
    await deleteProfile(client, "p-1");
    const del = mock.getCalls("automation_profiles").find((c) => c.op === "delete");
    expect(del!.eq).toContainEqual(["id", "p-1"]);
  });
});
