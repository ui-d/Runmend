-- Performance indexes for health calculation and issue detection queries

-- Composite index for health score queries (status aggregation per automation)
CREATE INDEX idx_execution_logs_automation_status
  ON public.execution_logs(automation_id, status);

-- Composite index for time-range queries (last 7 days, last 30 days)
CREATE INDEX idx_execution_logs_automation_started
  ON public.execution_logs(automation_id, started_at DESC);

-- Unique constraint for execution log deduplication (required for upsert/replay protection)
CREATE UNIQUE INDEX idx_execution_logs_automation_external
  ON public.execution_logs(automation_id, external_id)
  WHERE external_id IS NOT NULL;
