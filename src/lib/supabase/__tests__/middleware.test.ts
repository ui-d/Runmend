import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

import { updateSession } from "@/lib/supabase/middleware";

function req(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`));
}

beforeEach(() => {
  getUser.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

describe("updateSession", () => {
  it("passes through when Supabase env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await updateSession(req("/"));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated /app/* requests to /login", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await updateSession(req("/app/ws/profiles"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/login$/);
  });

  it("allows authenticated /app/* requests through", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-1" } } });
    const res = await updateSession(req("/app/ws/profiles"));
    expect(res.status).toBe(200);
  });

  it("redirects authenticated users away from /login", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "u-1" } } });
    const res = await updateSession(req("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/\/app$/);
  });

  it("allows unauthenticated /login through", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await updateSession(req("/login"));
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated non-protected pages", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await updateSession(req("/pricing"));
    expect(res.status).toBe(200);
  });
});
