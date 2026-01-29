-- Ensure pre-login domain validation RPC is callable
-- The /auth screen runs before user session exists (role=anon), so anon needs EXECUTE.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_bu_by_email_domain(text) TO anon, authenticated;