import { describe, it, expect, vi, beforeEach } from "vitest";
import { MakeAdapter } from "../make";

// Mock fetchWithRetry
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

describe("MakeAdapter", () => {
  const adapter = new MakeAdapter("test-token", "us1");

  describe("testConnection", () => {
    it("returns ok:true on 200 response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ name: "User" }));
      const result = await adapter.testConnection();
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://us1.make.com/api/v2/users/me",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it("returns error on non-200 response", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Unauthorized", 401));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("401");
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
    });
  });

  describe("fetchAutomations", () => {
    it("returns normalized automations", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          scenarios: [
            { id: 1, name: "My Scenario", islinked: true, lastEdit: "2026-01-01" },
            { id: 2, name: "Disabled", islinked: false },
          ],
        })
      );
      const result = await adapter.fetchAutomations();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        externalId: "1",
        name: "My Scenario",
        status: "active",
        triggerType: null,
        lastRunAt: "2026-01-01",
      });
      expect(result[1]!.status).toBe("inactive");
    });

    it("paginates across multiple pages", async () => {
      // First page: 500 items (full page)
      const page1 = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Scenario ${i}`,
        islinked: true,
      }));
      // Second page: 10 items (less than full page, stops)
      const page2 = Array.from({ length: 10 }, (_, i) => ({
        id: 500 + i,
        name: `Scenario ${500 + i}`,
        islinked: true,
      }));

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ scenarios: page1 }))
        .mockResolvedValueOnce(jsonResponse({ scenarios: page2 }));

      const result = await adapter.fetchAutomations();
      expect(result).toHaveLength(510);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Error", 403));
      await expect(adapter.fetchAutomations()).rejects.toThrow(
        "Failed to fetch scenarios: 403"
      );
    });
  });

  describe("fetchExecutionLogs", () => {
    it("fetches logs for each automation", async () => {
      // First call: fetchAutomations
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          scenarios: [{ id: 1, name: "S1", islinked: true }],
        })
      );
      // Second call: logs for scenario 1
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          {
            id: "exec-1",
            status: "success",
            timestamp: "2026-01-01T00:00:00Z",
          },
        ])
      );

      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result).toHaveLength(1);
      expect(result[0]!.automationExternalId).toBe("1");
      expect(result[0]!.status).toBe("success");
    });
  });

  describe("zone handling", () => {
    it("uses the correct zone in base URL", () => {
      const euAdapter = new MakeAdapter("token", "eu1");
      mockFetch.mockResolvedValueOnce(jsonResponse({ name: "User" }));
      euAdapter.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://eu1.make.com/api/v2/users/me",
        expect.any(Object)
      );
    });

    it("defaults to us1", () => {
      const defaultAdapter = new MakeAdapter("token");
      mockFetch.mockResolvedValueOnce(jsonResponse({ name: "User" }));
      defaultAdapter.testConnection();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://us1.make.com/api/v2/users/me",
        expect.any(Object)
      );
    });
  });
});
