/**
 * Hard caps and tunables for the synchronous v1 executor. The 50-input
 * ceiling exists because Vercel functions cap at 300s and a 100-input run
 * with mixed assertions (especially llm_judge) can exceed that envelope on
 * tail latency. When the queue-backed executor lands, raise to 500.
 */
export const MAX_INPUTS_PER_RUN = 50;
export const BATCH_SIZE = 5;
export const DEFAULT_COST_CAP_CENTS = 500;

/**
 * Drift detection requires a statistically meaningful sample. Below 20
 * inputs the run still produces results but skips the drift check —
 * `preflight_runs.drift_eligible` stays false.
 */
export const MIN_INPUTS_FOR_DRIFT = 20;

/**
 * `llm_judge` caps. Output is bounded so a runaway judge response cannot
 * blow the run's cost budget; the prompt is bounded (~8000 tokens at a
 * conservative ~4 chars/token) so a huge `output_data` is rejected with a
 * clear error instead of silently truncated.
 */
export const JUDGE_MAX_OUTPUT_TOKENS = 2_000;
export const JUDGE_MAX_PROMPT_CHARS = 32_000;
