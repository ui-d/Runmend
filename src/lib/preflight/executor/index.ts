import { createAdminClient } from "@/lib/supabase/admin";
import { SynchronousRunExecutor } from "./synchronous";
import type { RunExecutor } from "./types";

/**
 * Production singleton. Tests construct their own executor with stubbed
 * deps via `new SynchronousRunExecutor({...})` rather than importing this.
 */
export const runExecutor: RunExecutor = new SynchronousRunExecutor({
  loadAdmin: () => createAdminClient(),
});

export type { RunExecutor, ExecuteOptions, ExecuteResult } from "./types";
