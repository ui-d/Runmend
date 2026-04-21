import { describe, it, expect } from "vitest";
import {
  buildMakeScenarioUrl,
  buildN8nWorkflowUrl,
  buildScenarioUrl,
} from "@/lib/platform-adapters/urls";

describe("buildMakeScenarioUrl", () => {
  it("composes the canonical Make URL", () => {
    expect(buildMakeScenarioUrl("eu1", 42, "99")).toBe(
      "https://eu1.make.com/42/scenarios/99",
    );
  });
});

describe("buildN8nWorkflowUrl", () => {
  it("preserves the instance URL", () => {
    expect(buildN8nWorkflowUrl("https://n8n.example.com", "abc")).toBe(
      "https://n8n.example.com/workflow/abc",
    );
  });

  it("strips trailing slash from instance URL", () => {
    expect(buildN8nWorkflowUrl("https://n8n.example.com/", "abc")).toBe(
      "https://n8n.example.com/workflow/abc",
    );
  });
});

describe("buildScenarioUrl", () => {
  it("returns undefined for empty externalId", () => {
    expect(
      buildScenarioUrl(
        { platform: "make", zone: "eu1", teamId: 1, instanceUrl: null },
        "",
      ),
    ).toBeUndefined();
  });

  it("builds Make URL when zone + teamId present", () => {
    const url = buildScenarioUrl(
      { platform: "make", zone: "us1", teamId: 7, instanceUrl: null },
      "123",
    );
    expect(url).toBe("https://us1.make.com/7/scenarios/123");
  });

  it("falls back to undefined when Make zone or teamId is missing", () => {
    expect(
      buildScenarioUrl(
        { platform: "make", zone: null, teamId: 1, instanceUrl: null },
        "123",
      ),
    ).toBeUndefined();
    expect(
      buildScenarioUrl(
        { platform: "make", zone: "us1", teamId: null, instanceUrl: null },
        "123",
      ),
    ).toBeUndefined();
  });

  it("builds n8n URL when instanceUrl is present", () => {
    expect(
      buildScenarioUrl(
        { platform: "n8n", zone: null, teamId: null, instanceUrl: "https://n8n.example" },
        "wf-1",
      ),
    ).toBe("https://n8n.example/workflow/wf-1");
  });

  it("returns undefined for n8n without instanceUrl", () => {
    expect(
      buildScenarioUrl(
        { platform: "n8n", zone: null, teamId: null, instanceUrl: null },
        "wf-1",
      ),
    ).toBeUndefined();
  });
});
