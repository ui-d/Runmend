-- Stripe webhook idempotency: dedupe replayed events by Stripe event id.
-- The webhook handler inserts the event id here and short-circuits when it
-- already exists. Nothing else in the app reads this table.

CREATE TABLE public.stripe_webhook_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies → every role except service_role is blocked by RLS. The webhook
-- route uses the service-role admin client.
