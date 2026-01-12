-- =============================================
-- FASE 3: DOCUMENTAÇÃO DE SECURITY DEFINER
-- =============================================
-- Adiciona comentários de auditoria a funções e views críticas

-- =========================================
-- FUNÇÕES CORE DE IDENTIDADE
-- =========================================

COMMENT ON FUNCTION public.current_bu_id() IS 
'[SECURITY DEFINER] [CORE] Retorna bu_id do contexto atual.
- Lê request.header(''x-current-bu-id'') primeiro
- Fallback para session claims se necessário  
- NUNCA retorna NULL - lança NO_BU_CONTEXT se inválido
- Usado em: Todas as RLS policies BU-scoped
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.current_profile_id() IS 
'[SECURITY DEFINER] [CORE] Retorna profiles.id do usuário autenticado.
- Converte auth.uid() → profiles.id
- Essencial para identity convention (profile_id em vez de auth.uid)
- Usado em: RLS policies que referenciam profile_id
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.my_profile_id() IS 
'[SECURITY DEFINER] [CORE] Alias para current_profile_id().
- Preferido em RLS policies por legibilidade
- Auditado em: 2026-01-12';

-- =========================================
-- FUNÇÕES DE AUTORIZAÇÃO
-- =========================================

COMMENT ON FUNCTION public.is_platform_admin(uuid) IS 
'[SECURITY DEFINER] [AUTHZ] Verifica se usuário é platform_admin.
- Parâmetro: auth_user_id (auth.uid(), NÃO profile_id)
- Consulta profiles.user_type = ''platform_admin''
- Usado em: RLS policies para bypass administrativo
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.is_bu_admin(uuid, uuid) IS 
'[SECURITY DEFINER] [AUTHZ] Verifica se usuário é admin de uma BU.
- Parâmetros: p_user_id (profile_id), p_bu_id
- Consulta bu_user_memberships.role_in_bu = ''admin''
- Usado em: RLS policies para operações administrativas
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.user_has_permission(uuid, uuid, text) IS 
'[SECURITY DEFINER] [AUTHZ] Verifica permissão específica.
- Parâmetros: p_user_id (profile_id), p_bu_id, p_permission_key
- Consulta permission_catalog + bu_user_permission_templates_v2
- Usado em: RLS policies e frontend (via RPC)
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.user_has_bu_access(uuid, uuid) IS 
'[SECURITY DEFINER] [AUTHZ] Verifica se usuário tem acesso a uma BU.
- Parâmetros: p_user_id (profile_id), p_bu_id
- Consulta bu_user_memberships.deleted_at IS NULL
- Usado em: Validação de contexto BU
- Auditado em: 2026-01-12';

-- =========================================
-- FUNÇÕES DE HIERARQUIA
-- =========================================

COMMENT ON FUNCTION public.team_is_ancestor(uuid, uuid) IS 
'[SECURITY DEFINER] [HIERARCHY] Verifica se time é ancestral.
- Parâmetros: ancestor_id, descendant_id
- Usa recursive CTE em teams.parent_team_id
- Usado em: Cálculo de visibilidade hierárquica
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.user_can_manage_team(uuid, uuid) IS 
'[SECURITY DEFINER] [HIERARCHY] Verifica gestão de time.
- Parâmetros: p_user_id (profile_id), p_team_id
- Verifica liderança direta ou via hierarquia
- Usado em: RLS de OKRs e gestão de times
- Auditado em: 2026-01-12';

COMMENT ON FUNCTION public.get_okr_manageable_team_ids(uuid, uuid) IS 
'[SECURITY DEFINER] [HIERARCHY] Lista times gerenciáveis para OKRs.
- Parâmetros: p_user_id (profile_id), p_bu_id
- Retorna SETOF uuid de times
- Usado em: can_manage_team_okr()
- Auditado em: 2026-01-12';

-- =========================================
-- VIEWS SECURITY DEFINER CRÍTICAS
-- =========================================

COMMENT ON VIEW public.v_profiles_directory IS 
'[SECURITY INVOKER] View de diretório de profiles.
- Mostra profiles ativos com membership em alguma BU
- Respeita RLS do caller (não é SECURITY DEFINER)
- Uso: Seletores de usuário, menções, atribuições
- Auditado em: 2026-01-12';

COMMENT ON VIEW public.v_bu_all_profiles_admin IS 
'[SECURITY INVOKER] View administrativa de profiles.
- Mostra todos os profiles (ativos/inativos) para admins
- Respeita RLS do caller
- Uso: Gestão de usuários por admin
- Auditado em: 2026-01-12';

COMMENT ON VIEW public.v_ai_agents_public IS 
'[SECURITY INVOKER] View pública de agentes IA.
- Filtrada por scope (global/bu) e is_active
- Respeita RLS do caller
- Uso: Listagem de agentes disponíveis
- Auditado em: 2026-01-12';

COMMENT ON VIEW public.identity_rls_violations IS 
'[AUDIT] View de auditoria de violações RLS.
- Detecta policies que comparam auth.uid() com colunas de domínio
- Resultado esperado: 0 linhas
- Uso: Auditoria de segurança
- Auditado em: 2026-01-12';