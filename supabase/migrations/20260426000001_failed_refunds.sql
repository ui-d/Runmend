-- LTD oversold refund reconciliation: when stripe.refunds.create exhausts all
-- retries in the Stripe webhook handler, we persist the row here so the owner
-- can manually refund in the Stripe dashboard. No policies → every role except
-- service_role is blocked by RLS.

CREATE TABLE public.failed_refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text        NOT NULL,
  amount          int         NOT NULL,
  customer_email  text,
  error_message   text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_refunds ENABLE ROW LEVEL SECURITY;

CREATE INDEX failed_refunds_created_at_idx
  ON public.failed_refunds (created_at DESC);
