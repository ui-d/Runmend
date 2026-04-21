import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildEnhancedPrompt } from "@/lib/diagnostic/enhanced-prompt";
import {
  makeProfile,
  makeAutomation,
  makeExecution,
  makeIssue,
  hoursAgo,
  daysAgo,
} from "@/test/factories";

describe("buildEnhancedPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes profile identity fields", () => {
    const profile = makeProfile({
      name: "Acme Agency",
      platform: "make",
      industry: "Marketing",
      health_score: 73,
    });
    const prompt = buildEnhancedPrompt(profile, [], [], []);
    expect(prompt).toContain("Acme Agency");
    expect(prompt).toContain("Marketing");
    expect(prompt).toContain("73/100");
  });

  it("renders 'Not specified' when industry is empty", () => {
    const profile = makeProfile({ industry: null });
    const prompt = buildEnhancedPrompt(profile, [], [], []);
    expect(prompt).toContain("Industry: Not specified");
  });

  it("summarizes automation counts by status", () => {
    const automations = [
      makeAutomation({ id: "a", status: "active" }),
      makeAutomation({ id: "b", status: "inactive" }),
      makeAutomation({ id: "c", status: "error" }),
      makeAutomation({ id: "d", status: "active" }),
    ];
    const prompt = buildEnhancedPrompt(makeProfile(), automations, [], []);
    expect(prompt).toContain("Total automations: 4 (2 active, 1 inactive, 1 in error state)");
  });

  it("computes 24h and 7-day error rates", () => {
    const a = makeAutomation({ id: "a" });
    const execs = [
      makeExecution("a", { started_at: hoursAgo(1), status: "error" }),
      makeExecution("a", { started_at: hoursAgo(2), status: "error" }),
      makeExecution("a", { started_at: hoursAgo(3), status: "success" }),
      makeExecution("a", { started_at: hoursAgo(4), status: "success" }),
      makeExecution("a", { started_at: daysAgo(4), status: "success" }),
    ];
    const prompt = buildEnhancedPrompt(makeProfile(), [a], execs, []);
    expect(prompt).toContain("Executions in last 7 days: 5");
    expect(prompt).toContain("Overall success rate: 60%");
    expect(prompt).toContain("24h error rate: 50%");
  });

  it("lists top error automations when >5% failure rate and 3+ runs", () => {
    const a = makeAutomation({ id: "a", name: "Critical job" });
    const execs = [
      makeExecution("a", { started_at: hoursAgo(1), status: "error" }),
      makeExecution("a", { started_at: hoursAgo(2), status: "error" }),
      makeExecution("a", { started_at: hoursAgo(3), status: "success" }),
      makeExecution("a", { started_at: hoursAgo(4), status: "success" }),
    ];
    const prompt = buildEnhancedPrompt(makeProfile(), [a], execs, []);
    expect(prompt).toContain("Critical job");
    expect(prompt).toContain("50% failure");
  });

  it("renders 'No automations...' block when none qualify", () => {
    const prompt = buildEnhancedPrompt(makeProfile(), [], [], []);
    expect(prompt).toContain("No automations with significant error rates");
  });

  it("renders top error patterns", () => {
    const a = makeAutomation({ id: "a" });
    const execs = [
      makeExecution("a", {
        started_at: hoursAgo(1),
        status: "error",
        error_message: "Connection refused",
      }),
      makeExecution("a", {
        started_at: hoursAgo(2),
        status: "error",
        error_message: "Connection refused",
      }),
      makeExecution("a", {
        started_at: hoursAgo(3),
        status: "error",
        error_message: null,
      }),
    ];
    const prompt = buildEnhancedPrompt(makeProfile(), [a], execs, []);
    expect(prompt).toContain("Connection refused");
    expect(prompt).toContain("(2x)");
    expect(prompt).toContain("Unknown error");
  });

  it("lists only open issues", () => {
    const a = makeAutomation({ id: "a" });
    const issues = [
      makeIssue({ status: "open", name: "Silent", automation_name: "A" }),
      makeIssue({ status: "resolved", name: "Old", automation_name: "B" }),
    ];
    const prompt = buildEnhancedPrompt(makeProfile(), [a], [], issues);
    expect(prompt).toContain("Current Open Issues (1)");
    expect(prompt).toContain("Silent");
    expect(prompt).not.toContain("Old");
  });

  it("renders empty issues block when nothing is open", () => {
    const prompt = buildEnhancedPrompt(makeProfile(), [], [], []);
    expect(prompt).toContain("No open issues.");
  });

  it("ignores executions with no matching automation when computing per-automation errors", () => {
    const a = makeAutomation({ id: "a" });
    const orphan = makeExecution("orphan", { started_at: hoursAgo(1), status: "error" });
    const prompt = buildEnhancedPrompt(makeProfile(), [a], [orphan], []);
    expect(prompt).toContain("No automations with significant error rates");
  });
});
