-- Remove legacy integration tables that are no longer used
-- These were replaced by hub_integrations_catalog, hub_integrations_global_config, and bu_integrations_config

-- Drop RLS policies first
DROP POLICY IF EXISTS "Admins can manage integration configs" ON public.integration_configs;
DROP POLICY IF EXISTS "Admins can manage integration webhooks" ON public.integration_webhooks;
DROP POLICY IF EXISTS "Users can view active webhooks" ON public.integration_webhooks;
DROP POLICY IF EXISTS "Admins can manage integrations" ON public.integrations;
DROP POLICY IF EXISTS "Authenticated users can view integrations" ON public.integrations;

-- Drop foreign key constraints
ALTER TABLE public.integration_configs DROP CONSTRAINT IF EXISTS integration_configs_integration_id_fkey;
ALTER TABLE public.integration_webhooks DROP CONSTRAINT IF EXISTS integration_webhooks_integration_id_fkey;
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_owner_user_id_fkey;

-- Drop tables
DROP TABLE IF EXISTS public.integration_webhooks;
DROP TABLE IF EXISTS public.integration_configs;
DROP TABLE IF EXISTS public.integrations;