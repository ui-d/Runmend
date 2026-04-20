-- Phase 1 billing launch: LTD state + billing details
-- Adds lifetime-deal flag, tax/VAT fields, billing address, and a global
-- LTD seat counter. See plan: this-is-a-pricing-refactored-ladybug.md

ALTER TABLE public.subscriptions
  ADD COLUMN is_ltd           boolean     NOT NULL DEFAULT false,
  ADD COLUMN ltd_purchased_at timestamptz,
  ADD COLUMN tax_id           text,
  ADD COLUMN tax_id_country   text,
  ADD COLUMN billing_country  text,
  ADD COLUMN billing_email    text;

CREATE TABLE public.ltd_allocations (
  id          int PRIMARY KEY CHECK (id = 1),
  total_seats int NOT NULL DEFAULT 20,
  seats_sold  int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ltd_allocations (id, total_seats, seats_sold)
VALUES (1, 20, 0);

ALTER TABLE public.ltd_allocations ENABLE ROW LEVEL SECURITY;

-- Anyone (even signed-out) can read seat availability so the LTD pitch works
-- on marketing surfaces later. Writes are service-role-only: no insert/update
-- /delete policy means PostgREST blocks them for anon/authenticated roles.
CREATE POLICY "Anyone can read LTD seats"
  ON public.ltd_allocations FOR SELECT
  USING (true);

CREATE TRIGGER set_updated_at_ltd_allocations
  BEFORE UPDATE ON public.ltd_allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Atomically reserves one LTD seat. Returns the new seats_sold value, or NULL
-- when sold out. Webhook treats NULL as an oversold race and issues a refund.
-- SECURITY DEFINER because ltd_allocations has no write policies (RLS denies
-- direct writes even to authenticated users).
CREATE OR REPLACE FUNCTION public.claim_ltd_seat()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seats_sold int;
BEGIN
  UPDATE public.ltd_allocations
     SET seats_sold = seats_sold + 1
   WHERE id = 1 AND seats_sold < total_seats
   RETURNING seats_sold INTO v_seats_sold;

  RETURN v_seats_sold;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ltd_seat() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_ltd_seat() TO service_role;
