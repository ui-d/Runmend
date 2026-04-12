import { describe, it, expect } from "vitest";
import {
  connectionCreateSchema,
  scheduleUpsertSchema,
  checkoutSchema,
  diagnosticSchema,
  portalSchema,
  markAllReadSchema,
  formatZodErrors,
} from "../schemas";

describe("connectionCreateSchema", () => {
  it("accepts valid Make.com connection", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "make",
      apiKey: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid n8n connection with instance URL", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "n8n",
      apiKey: "abc123",
      instanceUrl: "https://n8n.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid platform", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "zapier",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid workspace ID", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "not-a-uuid",
      platform: "make",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid instance URL", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "n8n",
      instanceUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid zone for Make.com", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "make",
      apiKey: "key",
      zone: "eu1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid zone", () => {
    const result = connectionCreateSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      platform: "make",
      zone: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("scheduleUpsertSchema", () => {
  it("accepts valid daily cron expression", () => {
    const result = scheduleUpsertSchema.safeParse({
      cronExpression: "0 8 * * *",
    });
    expect(result.success).toBe(true);
  });

  it("defaults isActive to true", () => {
    const result = scheduleUpsertSchema.safeParse({
      cronExpression: "30 14 * * *",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects invalid cron format", () => {
    const result = scheduleUpsertSchema.safeParse({
      cronExpression: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects cron with fewer than 5 fields", () => {
    const result = scheduleUpsertSchema.safeParse({
      cronExpression: "0 8 * *",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range hour", () => {
    const result = scheduleUpsertSchema.safeParse({
      cronExpression: "0 25 * * *",
    });
    expect(result.success).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("accepts valid checkout", () => {
    const result = checkoutSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      plan: "starter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid plan", () => {
    const result = checkoutSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      plan: "enterprise",
    });
    expect(result.success).toBe(false);
  });
});

describe("diagnosticSchema", () => {
  it("accepts valid profileId", () => {
    const result = diagnosticSchema.safeParse({ profileId: "abc-123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty profileId", () => {
    const result = diagnosticSchema.safeParse({ profileId: "" });
    expect(result.success).toBe(false);
  });
});

describe("portalSchema", () => {
  it("accepts valid UUID", () => {
    const result = portalSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", () => {
    const result = portalSchema.safeParse({ workspaceId: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("markAllReadSchema", () => {
  it("accepts valid UUID", () => {
    const result = markAllReadSchema.safeParse({
      workspaceId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });
});

describe("formatZodErrors", () => {
  it("formats error messages with path", () => {
    const result = connectionCreateSchema.safeParse({ platform: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});
