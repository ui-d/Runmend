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
