import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}));

import { middleware } from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";

describe("middleware delegate", () => {
  it("delegates to updateSession", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/app"));
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(updateSession).toHaveBeenCalledWith(req);
  });
});
