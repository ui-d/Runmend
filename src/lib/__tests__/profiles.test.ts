import { describe, it, expect } from "vitest";
import { getAllProfiles, getProfileById } from "@/lib/profiles";

describe("getAllProfiles", () => {
  it("returns a non-empty list", () => {
    const profiles = getAllProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  it("every profile has a unique id", () => {
    const profiles = getAllProfiles();
    const ids = new Set(profiles.map((p) => p.id));
    expect(ids.size).toBe(profiles.length);
  });
});

describe("getProfileById", () => {
  it("returns the matching profile when it exists", () => {
    const first = getAllProfiles()[0]!;
    const found = getProfileById(first.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(first.id);
  });

  it("returns undefined for an unknown id", () => {
    expect(getProfileById("does-not-exist")).toBeUndefined();
  });
});
