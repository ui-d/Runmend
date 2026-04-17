-- Add zone column to platform_connections for Make.com regional API endpoints
ALTER TABLE public.platform_connections ADD COLUMN zone text;
