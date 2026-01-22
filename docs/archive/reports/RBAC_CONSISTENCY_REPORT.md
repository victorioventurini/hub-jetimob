# RBAC Consistency Report

> **Data:** 2026-01-07  
> **Status:** ✅ COMPLIANT  
> **Versão:** 1.0.0

## Sumário Executivo

O sistema Hub da Jet implementa um modelo RBAC (Role-Based Access Control) robusto onde:

1. **Roles** servem apenas como atalhos para concessão de permission keys
2. **Permission Keys** são a ÚNICA fonte de verdade para autorização
3. **RLS Policies** usam funções SQL canônicas (`has_permission`, `user_can_manage_team`)
4. **Frontend** usa exclusivamente `usePermissions()` para verificações

---

## 1. Catálogo de Permissões

### Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de permission keys | 141 |
| Módulos cobertos | 9 |
| Status | Todas ativas |

### Módulos com Permission Keys

| Módulo | Quantidade | Exemplos |
|--------|------------|----------|
| `assets` | 47 | `assets.inventory.create:bu`, `assets.keys.checkout:bu` |
| `okrs` | 28 | `okrs.org_objective.create:bu`, `okrs.team_kr.update:team` |
| `tickets` | 18 | `tickets.create:internal`, `tickets.manage:bu` |
| `users` | 15 | `users.profile.manage:bu`, `users.invite:bu` |
| `permissions` | 12 | `permissions.global.manage:platform`, `permissions.bu.manage:bu` |
| `kpis` | 10 | `kpis.metric.create:bu`, `kpis.value.update:bu` |
| `teams` | 6 | `teams.create:bu`, `teams.member.manage:team` |
| `integrations` | 3 | `integrations.configure:bu` |
| `automation` | 2 | `automation.connection.manage:bu` |

---

## 2. Mapeamento Roles → Permission Keys

### super_admin
```
['*'] (wildcard - acesso total)
```

### admin (BU)
```
['*'] (wildcard na BU - acesso total dentro da BU)
```

### collaborator
```
Apenas permission keys explicitamente atribuídas via:
- bu_user_permission_groups (grupos)
- bu_user_permission_overrides (overrides individuais)
```

---

## 3. Funções SQL Canônicas

### `has_permission(p_user_id, p_bu_id, p_permission_key)`

```sql
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id uuid, 
  p_bu_id uuid, 
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permissions text[];
BEGIN
  -- Super admin sempre tem acesso
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- BU admin tem acesso total na BU
  IF is_bu_admin(p_user_id, p_bu_id) THEN
    RETURN true;
  END IF;
  
  -- Agregar permissões de grupos + overrides
  SELECT ARRAY_AGG(DISTINCT pc.key)
  INTO v_permissions
  FROM (
    SELECT pgp.permission_id
    FROM public.bu_user_permission_groups upg
    JOIN public.bu_permission_group_configs pgc
      ON pgc.bu_id = upg.bu_id AND pgc.group_id = upg.group_id
    JOIN public.permission_group_permissions pgp
      ON pgp.group_id = upg.group_id
    WHERE upg.user_id = p_user_id
      AND upg.bu_id = p_bu_id
      AND pgc.is_enabled = true
    UNION
    SELECT o.permission_id
    FROM public.bu_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.bu_id = p_bu_id
      AND o.effect = 'allow'
  ) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  RETURN p_permission_key = ANY(COALESCE(v_permissions, ARRAY[]::text[]));
END;
$$;
```

### `user_can_manage_team(p_user_id, p_team_id)`

```sql
CREATE OR REPLACE FUNCTION public.user_can_manage_team(
  p_user_id uuid, 
  p_team_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bu_id uuid;
BEGIN
  -- Super admin can manage any team
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- Get team's BU
  SELECT bu_id INTO v_bu_id 
  FROM public.teams 
  WHERE id = p_team_id AND deleted_at IS NULL;
  
  IF v_bu_id IS NULL THEN
    RETURN false;
  END IF;

  -- BU admin can manage any team in their BU
  IF is_bu_admin(p_user_id, v_bu_id) THEN
    RETURN true;
  END IF;

  -- Direct leader of this exact team (NOT parent team)
  RETURN is_team_leader(p_user_id, p_team_id);
END;
$$;
```

### `get_my_permissions(p_bu_id)`

```sql
CREATE OR REPLACE FUNCTION public.get_my_permissions(p_bu_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_permissions text[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Super admin tem wildcard
  IF is_super_admin(v_user_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- BU admin tem wildcard na BU
  IF is_bu_admin(v_user_id, p_bu_id) THEN
    RETURN ARRAY['*']::text[];
  END IF;
  
  -- Verificar acesso à BU
  IF NOT user_has_bu_access(v_user_id, p_bu_id) THEN
    RETURN ARRAY[]::text[];
  END IF;
  
  -- Agregar permissões
  SELECT ARRAY_AGG(DISTINCT pc.key)
  INTO v_permissions
  FROM (...) perms
  JOIN public.permission_catalog pc ON pc.id = perms.permission_id
  WHERE pc.status = 'active';
  
  RETURN COALESCE(v_permissions, ARRAY[]::text[]);
END;
$$;
```

---

## 4. Frontend - Hook de Permissões

### `usePermissions()`

```tsx
// src/hooks/usePermissions.ts
export function usePermissions() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions", currentBuId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_permissions", {
        p_bu_id: currentBuId,
      });
      return data || [];
    },
  });

  const isWildcard = permissions.includes("*");

  const has = (key: string): boolean => {
    if (isWildcard) return true;
    return permissions.includes(key);
  };

  const hasAny = (keys: string[]): boolean => {
    if (isWildcard) return true;
    return keys.some((key) => permissions.includes(key));
  };

  const hasAll = (keys: string[]): boolean => {
    if (isWildcard) return true;
    return keys.every((key) => permissions.includes(key));
  };

  return { permissions, has, hasAny, hasAll, isWildcard, isLoading };
}
```

---

## 5. Checks de Role no Frontend

### Checks Justificados (UI-only helpers)

| Arquivo | Linha | Check | Justificativa |
|---------|-------|-------|---------------|
| `src/hooks/useAuth.tsx` | 168 | `role === 'super_admin' \|\| role === 'admin'` | Define `isAdmin` flag para UI |
| `src/components/layout/DynamicSidebar.tsx` | 104 | `userRole === "admin"` | Visibilidade de seção admin |
| `src/components/onboarding/OnboardingWizard.tsx` | 135 | `userRole === "super_admin"` | Isenção de seleção de time |
| `src/modules/bu/components/BuSelector.tsx` | 19 | `role === "super_admin"` | Super admin vê todas BUs |

> **Importante:** Estes checks são **somente para UI/UX** e NÃO controlam autorização real.
> A autorização é feita via RLS + permission keys no backend.

---

## 6. Resultado da Auditoria

### Script: `audit-rbac.ts`

```bash
$ npx tsx scripts/audit-rbac.ts

╔══════════════════════════════════════════════════════════════╗
║              RBAC AUDIT REPORT                               ║
╚══════════════════════════════════════════════════════════════╝

✅ PASS - Nenhuma violação de RBAC encontrada!

Todos os checks de autorização estão usando permission keys.

Arquivos com exceções justificadas (UI-only helpers):
  - src/hooks/useAuth.tsx
  - src/components/layout/DynamicSidebar.tsx
  - src/components/layout/Header.tsx
  - src/components/onboarding/OnboardingWizard.tsx
  - src/modules/bu/components/BuSelector.tsx
  - src/components/auth/RequirePermission.tsx
  - src/contexts/BuContext.tsx
```

---

## 7. Confirmação de Compliance

### ✅ Nenhuma decisão de autorização depende de role direta

1. **RLS Policies**: Todas usam `has_permission()`, `user_can_manage_team()`, `is_current_bu()`
2. **Frontend**: Usa `usePermissions().has()` para verificar acesso a features
3. **Backend (Edge Functions)**: Validam via JWT claims + RPC `has_permission`

### ✅ Uma única fonte de verdade

1. `permission_catalog` - Catálogo global de permissões
2. `get_my_permissions()` - Função SQL que retorna permissões do usuário
3. `has_permission()` - Função SQL para RLS

### ✅ Nenhuma lógica duplicada

- Toda lógica de permissão está centralizada nas funções SQL
- Frontend apenas consome via `usePermissions()`

---

## 8. Como Executar Auditoria

```bash
# Verificar conformidade RBAC
npx tsx scripts/audit-rbac.ts

# Verificar uso de BU-scoped Supabase
npx tsx scripts/audit-useBuScopedSupabase.ts
```

---

## 9. Próximos Passos Recomendados

1. **Monitoramento contínuo**: Integrar scripts de auditoria no CI/CD
2. **Alertas**: Configurar alertas para violações de RLS
3. **Documentação**: Manter este relatório atualizado a cada release

---

## Assinaturas

- **Autor:** Sistema automatizado
- **Revisado por:** Equipe de Engenharia
- **Data de validação:** 2026-01-07
