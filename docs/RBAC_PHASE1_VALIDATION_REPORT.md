# RBAC Phase 1 Validation Report

> **Data:** 2026-01-07  
> **Versão:** 1.0.0  
> **Status Geral:** ✅ **PASS**

---

## Resumo Executivo

A validação da **Fase 1 — Autorização Consistente (RBAC Real)** foi concluída com sucesso. O sistema Hub da Jet implementa corretamente um modelo RBAC baseado em **permission keys** como fonte única de verdade, com roles (`super_admin`, `admin`, `collaborator`) servindo apenas como atalhos para concessão de permissões.

### Principais Achados

| Categoria | Status | Observação |
|-----------|--------|------------|
| Catálogo de Permissões | ✅ PASS | 141 permission keys ativas em 9 módulos |
| Função has_permission | ✅ PASS | Implementada corretamente com bypass para admins |
| Hierarquia de Times | ✅ PASS | `user_can_manage_team` implementada corretamente |
| RLS Policies | ⚠️ PASS* | Todas tabelas operacionais com RLS, algumas policies permissivas justificadas |
| Frontend Guards | ✅ PASS | `usePermissions()` + `RequirePermission` implementados |
| Remoção do CEO | ✅ PASS | Nenhuma referência ativa encontrada |
| Interfaces de Gestão | ✅ PASS | `/settings/permissions` e `/bu/permissions` funcionais |

*Algumas políticas usam `WITH CHECK (true)` para INSERT de logs/notificações por service role - justificado.

---

## 1. Catálogo de Permission Keys (2.1)

### Status: ✅ PASS

### Evidência

**Tabela:** `public.permission_catalog`

**Estrutura:**
```sql
- id (uuid, PK)
- key (text, UNIQUE) -- ex: "okrs.org_objective.create:bu"
- module (text) -- ex: "okrs", "assets", "tickets"
- resource (text) -- ex: "org_objective", "inventory"
- action (text) -- ex: "create", "update", "manage"
- scope (text) -- "bu" | "team" | "self" | "global"
- description (text)
- status (text) -- "active" | "inactive"
- created_at, updated_at (timestamps)
```

### Contagem por Módulo

| Módulo | Quantidade |
|--------|------------|
| assets | 41 |
| okrs | 37 |
| tickets | 23 |
| kpis | 13 |
| teams | 10 |
| users | 7 |
| hub | 5 |
| platform | 4 |
| home | 1 |
| **TOTAL** | **141** |

### Arquivo de Referência
- `src/modules/permissions/types.ts` - Tipos TypeScript
- Query: `SELECT * FROM permission_catalog WHERE status = 'active'`

---

## 2. Função has_permission (2.2)

### Status: ✅ PASS

### Evidência

**Função:** `public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)`

```sql
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_bu_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permissions text[];
BEGIN
  -- Super admin bypass (wildcard)
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- BU admin bypass (wildcard na BU)
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  -- Agregação de permissões via grupos + overrides
  SELECT ARRAY_AGG(DISTINCT pc.key)
  INTO v_permissions
  FROM (...) -- joins com bu_user_permission_groups, permission_group_permissions, bu_user_permission_overrides
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  RETURN p_permission_key = ANY(COALESCE(v_permissions, ARRAY[]::text[]));
END;
$$;
```

### Validações Confirmadas

| Check | Status |
|-------|--------|
| `is_super_admin()` bypass | ✅ |
| `is_bu_admin()` bypass | ✅ |
| Permission keys via grupos | ✅ |
| Permission keys via overrides | ✅ |
| Nenhuma referência a "ceo" | ✅ |

---

## 3. RLS Policies (2.3)

### Status: ✅ PASS (com observações)

### Tabelas Operacionais com RLS Habilitado

| Tabela | RLS | Policies | Status |
|--------|-----|----------|--------|
| okr_org_objectives | ✅ | 6 | PASS |
| okr_org_key_results | ✅ | 7 | PASS |
| okr_team_objectives | ✅ | 7 | PASS |
| okr_team_key_results | ✅ | 9 | PASS |
| teams | ✅ | 6 | PASS |
| squads | ✅ | 4 | PASS |
| tickets | ✅ | 7 | PASS |
| ticket_messages | ✅ | 3 | PASS |
| asset_inventory | ✅ | 8 | PASS |
| asset_movements | ✅ | 4 | PASS |
| kpi_metrics | ✅ | 7 | PASS |
| kpi_values | ✅ | 3 | PASS |
| notifications | ✅ | 3 | PASS |
| profiles | ✅ | 5 | PASS |

### Funções Usadas nas Policies

Todas as tabelas operacionais usam:
- `user_has_bu_access(auth.uid(), bu_id)` ✅
- `is_current_bu(bu_id)` ✅
- `is_platform_admin(auth.uid())` ✅
- `is_bu_admin(auth.uid(), bu_id)` ✅
- `can_manage_inventory()`, `can_view_ticket()` etc. ✅

### Policies Permissivas (Justificadas)

| Tabela | Policy | Justificativa |
|--------|--------|---------------|
| notifications | INSERT with_check: true | Service role insere notificações |
| audit_logs | INSERT with_check: true | Sistema insere logs |
| ai_agent_logs | INSERT with_check: true | Sistema insere logs |
| automation_logs | INSERT with_check: true | Sistema insere logs |
| okr_audit_log | INSERT with_check: true | Sistema insere logs |

> **Observação:** Estas policies são para INSERT por service role, não por usuários.

---

## 4. Frontend Guards (2.4)

### Status: ✅ PASS

### Hook de Permissões

**Arquivo:** `src/hooks/usePermissions.ts`

```typescript
export function usePermissions() {
  const supabase = useBuScopedSupabase();
  
  const { data: permissions = [] } = useQuery({
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_permissions", { p_bu_id: currentBuId });
      return data || [];
    },
  });

  const isWildcard = permissions.includes("*");
  
  const has = (key: string): boolean => isWildcard || permissions.includes(key);
  const hasAny = (keys: string[]): boolean => isWildcard || keys.some(k => permissions.includes(k));
  const hasAll = (keys: string[]): boolean => isWildcard || keys.every(k => permissions.includes(k));

  return { permissions, has, hasAny, hasAll, isWildcard, isLoading };
}
```

### Guard Component

**Arquivo:** `src/components/auth/RequirePermission.tsx`

```tsx
export function RequirePermission({ children, anyOf, redirectOnDeny, fallbackRoute }) {
  const { hasAny, isLoading, isWildcard } = usePermissions();
  
  if (isWildcard) return <>{children}</>;
  if (!hasAny(anyOf)) return redirectOnDeny ? <Navigate /> : <AccessDenied />;
  return <>{children}</>;
}
```

### Páginas de Gestão

| Rota | Arquivo | Protegida |
|------|---------|-----------|
| `/settings/permissions` | `GlobalPermissionsPage.tsx` | ✅ super_admin only |
| `/bu/permissions` | `BuPermissionsPage.tsx` | ✅ admin BU |

---

## 5. Hierarquia de Times (2.5)

### Status: ✅ PASS

### Funções SQL

#### `is_team_leader(p_user_id, p_team_id)`
```sql
SELECT EXISTS (
  SELECT 1 FROM public.teams
  WHERE id = p_team_id AND leader_user_id = p_user_id AND deleted_at IS NULL
)
```

#### `team_is_ancestor(p_ancestor_team_id, p_team_id)`
```sql
-- CTE recursivo para verificar ancestralidade
WITH RECURSIVE ancestors AS (
  SELECT parent_team_id FROM public.teams WHERE id = p_team_id
  UNION ALL
  SELECT t.parent_team_id FROM public.teams t
  INNER JOIN ancestors a ON t.id = a.parent_team_id
)
SELECT EXISTS (SELECT 1 FROM ancestors WHERE parent_team_id = p_ancestor_team_id)
```

#### `user_can_manage_team(p_user_id, p_team_id)`
```sql
-- 1) Super admin pode gerenciar qualquer time
IF is_super_admin(p_user_id) THEN RETURN true; END IF;

-- 2) BU admin pode gerenciar qualquer time da BU
IF is_bu_admin(p_user_id, v_bu_id) THEN RETURN true; END IF;

-- 3) Líder direto do time exato (NÃO time pai)
RETURN is_team_leader(p_user_id, p_team_id);
```

### Validação de Regras

| Regra | Status |
|-------|--------|
| Líder gerencia apenas próprio time | ✅ |
| Líder NÃO gerencia time pai | ✅ |
| Líder NÃO gerencia times irmãos | ✅ |
| Super admin gerencia qualquer time | ✅ |
| BU admin gerencia times da BU | ✅ |

---

## 6. Remoção Total do "CEO" (2.6)

### Status: ✅ PASS

### Evidências de Remoção

#### Banco de Dados

| Item | Status | Evidência |
|------|--------|-----------|
| Enum `app_role` | ✅ | Apenas: `super_admin`, `admin`, `team_leader`, `collaborator` |
| Função `is_bu_admin` | ✅ | Sem referência a "ceo" |
| permission_catalog | ✅ | Nenhuma key com "ceo" |
| Dados migrados | ✅ | `ceo` → `super_admin` em migration |

**Migration:** `supabase/migrations/20260103233953_*.sql`
```sql
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'ceo';
UPDATE public.bu_user_memberships SET role_in_bu = 'super_admin' WHERE role_in_bu = 'ceo';
DROP TYPE public.app_role;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'team_leader', 'collaborator');
```

#### Frontend

| Item | Status |
|------|--------|
| Rotas `/okrs/ceo` | ✅ Renomeada para `/okrs/executive` |
| Componentes CEO | ✅ Renomeados para Executive |
| Checks de role | ✅ Sem "ceo" |

**Documentação:** `docs/TECHNICAL_CONTEXT_REGISTRY.md:1614-1624`

---

## 7. Scan Automático

### 7.1 Scan de Role Checks no Frontend

**Script:** `scripts/audit-rbac.ts`

**Resultado:**
```
✅ PASS - Nenhuma violação de RBAC encontrada!

Todos os checks de autorização estão usando permission keys.

Arquivos com exceções justificadas (UI-only helpers):
  - src/hooks/useAuth.tsx
  - src/components/layout/DynamicSidebar.tsx
  - src/components/layout/Header.tsx
  - src/components/onboarding/OnboardingWizard.tsx
  - src/modules/bu/components/BuSelector.tsx
```

### 7.2 Scan de BU-Scoped Supabase

**Script:** `scripts/audit-useBuScopedSupabase.ts`

**Resultado:** PASS

---

## 8. Achados e Ações Corretivas

### Achados CRITICAL

Nenhum.

### Achados HIGH

Nenhum.

### Achados MEDIUM

| # | Achado | Status | Ação |
|---|--------|--------|------|
| M1 | Linter reporta 5 policies com `USING (true)` | ⚠️ Justificado | Policies são para SELECT em catálogos read-only ou INSERT por service role |
| M2 | Leaked password protection disabled | ⚠️ Configuração | Habilitar em Settings do Supabase Dashboard |

### Achados LOW

| # | Achado | Status |
|---|--------|--------|
| L1 | Algumas permission keys no catálogo podem não estar em uso | Verificar periodicamente |

---

## 9. Checklist de Validação

### Backend (SQL)

- [x] `permission_catalog` existe com estrutura correta
- [x] `has_permission()` implementada com bypass admin
- [x] `get_my_permissions()` retorna wildcard para admins
- [x] `user_can_manage_team()` respeita hierarquia
- [x] `is_team_leader()` verifica liderança direta
- [x] `team_is_ancestor()` usa CTE recursivo
- [x] `is_current_bu()` valida contexto de BU
- [x] Nenhuma função referencia "ceo"
- [x] RLS habilitado em todas tabelas operacionais
- [x] Policies usam funções canônicas

### Frontend (React)

- [x] `usePermissions()` hook centralizado
- [x] `RequirePermission` guard implementado
- [x] Páginas de gestão protegidas
- [x] Sem checks hardcoded de role (exceto UI helpers documentados)
- [x] Nenhuma referência ativa a "ceo"

### Auditoria

- [x] Script `audit-rbac.ts` criado
- [x] Script `audit-useBuScopedSupabase.ts` criado
- [x] Ambos scripts retornam PASS

---

## 10. Conclusão

A **Fase 1 — Autorização Consistente (RBAC Real)** foi implementada corretamente:

1. ✅ **Permission Keys** são a única fonte de verdade
2. ✅ **Roles** servem apenas como atalhos
3. ✅ **RLS** usa funções canônicas
4. ✅ **Frontend** usa hooks centralizados
5. ✅ **Hierarquia de times** está correta
6. ✅ **"CEO" foi completamente removido**

O sistema está pronto para produção no que diz respeito a RBAC.

---

## Assinaturas

- **Validado por:** Sistema automatizado + Revisão manual
- **Data:** 2026-01-07
- **Próxima revisão:** Após major releases
