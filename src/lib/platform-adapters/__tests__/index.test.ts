import { describe, it, expect } from "vitest";
import { createAdapter } from "@/lib/platform-adapters";
import { MakeAdapter } from "@/lib/platform-adapters/make";
import { N8nAdapter } from "@/lib/platform-adapters/n8n";

describe("createAdapter", () => {
  it("returns a MakeAdapter for 'make'", () => {
    const a = createAdapter("make", { apiKey: "k", zone: "eu1", teamId: 1 });
    expect(a).toBeInstanceOf(MakeAdapter);
  });

  it("returns an N8nAdapter for 'n8n'", () => {
    const a = createAdapter("n8n", { apiKey: "k", instanceUrl: "https://n8n.example" });
    expect(a).toBeInstanceOf(N8nAdapter);
  });

  it("throws when make apiKey is missing", () => {
    expect(() => createAdapter("make", {})).toThrow(/API key required for Make/);
  });

  it("throws when n8n apiKey is missing", () => {
    expect(() => createAdapter("n8n", { instanceUrl: "x" })).toThrow(
      /API key required for n8n/,
    );
  });

  it("throws when n8n instanceUrl is missing", () => {
    expect(() => createAdapter("n8n", { apiKey: "k" })).toThrow(
      /Instance URL required for n8n/,
    );
  });
});
