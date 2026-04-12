-- Add webhook_token column to platform_connections for Zapier webhook-based integration
ALTER TABLE public.platform_connections ADD COLUMN webhook_token text;

-- Partial unique index: ensures each token is unique, allows multiple NULLs (Make/n8n connections)
CREATE UNIQUE INDEX idx_platform_connections_webhook_token
  ON public.platform_connections(webhook_token)
  WHERE webhook_token IS NOT NULL;
