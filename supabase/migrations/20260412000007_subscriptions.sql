-- Phase 8: Subscriptions / Billing
-- Tracks Stripe subscription state per workspace

CREATE TABLE public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_customer_id      text NOT NULL,
  stripe_subscription_id  text,
  plan                    text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_workspace ON public.subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their workspace subscription"
  ON public.subscriptions FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed existing workspaces with free plan
INSERT INTO public.subscriptions (workspace_id, stripe_customer_id, plan, status)
SELECT id, 'pending_' || id::text, 'free', 'active'
FROM public.workspaces
WHERE id NOT IN (SELECT workspace_id FROM public.subscriptions);
