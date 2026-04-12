import { describe, it, expect, vi, beforeEach } from "vitest";
import { N8nAdapter } from "../n8n";

vi.mock("../retry", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "../retry";
const mockFetch = vi.mocked(fetchWithRetry);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("N8nAdapter", () => {
  const adapter = new N8nAdapter("test-api-key", "https://n8n.example.com");

  describe("testConnection", () => {
    it("returns ok:true on 200 response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [] }));
      const result = await adapter.testConnection();
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://n8n.example.com/api/v1/workflows?limit=1",
        expect.objectContaining({
          headers: expect.objectContaining({ "X-N8N-API-KEY": "test-api-key" }),
        })
      );
    });

    it("returns error on non-200 response", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Forbidden", 403));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("403");
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
    });
  });

  describe("fetchAutomations", () => {
    it("returns normalized workflows", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: "wf-1", name: "My Workflow", active: true, updatedAt: "2026-01-01" },
            { id: "wf-2", name: "Paused", active: false },
          ],
        })
      );
      const result = await adapter.fetchAutomations();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        externalId: "wf-1",
        name: "My Workflow",
        status: "active",
        triggerType: null,
        lastRunAt: "2026-01-01",
      });
      expect(result[1]!.status).toBe("inactive");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Error", 500));
      await expect(adapter.fetchAutomations()).rejects.toThrow(
        "Failed to fetch workflows: 500"
      );
    });
  });

  describe("fetchExecutionLogs", () => {
    it("fetches paginated execution logs", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "ex-1",
              workflowId: "wf-1",
              finished: true,
              stoppedAt: "2026-01-01T01:00:00Z",
              startedAt: "2026-01-01T00:00:00Z",
            },
          ],
          nextCursor: null,
        })
      );

      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        externalId: "ex-1",
        automationExternalId: "wf-1",
        status: "success",
        startedAt: "2026-01-01T00:00:00Z",
        finishedAt: "2026-01-01T01:00:00Z",
        errorMessage: null,
      });
    });

    it("stops when execution is older than since date", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "ex-1",
              workflowId: "wf-1",
              finished: true,
              stoppedAt: "2024-01-01T00:00:00Z",
              startedAt: "2024-01-01T00:00:00Z",
            },
          ],
          nextCursor: "next",
        })
      );

      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("maps error status when finished but no stoppedAt", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "ex-1",
              workflowId: "wf-1",
              finished: true,
              stoppedAt: null,
              startedAt: "2026-01-01T00:00:00Z",
            },
          ],
        })
      );

      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result[0]!.status).toBe("error");
    });
  });

  describe("instance URL normalization", () => {
    it("strips trailing slash", () => {
      const trailingSlash = new N8nAdapter("key", "https://n8n.example.com/");
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [] }));
      trailingSlash.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://n8n.example.com/api/v1/workflows?limit=1",
        expect.any(Object)
      );
    });
  });
});
