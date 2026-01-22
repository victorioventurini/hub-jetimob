# Padrão: Componentes Impersonation-Aware

**Versão:** 1.0.0  
**Última atualização:** 2026-01-13  
**Status:** Normativo  
**Referência:** TCR v2.24.0

---

## Índice

- [1. Contexto](#1-contexto)
- [2. Problema](#2-problema)
- [3. Solução: Duas Camadas de Proteção](#3-solução-duas-camadas-de-proteção)
- [4. Implementação](#4-implementação)
- [5. Componentes Já Corrigidos](#5-componentes-já-corrigidos)
- [6. Componentes Pendentes](#6-componentes-pendentes)
- [7. Checklist para Novos Componentes](#7-checklist-para-novos-componentes)

---

## 1. Contexto

O Hub permite que `super_admin` impersone usuários para visualizar a experiência deles.

**Regras de impersonação:**
- É uma impersonação de **VISUALIZAÇÃO** apenas
- Permissões mostradas são do usuário impersonado
- Ações (create/update/delete) continuam executadas como o usuário REAL
- RLS sempre usa `auth.uid()` do super_admin

---

## 2. Problema

Quando o `super_admin` impersona um usuário com permissões limitadas:

1. **Cache stale:** React Query pode manter dados do super_admin no cache
2. **Hooks usando ID errado:** Hooks que usam `userId` real ao invés do `impersonatedUserId`
3. **UI inconsistente:** Botões de edição aparecem mesmo quando impersonando usuário sem permissão

### Exemplo do Bug

```typescript
// ❌ ERRADO: Hook usa userId real, ignora impersonação
export function useTeamManagement() {
  const { userId } = useIdentity(); // Sempre retorna o super_admin
  
  const { data: manageableTeams } = useQuery({
    queryKey: ['manageable-teams', buId, userId], // Cache do super_admin
    queryFn: async () => {
      return client.rpc("get_manageable_teams", {
        p_user_id: userId, // Busca times do super_admin
      });
    },
  });
}
```

Resultado: Super_admin impersonando Vitor vê todos os times como editáveis, quando Vitor não tem permissão.

---

## 3. Solução: Duas Camadas de Proteção

### Camada 1: Cache Invalidation no ImpersonationContext

Ao iniciar/parar impersonação, invalidar queries afetadas:

```typescript
// src/contexts/ImpersonationContext.tsx
const startImpersonation = useCallback(async (userId: string) => {
  // ... lógica existente ...
  
  // Invalidar caches que dependem de permissões
  queryClient.invalidateQueries({ queryKey: ["identity"] });
  queryClient.invalidateQueries({ queryKey: ["permissions"] });
  queryClient.invalidateQueries({ queryKey: ["manageable-teams"] });
  queryClient.invalidateQueries({ queryKey: ["assets"] });
  queryClient.invalidateQueries({ queryKey: ["okr-manageable-teams"] });
  
  // Forçar refetch da variante correta
  queryClient.refetchQueries({ queryKey: ["manageable-teams", "impersonated"] });
}, [queryClient]);
```

### Camada 2: Defense in Depth nos Componentes

Mesmo que a invalidação de cache falhe, o componente verifica permissão antes de renderizar:

```typescript
// src/modules/teams/components/TeamFormDialog.tsx
export function TeamFormDialog({ team, ...props }: TeamFormDialogProps) {
  const isEditing = !!team;
  const { canManageTeam } = useTeamManagement();

  // ⚠️ DEFENSE IN DEPTH: Não renderizar se não tiver permissão
  if (isEditing && team && !canManageTeam(team.id)) {
    return null;
  }
  
  // ... resto do componente
}
```

---

## 4. Implementação

### 4.1 Hooks Impersonation-Aware

Hooks que verificam permissões devem usar `impersonatedUserId` quando disponível:

```typescript
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

export function useTeamManagement() {
  const { userId: realUserId } = useIdentity();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();
  
  // ✅ Usar ID efetivo (impersonado ou real)
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : realUserId;
  
  // ✅ Query key inclui flag de impersonação para separar caches
  const queryKey = isImpersonating
    ? ['manageable-teams', 'impersonated', buId, effectiveUserId] as const
    : ['manageable-teams', 'real', buId, effectiveUserId] as const;

  const { data: manageableTeams } = useQuery({
    queryKey,
    queryFn: async () => {
      return client.rpc("get_manageable_teams", {
        p_user_id: effectiveUserId, // ✅ ID correto
      });
    },
  });
}
```

### 4.2 Hooks que já usam `isWildcard`

Hooks que usam `usePermissions().isWildcard` já são impersonation-aware porque
`usePermissions()` busca as permissões do usuário impersonado (via `get_user_permissions_for_impersonation`):

```typescript
// ✅ CORRETO: isWildcard reflete as permissões do usuário IMPERSONADO
// Se impersonando colaborador comum: isWildcard = false
// Se impersonando admin BU: isWildcard = true (porque tem '*')
const { isWildcard } = usePermissions();

const canManageTeam = (teamId: string): boolean => {
  if (isWildcard) return true; // True se usuário (ou impersonado) é admin
  return manageableTeams.some(t => t.team_id === teamId && t.can_manage);
};
```

### 4.3 Defense in Depth em Form Dialogs

Todo dialog de edição DEVE verificar permissão antes de renderizar:

```typescript
export function MyFormDialog({ item, ...props }: MyFormDialogProps) {
  const isEditing = !!item;
  const { canManageItem } = useItemPermissions(); // Hook impersonation-aware

  // ⚠️ OBRIGATÓRIO para dialogs de edição
  if (isEditing && item && !canManageItem(item.id)) {
    return null;
  }
  
  // ... resto do componente
}
```

---

## 5. Componentes Corrigidos

| Componente | Arquivo | Tipo de Proteção |
|------------|---------|------------------|
| `TeamFormDialog` | `src/modules/teams/components/TeamFormDialog.tsx` | Defense in Depth |
| `InventoryFormDialog` | `src/modules/assets/components/inventory/InventoryFormDialog.tsx` | Defense in Depth |
| `TeamObjectiveFormDialog` | `src/modules/okrs/components/TeamObjectiveFormDialog.tsx` | Defense in Depth |
| `TeamKrFormDialog` | `src/modules/okrs/components/TeamKrFormDialog.tsx` | Defense in Depth |
| `CycleFormDialog` | `src/modules/okrs/components/settings/CycleFormDialog.tsx` | Defense in Depth |
| `OrgObjectiveFormDialog` | `src/modules/okrs/components/OrgObjectiveFormDialog.tsx` | Defense in Depth |
| `CategoryFormDialog` | `src/modules/assets/components/settings/CategoryFormDialog.tsx` | Defense in Depth |
| `PermissionDialog` | `src/modules/permissions/components/PermissionDialog.tsx` | Defense in Depth |
| `JetimoberDialog` | `src/components/users/JetimoberDialog.tsx` | Defense in Depth |
| `LocationDialog` | `src/modules/bu/components/LocationDialog.tsx` | Defense in Depth |
| `EditBuDialog` | `src/modules/bu/components/EditBuDialog.tsx` | Defense in Depth |
| `CreateKpiDialog` | `src/modules/kpis/components/CreateKpiDialog.tsx` | Defense in Depth |
| `KpiDashboardPage` | `src/modules/kpis/pages/KpiDashboardPage.tsx` | `usePermissions().has("kpis:manage")` |
| `useTeamManagement` | `src/hooks/useTeamManagement.ts` | Impersonation-Aware Hook |
| `useAssetPermissionsV2` | `src/modules/assets/hooks/useAssetPermissionsV2.ts` | Via `usePermissions().isWildcard` |
| `useModuleAccess` | `src/hooks/useModuleAccess.ts` | Via `isWildcard` (impersonado) ou `isAdmin`/`userRole` (normal) |
| `useCanManageTeamOkr` | `src/modules/okrs/hooks/useCanManageTeamOkr.ts` | Via `usePermissions().isWildcard` |

---

## 6. Checklist para Novos Componentes

### Para Hooks de Permissão:

- [ ] Usar `useOptionalImpersonation()` para detectar impersonação
- [ ] Usar `effectiveUserId` (impersonado ou real) em queries
- [ ] Query key deve diferenciar estado impersonado vs real
- [ ] Usar `usePermissions().isWildcard` (já respeita impersonação)

### Para Form Dialogs com Modo Edição:

- [ ] Importar hook de permissão apropriado
- [ ] Adicionar check no início do componente:
  ```typescript
  if (isEditing && item && !canManageItem(item.id)) {
    return null;
  }
  ```
- [ ] Testar impersonando usuário sem permissão

### Para ImpersonationContext:

- [ ] Ao adicionar nova query de permissão, adicionar invalidação em:
  - `startImpersonation()`
  - `stopImpersonation()`

---

## 8. Áreas Administrativas Durante Impersonação

### Convenção

**Áreas administrativas** (rotas protegidas por `AdminRoute`, configurações do Hub, gestão de BUs) **mantêm acesso** do super_admin mesmo durante impersonação. A justificativa é que super_admins precisam poder fazer ajustes enquanto investigam problemas.

**Funcionalidades operacionais de admin** (como switch de usuário em wizards, logs de auditoria) **devem ser ocultadas** durante impersonação, pois são redundantes ou irrelevantes para a experiência do usuário impersonado.

### Padrão de Código

```typescript
// Para features que DEVEM ser ocultadas durante impersonação:
const { isAdmin } = useAuth();
const { isImpersonating } = useOptionalImpersonation();
const canAccessFeature = !isImpersonating && isAdmin;

// Para rotas que super_admin MANTÉM acesso:
// Usar isAdmin diretamente (AdminRoute já faz isso)
```

### Exemplos

| Feature | Comportamento | Código |
|---------|---------------|--------|
| `AdminRoute` | Mantém acesso | `isAdmin` (sem check de impersonação) |
| `Sidebar` (seção Admin) | Mantém visível | `isAdmin` (já implementado) |
| `VicAuditPage` | Ocultar | `!isImpersonating && isAdmin` |
| Switch de usuário em Check-in | Desabilitar | `!isImpersonating && isAdmin` |

---

## Referências

- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Padrões gerais
- [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md) — Modelo de permissões
- [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) — Convenção de identidade
