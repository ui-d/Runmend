/**
 * Retry wrapper with exponential backoff and jitter for platform API calls.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, timeoutMs = 10000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      return result;
    } catch (err: unknown) {
      if (attempt === maxRetries || !isRetryableError(err)) {
        throw err;
      }
      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      await sleep(delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Retry attempts exhausted");
}

/**
 * Generic exponential-backoff wrapper for any async function. Unlike
 * `withRetry`, this does not thread an AbortSignal through — use it for
 * SDK calls (Stripe, Anthropic, etc.) that manage their own timeouts.
 * `attempts` is the total number of tries, not retries on top of an initial
 * call, so `attempts: 3` runs the fn up to three times.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { attempts = 3, baseDelayMs = 500 } = options;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) break;
      const delay =
        baseDelayMs * Math.pow(2, i) * (0.5 + Math.random() * 0.5);
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Fetch with retry for platform APIs. Retries on 429/5xx and network errors.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(async (signal) => {
    const res = await fetch(url, { ...init, signal });

    if (RETRYABLE_STATUS_CODES.has(res.status)) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return res;
  }, options);
}
