import { describe, it, expect } from "vitest";
import {
  getUserWorkspaces,
  getWorkspaceBySlug,
  createWorkspace,
  updateWorkspaceName,
  getWorkspaceMembers,
} from "@/lib/queries/workspaces";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeWorkspace } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("getUserWorkspaces", () => {
  it("returns workspaces with the join intact", async () => {
    const { mock, client } = wire();
    mock.setTable("workspaces", [
      {
        ...makeWorkspace({ id: "ws-1" }),
        workspace_members: [{ role: "owner" }],
      },
    ]);
    const result = await getUserWorkspaces(client);
    expect(result[0]!.id).toBe("ws-1");
    expect(result[0]!.workspace_members[0]!.role).toBe("owner");
  });
});

describe("getWorkspaceBySlug", () => {
  it("returns the workspace when found", async () => {
    const { mock, client } = wire();
    mock.setTable("workspaces", [makeWorkspace({ slug: "acme" })]);
    const result = await getWorkspaceBySlug(client, "acme");
    expect(result?.slug).toBe("acme");
  });

  it("returns null when missing (PGRST116)", async () => {
    const { mock, client } = wire();
    mock.setTable("workspaces", []);
    expect(await getWorkspaceBySlug(client, "nope")).toBeNull();
  });
});

describe("createWorkspace", () => {
  it("creates the workspace and inserts owner membership", async () => {
    const { mock, client } = wire();
    mock.setTable("workspaces", []);
    mock.setTable("workspace_members", []);
    const result = await createWorkspace(client, {
      name: "Acme",
      slug: "acme",
      ownerId: "u-1",
    });
    expect(result.name).toBe("Acme");
    const memberInsert = mock.getCalls("workspace_members").find((c) => c.op === "insert");
    expect(memberInsert!.payload).toMatchObject({
      user_id: "u-1",
      role: "owner",
    });
  });
});

describe("updateWorkspaceName", () => {
  it("updates name and updated_at", async () => {
    const { mock, client } = wire();
    mock.setTable("workspaces", [makeWorkspace({ id: "ws-1" })]);
    await updateWorkspaceName(client, "ws-1", "New");
    const upd = mock.getCalls("workspaces").find((c) => c.op === "update");
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.name).toBe("New");
    expect(payload.updated_at).toBeTypeOf("string");
  });
});

describe("getWorkspaceMembers", () => {
  it("flattens the users join into top-level fields", async () => {
    const { mock, client } = wire();
    mock.setTable("workspace_members", [
      {
        user_id: "u-1",
        role: "owner",
        created_at: new Date().toISOString(),
        users: { email: "owner@example.com", full_name: "Owner" },
        workspace_id: "ws-1",
      },
    ]);
    const result = await getWorkspaceMembers(client, "ws-1");
    expect(result).toEqual([
      expect.objectContaining({
        user_id: "u-1",
        role: "owner",
        email: "owner@example.com",
        full_name: "Owner",
      }),
    ]);
  });
});
