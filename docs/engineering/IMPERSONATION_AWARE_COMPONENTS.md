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

Hooks que usam `usePermissions().isWildcard` já são impersonation-aware:

```typescript
// ✅ CORRETO: isWildcard retorna false durante impersonação
const { isWildcard } = usePermissions();

const canManageTeam = (teamId: string): boolean => {
  if (isWildcard) return true; // Só true se NÃO impersonando
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

## 5. Componentes Já Corrigidos

| Componente | Arquivo | Tipo de Proteção |
|------------|---------|------------------|
| `TeamFormDialog` | `src/modules/teams/components/TeamFormDialog.tsx` | Defense in Depth |
| `InventoryFormDialog` | `src/modules/assets/components/inventory/InventoryFormDialog.tsx` | Defense in Depth |
| `TeamObjectiveFormDialog` | `src/modules/okrs/components/TeamObjectiveFormDialog.tsx` | Defense in Depth |
| `TeamKrFormDialog` | `src/modules/okrs/components/TeamKrFormDialog.tsx` | Defense in Depth |
| `useTeamManagement` | `src/hooks/useTeamManagement.ts` | Impersonation-Aware Hook |
| `useAssetPermissionsV2` | `src/modules/assets/hooks/useAssetPermissionsV2.ts` | Via `usePermissions().isWildcard` |
| `useModuleAccess` | `src/hooks/useModuleAccess.ts` | Via `!isImpersonating && isAdmin` |
| `useCanManageTeamOkr` | `src/modules/okrs/hooks/useCanManageTeamOkr.ts` | Via `usePermissions().isWildcard` |

---

## 6. Componentes Pendentes

Componentes que ainda precisam de defense in depth (implementar conforme tocar):

| Componente | Arquivo | Prioridade |
|------------|---------|------------|
| `CycleFormDialog` | `src/modules/okrs/components/settings/CycleFormDialog.tsx` | Média |
| `OrgObjectiveFormDialog` | `src/modules/okrs/components/OrgObjectiveFormDialog.tsx` | Média |
| `CategoryFormDialog` | `src/modules/assets/components/settings/CategoryFormDialog.tsx` | Baixa |
| `PermissionDialog` | `src/modules/permissions/components/PermissionDialog.tsx` | Baixa |
| `JetimoberDialog` | `src/components/users/JetimoberDialog.tsx` | Baixa |
| `LocationDialog` | `src/modules/bu/components/LocationDialog.tsx` | Baixa |
| `EditBuDialog` | `src/modules/bu/components/EditBuDialog.tsx` | Baixa |

---

## 7. Checklist para Novos Componentes

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

## Referências

- [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) — Padrões gerais
- [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md) — Modelo de permissões
- [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) — Convenção de identidade
