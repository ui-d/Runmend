import * as React from "react";

type AnyFn = (...args: never[]) => unknown;

// `React.cache` is only callable inside a React Server Component render.
// In Next.js production RSC, `import { cache } from "react"` resolves to
// the server build which exposes it. In Vitest/Node (CJS build of React
// 18.3.1), it is `undefined`, so we fall back to an identity wrapper.
// The wrapper keeps tests working and is a no-op in non-RSC callers.
const reactCache = (React as unknown as { cache?: <F extends AnyFn>(fn: F) => F })
  .cache;

export const cache: <F extends AnyFn>(fn: F) => F =
  typeof reactCache === "function" ? reactCache : (fn) => fn;
