import { describe, it, expect } from "vitest";
import {
  ALL_EVENT_TYPES,
  DEFAULT_SEVERITIES,
  defaultConfig,
  defaultEnabled,
  normalizeConfig,
} from "../config";

describe("defaultConfig", () => {
  it("returns critical + warning severities by default", () => {
    expect(defaultConfig().severities).toEqual(DEFAULT_SEVERITIES);
  });

  it("enables all event types by default", () => {
    expect(defaultConfig().event_types).toEqual(ALL_EVENT_TYPES);
  });

  it("leaves quiet_hours and digest null", () => {
    const cfg = defaultConfig();
    expect(cfg.quiet_hours).toBeNull();
    expect(cfg.digest).toBeNull();
  });
});

describe("defaultEnabled", () => {
  it("defaults in_app and email to ON (retention-critical)", () => {
    expect(defaultEnabled("in_app")).toBe(true);
    expect(defaultEnabled("email")).toBe(true);
  });

  it("defaults slack and webhook to OFF (not yet implemented)", () => {
    expect(defaultEnabled("slack")).toBe(false);
    expect(defaultEnabled("webhook")).toBe(false);
  });
});

describe("normalizeConfig", () => {
  it("returns defaults for null input", () => {
    expect(normalizeConfig(null)).toEqual(defaultConfig());
  });

  it("returns defaults for non-object input", () => {
    expect(normalizeConfig("garbage")).toEqual(defaultConfig());
    expect(normalizeConfig(42)).toEqual(defaultConfig());
  });

  it("preserves valid severities and drops unknown ones", () => {
    const normalized = normalizeConfig({
      severities: ["critical", "nonsense", "info"],
    });
    expect(normalized.severities).toEqual(["critical", "info"]);
  });

  it("preserves valid event_types and drops unknown ones", () => {
    const normalized = normalizeConfig({
      event_types: ["issue_detected", "fake_event", "audit_complete"],
    });
    expect(normalized.event_types).toEqual([
      "issue_detected",
      "audit_complete",
    ]);
  });

  it("falls back to default event_types when missing", () => {
    const normalized = normalizeConfig({ severities: ["info"] });
    expect(normalized.event_types).toEqual(ALL_EVENT_TYPES);
  });

  it("falls back to empty muted_profile_ids when missing", () => {
    expect(normalizeConfig({}).muted_profile_ids).toEqual([]);
  });

  it("filters non-string muted_profile_ids", () => {
    const normalized = normalizeConfig({
      muted_profile_ids: ["abc", 42, null, "def"],
    });
    expect(normalized.muted_profile_ids).toEqual(["abc", "def"]);
  });

  it("preserves a valid quiet_hours object", () => {
    const quiet = {
      enabled: true,
      start: "22:00",
      end: "08:00",
      timezone: "Europe/Warsaw",
    };
    expect(normalizeConfig({ quiet_hours: quiet }).quiet_hours).toEqual(quiet);
  });

  it("preserves a valid digest object", () => {
    const digest = { enabled: true, schedule: "weekly" as const };
    expect(normalizeConfig({ digest }).digest).toEqual(digest);
  });
});
