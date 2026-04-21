import { describe, it, expect, vi, beforeEach } from "vitest";
import { MakeAdapter } from "../make";
import { jsonResponse, textResponse } from "@/test/http-mocks";

vi.mock("../retry", () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "../retry";
const mockFetch = vi.mocked(fetchWithRetry);

beforeEach(() => {
  mockFetch.mockReset();
});

// Pass teamId to the constructor to bypass discoverTeamId() network calls.
const TEAM_ID = 42;

describe("MakeAdapter", () => {
  describe("testConnection", () => {
    it("returns ok:true on 200 response", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      // /users/me + /organizations + /teams (testConnection always calls discoverTeamId)
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ name: "User" }))
        .mockResolvedValueOnce(jsonResponse({ organizations: [{ id: 1 }] }))
        .mockResolvedValueOnce(jsonResponse({ teams: [{ id: TEAM_ID }] }));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://us1.make.com/api/v2/users/me",
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });

    it("returns error on non-200 response", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch.mockResolvedValueOnce(textResponse("Unauthorized", 401));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("401");
    });

    it("handles network error", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const result = await adapter.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toBe("ECONNREFUSED");
    });
  });

  describe("fetchAutomations", () => {
    it("returns normalized automations", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          scenarios: [
            { id: 1, name: "My Scenario", islinked: true, lastEdit: "2026-01-01" },
            { id: 2, name: "Disabled", islinked: false },
          ],
        }),
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
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
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
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch.mockResolvedValueOnce(textResponse("Error", 403));
      await expect(adapter.fetchAutomations()).rejects.toThrow(
        "Failed to fetch scenarios: 403",
      );
    });

    it("discovers teamId when not provided", async () => {
      const adapter = new MakeAdapter("test-token", "us1");
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ organizations: [{ id: 7 }] }))
        .mockResolvedValueOnce(jsonResponse({ teams: [{ id: 99 }] }))
        .mockResolvedValueOnce(jsonResponse({ scenarios: [] }));
      const result = await adapter.fetchAutomations();
      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("teamId=99"),
        expect.anything(),
      );
    });

    it("continues without teamId when discovery yields no organizations", async () => {
      const adapter = new MakeAdapter("test-token", "us1");
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ organizations: [] }))
        .mockResolvedValueOnce(jsonResponse({ scenarios: [] }));
      const result = await adapter.fetchAutomations();
      expect(result).toEqual([]);
    });

    it("maps active flag from isActive field", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          scenarios: [{ id: 9, name: "Scn", isActive: true }],
        }),
      );
      const result = await adapter.fetchAutomations();
      expect(result[0]!.status).toBe("active");
    });
  });

  describe("fetchExecutionLogs", () => {
    it("fetches logs for each automation", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      // 1. fetchAutomations (single page)
      // 2. logs for scenario id 1
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            scenarios: [{ id: 1, name: "S1", islinked: true }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse([
            {
              id: "exec-1",
              status: "success",
              timestamp: "2026-01-01T00:00:00Z",
            },
          ]),
        );

      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result).toHaveLength(1);
      expect(result[0]!.automationExternalId).toBe("1");
      expect(result[0]!.status).toBe("success");
    });

    it("skips logs when the logs endpoint errors", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            scenarios: [{ id: 1, name: "S1", islinked: true }],
          }),
        )
        .mockResolvedValueOnce(textResponse("boom", 500));
      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result).toEqual([]);
    });

    it("maps Make-specific statuses", async () => {
      const adapter = new MakeAdapter("test-token", "us1", TEAM_ID);
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            scenarios: [{ id: 1, name: "S1", islinked: true }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            scenarioLogs: [
              { id: "a", status: "success", timestamp: "2026-01-01" },
              { id: "b", status: "error", timestamp: "2026-01-01", error: "oops" },
              { id: "c", status: "warning", timestamp: "2026-01-01" },
              { id: "d", status: "weird", timestamp: "2026-01-01" },
              { id: "e", status: 1, timestamp: "2026-01-01" },
              { id: "f", status: 0, timestamp: "2026-01-01" },
              { id: "g", status: 2, timestamp: "2026-01-01" },
            ],
          }),
        );
      const result = await adapter.fetchExecutionLogs(new Date("2025-01-01"));
      expect(result.map((r) => r.status)).toEqual([
        "success",
        "error",
        "warning",
        "unknown",
        "success",
        "error",
        "warning",
      ]);
      expect(result[1]!.errorMessage).toBe("oops");
    });
  });

  describe("zone handling", () => {
    it("uses the correct zone in base URL", async () => {
      const euAdapter = new MakeAdapter("token", "eu1", TEAM_ID);
      mockFetch.mockResolvedValueOnce(jsonResponse({ name: "User" }));
      await euAdapter.testConnection().catch(() => {
        /* downstream discover calls will fail, that's fine */
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://eu1.make.com/api/v2/users/me",
        expect.any(Object),
      );
    });

    it("defaults to us1", async () => {
      const defaultAdapter = new MakeAdapter("token", undefined, TEAM_ID);
      mockFetch.mockResolvedValueOnce(jsonResponse({ name: "User" }));
      await defaultAdapter.testConnection().catch(() => {
        /* same */
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://us1.make.com/api/v2/users/me",
        expect.any(Object),
      );
    });
  });
});
