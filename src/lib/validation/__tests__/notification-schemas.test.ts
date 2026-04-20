import { describe, it, expect } from "vitest";
import {
  accountUpdateSchema,
  notificationConfigSchema,
  notificationPreferenceUpdateSchema,
  workspaceNameUpdateSchema,
} from "../schemas";

const VALID_WORKSPACE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_PROFILE_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("notificationConfigSchema", () => {
  it("accepts a minimal valid config", () => {
    const result = notificationConfigSchema.safeParse({
      severities: ["critical"],
      event_types: ["issue_detected"],
      muted_profile_ids: [],
      quiet_hours: null,
      digest: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown severities", () => {
    const result = notificationConfigSchema.safeParse({
      severities: ["bogus"],
      event_types: [],
      muted_profile_ids: [],
      quiet_hours: null,
      digest: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed quiet_hours time", () => {
    const result = notificationConfigSchema.safeParse({
      severities: [],
      event_types: [],
      muted_profile_ids: [],
      quiet_hours: {
        enabled: true,
        start: "25:99",
        end: "08:00",
        timezone: "UTC",
      },
      digest: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid quiet_hours and digest", () => {
    const result = notificationConfigSchema.safeParse({
      severities: ["critical", "warning"],
      event_types: ["issue_detected", "connection_error"],
      muted_profile_ids: [VALID_PROFILE_ID],
      quiet_hours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "Europe/Warsaw",
      },
      digest: { enabled: true, schedule: "daily" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid muted_profile_ids", () => {
    const result = notificationConfigSchema.safeParse({
      severities: [],
      event_types: [],
      muted_profile_ids: ["not-a-uuid"],
      quiet_hours: null,
      digest: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("notificationPreferenceUpdateSchema", () => {
  it("accepts a full valid payload", () => {
    const result = notificationPreferenceUpdateSchema.safeParse({
      workspaceId: VALID_WORKSPACE_ID,
      channel: "email",
      is_enabled: true,
      config: {
        severities: ["critical"],
        event_types: ["issue_detected"],
        muted_profile_ids: [],
        quiet_hours: null,
        digest: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown channel", () => {
    const result = notificationPreferenceUpdateSchema.safeParse({
      workspaceId: VALID_WORKSPACE_ID,
      channel: "carrier-pigeon",
      is_enabled: true,
      config: {
        severities: [],
        event_types: [],
        muted_profile_ids: [],
        quiet_hours: null,
        digest: null,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("workspaceNameUpdateSchema", () => {
  it("trims and accepts a valid name", () => {
    const result = workspaceNameUpdateSchema.safeParse({
      workspaceId: VALID_WORKSPACE_ID,
      name: "  Acme Monitoring  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Monitoring");
    }
  });

  it("rejects empty name after trim", () => {
    const result = workspaceNameUpdateSchema.safeParse({
      workspaceId: VALID_WORKSPACE_ID,
      name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects names over 60 chars", () => {
    const result = workspaceNameUpdateSchema.safeParse({
      workspaceId: VALID_WORKSPACE_ID,
      name: "x".repeat(61),
    });
    expect(result.success).toBe(false);
  });
});

describe("accountUpdateSchema", () => {
  it("accepts empty string (user clearing their name)", () => {
    const result = accountUpdateSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(true);
  });

  it("rejects names over 80 chars", () => {
    const result = accountUpdateSchema.safeParse({
      fullName: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });
});
