import { describe, it, expect } from "vitest";
import {
  getWorkspaceConnections,
  getConnectionById,
  upsertConnection,
  deleteConnection,
  updateConnectionStatus,
  getUserVotes,
} from "@/lib/queries/connections";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeConnection } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  const client = mock.client as unknown as SupabaseClient<Database>;
  return { mock, client };
}

describe("getWorkspaceConnections", () => {
  it("returns rows filtered by workspace", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", [
      makeConnection({ id: "a", workspace_id: "ws-1" }),
      makeConnection({ id: "b", workspace_id: "ws-2" }),
    ]);
    const result = await getWorkspaceConnections(client, "ws-1");
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "RLS denied" });
    await expect(getWorkspaceConnections(client, "ws-1")).rejects.toMatchObject({
      message: "RLS denied",
    });
  });
});

describe("getConnectionById", () => {
  it("returns the connection when found", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", [makeConnection({ id: "c-1" })]);
    const result = await getConnectionById(client, "c-1");
    expect(result?.id).toBe("c-1");
  });

  it("returns null when no row matches (PGRST116)", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", []);
    const result = await getConnectionById(client, "missing");
    expect(result).toBeNull();
  });
});

describe("upsertConnection", () => {
  it("writes the input and returns it", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", []);
    const result = await upsertConnection(client, {
      workspace_id: "ws-1",
      platform: "make",
      display_name: "Primary",
      auth_type: "api_key",
    });
    expect(result.display_name).toBe("Primary");
    const calls = mock.getCalls("platform_connections");
    expect(calls.some((c) => c.op === "upsert")).toBe(true);
  });
});

describe("deleteConnection", () => {
  it("issues a delete filtered by id", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", [makeConnection({ id: "c-1" })]);
    await deleteConnection(client, "c-1");
    const calls = mock.getCalls("platform_connections");
    expect(calls.some((c) => c.op === "delete")).toBe(true);
  });
});

describe("updateConnectionStatus", () => {
  it("updates status, last_tested_at, and error message", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", [makeConnection({ id: "c-1" })]);
    await updateConnectionStatus(client, "c-1", "error", "bad token");
    const calls = mock.getCalls("platform_connections");
    const upd = calls.find((c) => c.op === "update");
    expect(upd).toBeDefined();
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.status).toBe("error");
    expect(payload.error_message).toBe("bad token");
    expect(payload.last_tested_at).toBeTypeOf("string");
    expect(payload).not.toHaveProperty("last_synced_at");
  });

  it("also sets last_synced_at when status is active", async () => {
    const { mock, client } = wire();
    mock.setTable("platform_connections", [makeConnection({ id: "c-1" })]);
    await updateConnectionStatus(client, "c-1", "active");
    const upd = mock.getCalls("platform_connections").find((c) => c.op === "update");
    expect((upd!.payload as Record<string, unknown>).last_synced_at).toBeTypeOf("string");
  });
});

describe("getUserVotes", () => {
  it("returns a set of platform slugs the user has voted on", async () => {
    const { mock, client } = wire();
    mock.setTable("connection_interest", [
      { platform_slug: "bardeen", workspace_id: "ws-1", user_id: "u-1" },
      { platform_slug: "lindy", workspace_id: "ws-1", user_id: "u-1" },
      { platform_slug: "bardeen", workspace_id: "ws-1", user_id: "other" },
    ]);
    const set = await getUserVotes(client, "ws-1", "u-1");
    expect(set.has("bardeen")).toBe(true);
    expect(set.has("lindy")).toBe(true);
    expect(set.size).toBe(2);
  });
});
