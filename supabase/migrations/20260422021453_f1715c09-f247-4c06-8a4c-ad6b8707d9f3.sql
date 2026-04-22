-- Marca canônicas
COMMENT ON FUNCTION public.has_permission(uuid, uuid, text) IS
  '[CANONICAL] [V2-only] Checagem padrão de permissão. Recebe profile_id (não auth.uid()). Verifica templates e overrides. Use esta para novo código.';

COMMENT ON FUNCTION public.user_has_permission_ctx(uuid, uuid, text, jsonb) IS
  '[CANONICAL] Checagem de permissão com escopo contextual (jsonb). Use quando precisar validar contexto adicional (ex: ownership). TCR v2.64.0 compliant.';

COMMENT ON FUNCTION public.is_platform_admin(uuid) IS
  '[CANONICAL] [SECURITY DEFINER] [AUTHZ] Verifica se o usuário é platform_admin. Parâmetro: auth.uid() (NÃO profile_id). Usado em RLS para bypass administrativo.';

COMMENT ON FUNCTION public.is_bu_admin(uuid, uuid) IS
  '[CANONICAL] Verifica se um usuário é admin de uma BU específica. Aceita profile_id ou auth.uid() por retrocompatibilidade.';

-- Marca deprecated
COMMENT ON FUNCTION public.has_permission_key(uuid, uuid, text) IS
  '[DEPRECATED] Wrapper de has_permission(). Use has_permission() diretamente em código novo.';

COMMENT ON FUNCTION public.user_has_permission(uuid, uuid, text) IS
  '[DEPRECATED] [V2-only] Wrapper legacy. Use has_permission() para checagens simples ou user_has_permission_ctx() para contextuais.';

COMMENT ON FUNCTION public.is_bu_member(uuid, uuid) IS
  '[DEPRECATED] Função legacy com canary. Use is_profile_bu_member(profile_id, bu_id) para novo código.';