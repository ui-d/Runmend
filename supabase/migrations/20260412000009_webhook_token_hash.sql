-- Add webhook_token_hash column for secure token lookup
-- The plaintext webhook_token column will be replaced with encrypted storage
-- Lookups use the SHA-256 hash instead of matching plaintext

ALTER TABLE public.platform_connections
  ADD COLUMN webhook_token_hash text;

-- Index for fast hash-based lookups
CREATE UNIQUE INDEX idx_platform_connections_webhook_token_hash
  ON public.platform_connections(webhook_token_hash)
  WHERE webhook_token_hash IS NOT NULL;

-- Backfill existing tokens: compute SHA-256 hash of existing plaintext tokens
UPDATE public.platform_connections
  SET webhook_token_hash = encode(sha256(webhook_token::bytea), 'hex')
  WHERE webhook_token IS NOT NULL;
