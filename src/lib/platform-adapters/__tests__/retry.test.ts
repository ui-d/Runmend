import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, fetchWithRetry } from "@/lib/platform-adapters/retry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the first successful result without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure until success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, { baseDelayMs: 10, maxRetries: 2 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws when retries are exhausted", async () => {
    const fn = vi.fn(async () => {
      throw new Error("persistent");
    });

    const promise = withRetry(fn, { baseDelayMs: 5, maxRetries: 2 });
    const assertion = expect(promise).rejects.toThrow(/persistent/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry an AbortError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fn = vi.fn(async () => {
      throw abortError;
    });
    await expect(withRetry(fn, { maxRetries: 5 })).rejects.toThrow("aborted");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the response for a 2xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );
    const res = await fetchWithRetry("https://example.com", {}, { baseDelayMs: 1 });
    expect(res.status).toBe(200);
  });

  it("retries on a 429 status", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const promise = fetchWithRetry(
      "https://example.com",
      {},
      { baseDelayMs: 1, maxRetries: 2 },
    );
    await vi.runAllTimersAsync();
    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns a non-retryable 4xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 400 })),
    );
    const res = await fetchWithRetry("https://example.com", {}, { baseDelayMs: 1 });
    expect(res.status).toBe(400);
  });
});
