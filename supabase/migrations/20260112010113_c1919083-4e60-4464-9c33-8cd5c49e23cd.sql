-- =============================================
-- FASE 1: LIMPEZA DE FUNÇÕES LEGADAS
-- =============================================

-- 1. Remover função dual mode deadline (legado - já migrado)
DROP FUNCTION IF EXISTS public._identity_dual_mode_deadline();

-- 2. Documentar funções SECURITY DEFINER críticas que existem
COMMENT ON FUNCTION public.is_bu_admin(uuid, uuid) IS 
'[SECURITY DEFINER] Verifica se usuário é admin da BU especificada.
Parâmetros: p_user_id, p_bu_id
Usado em RLS policies para permitir acesso administrativo.
Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.user_has_permission(uuid, uuid, text) IS 
'[SECURITY DEFINER] Verifica se usuário tem permissão específica na BU.
Parâmetros: p_user_id, p_bu_id, p_permission_key
Consulta permission_catalog com base em role_in_bu do usuário.
Auditado em: 2026-01-12';