import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("concatenates class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("drops falsy values", () => {
    expect(cn("foo", false && "bar", null, undefined, "")).toBe("foo");
  });

  it("deduplicates tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("supports objects and arrays", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});
