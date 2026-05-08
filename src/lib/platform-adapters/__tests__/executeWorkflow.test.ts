import { describe, it, expect, vi, beforeEach } from "vitest";
import { MakeAdapter } from "../make";
import { N8nAdapter } from "../n8n";
import { jsonResponse, textResponse } from "@/test/http-mocks";

vi.mock("../retry", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "../retry";
const mockFetch = vi.mocked(fetchWithRetry);

beforeEach(() => {
  mockFetch.mockReset();
  vi.useRealTimers();
});

describe("MakeAdapter.executeWorkflow", () => {
  it("returns ok:false when the trigger fails", async () => {
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch.mockResolvedValueOnce(textResponse("nope", 500));
    const result = await adapter.executeWorkflow("scenario-1", { x: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Make trigger failed/);
  });

  it("returns ok:false when the trigger throws", async () => {
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const result = await adapter.executeWorkflow("scenario-1", { x: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("returns ok:true when polling finds a successful matching execution", async () => {
    vi.useFakeTimers();
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ executionId: "exec-1" }))
      .mockResolvedValueOnce(
        jsonResponse({ scenarioLogs: [{ id: "exec-1", status: "success" }] }),
      );

    const promise = adapter.executeWorkflow("scenario-1", { q: 1 });
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it("returns ok:false on workflow error status from the log", async () => {
    vi.useFakeTimers();
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ executionId: "exec-1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          scenarioLogs: [{ id: "exec-1", status: "error", error: "boom" }],
        }),
      );

    const promise = adapter.executeWorkflow("scenario-1", { q: 1 });
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toBe("boom");
  });
});

describe("N8nAdapter.executeWorkflow", () => {
  it("returns ok:true on a finished execution", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "success", finished: true, data: { ok: 1 } }),
    );
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ status: "success" });
  });

  it("returns ok:false on a non-200 response", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockResolvedValueOnce(textResponse("nope", 500));
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/n8n execute failed/);
  });

  it("returns ok:false when fetch throws", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("network down");
  });

  it("treats non-success status as failure", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "error", finished: false, error: "bad inputs" }),
    );
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("bad inputs");
  });

  it("returns a generic error message when fetch throws a non-Error", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockRejectedValueOnce("string thrown" as unknown as Error);
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Workflow execution failed");
  });

  it("falls back to default error message when n8n omits one", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "error", finished: false }),
    );
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Workflow failed");
  });

  it("treats finished:true as success even without status", async () => {
    const adapter = new N8nAdapter("key", "https://n8n.example.com");
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ finished: true, data: { x: 1 } }),
    );
    const result = await adapter.executeWorkflow("wf-1", { q: 1 });
    expect(result.ok).toBe(true);
  });
});

describe("MakeAdapter.executeWorkflow extra paths", () => {
  it("returns generic error when triggering throws a non-Error", async () => {
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch.mockRejectedValueOnce("string thrown" as unknown as Error);
    const result = await adapter.executeWorkflow("scenario-1", { x: 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Workflow execution failed");
  });

  it("uses default error message when log payload omits one on error status", async () => {
    vi.useFakeTimers();
    const adapter = new MakeAdapter("token", "us1", 42);
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ executionId: "exec-1" }))
      .mockResolvedValueOnce(
        jsonResponse({ scenarioLogs: [{ id: "exec-1", status: "error" }] }),
      );
    const promise = adapter.executeWorkflow("scenario-1", { q: 1 });
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Workflow failed");
  });

  it("works without a teamId (no zone-routed query parameter)", async () => {
    const adapter = new MakeAdapter("token", "us1");
    // First call: discoverTeamId organizations -> empty
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ organizations: [] }))
      .mockResolvedValueOnce(textResponse("nope", 500));
    const result = await adapter.executeWorkflow("scenario-1", { q: 1 });
    expect(result.ok).toBe(false);
  });
});
