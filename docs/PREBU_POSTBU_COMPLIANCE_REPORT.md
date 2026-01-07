# PRE-BU vs POST-BU Compliance Report

**Data:** 2026-01-07  
**Status:** ✅ PASS

---

## Sumário Executivo

Todos os hooks/componentes que podem ser montados antes da seleção de BU foram corrigidos para:
1. **NÃO** chamar `useBuScopedSupabase()` (que lança erro se `currentBuId` é null)
2. Usar `useOptionalBuClient()` ou cliente global conforme o caso
3. Gating com `enabled: isReady && !!buId` para queries
4. Remoção de `select('*')` (seleção explícita de colunas)

---

## Itens Corrigidos

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePermissions.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/hooks/useNotifications.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/hooks/useGlobalSearch.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/hooks/useProfiles.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/hooks/useTeamManagement.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/components/CityAutocomplete.tsx` | `useBuScopedSupabase` → `supabase` global |
| `src/components/onboarding/OnboardingGuard.tsx` | `useBuScopedSupabase` → `supabase` global |
| `src/components/notifications/NotificationCenter.tsx` | `useBuScopedSupabase` → `createBuScopedClient` condicional |
| `src/contexts/ModuleContext.tsx` | `useBuScopedSupabase` → `createBuScopedClient` condicional |
| `src/modules/bu/hooks/useBuData.ts` | `useUserBus` já usa global (mantido) |
| `src/modules/external/hooks/useExternalUser.ts` | Já usa global (mantido) |
| `src/modules/vic/hooks/useVicAgent.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/components/ReportProblemDialog.tsx` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/modules/permissions/hooks/usePermissionAudit.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/modules/permissions/hooks/useBuUsers.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |
| `src/modules/permissions/hooks/usePermissionCatalog.ts` | `useBuScopedSupabase` → `useOptionalBuClient` |

---

## Resultado do Audit Script

```
$ npx tsx scripts/audit-prebu-buscoped.ts

✅ PASS - Nenhuma chamada indevida de useBuScopedSupabase() em contextos pré-BU

Arquivos verificados: 16
Findings: 0
```

---

## Resultado do Grep Complementar

### useBuScopedSupabase em contextos pré-BU

```bash
grep -r "useBuScopedSupabase(" src/contexts/ src/components/onboarding/ \
  src/components/notifications/ src/modules/vic/
```

**Resultado:** 0 ocorrências restantes.

### createBuScopedClient sem guard

Todos os usos de `createBuScopedClient()` estão com guard adequado:

| Arquivo | Guard |
|---------|-------|
| `ModuleContext.tsx:42` | `useMemo(() => currentBuId ? createBuScopedClient(currentBuId) : null)` ✅ |
| `NotificationCenter.tsx:78` | `useMemo(() => currentBuId ? createBuScopedClient(currentBuId) : null)` ✅ |
| `getOptionalBuClient.ts:80` | `if (!buId) return null` ✅ |

---

## Evidências de Gating por BU

### usePermissions
```typescript
const { client, isReady, buId } = useOptionalBuClient();
// ...
enabled: isReady && !!user?.id,
```

### useNotifications
```typescript
const { client, buId } = useOptionalBuClient();
// Mutations checam: if (!user?.id || !buId || !client) throw
```

### useGlobalSearch
```typescript
const { client, buId, isReady } = useOptionalBuClient();
// ...
enabled: isReady && debouncedQuery.length >= 2,
```

### useTeamManagement
```typescript
const { client, buId, isReady } = useOptionalBuClient();
// ...
enabled: isReady && !!user?.id,
```

### useVicAgent
```typescript
const { client: supabase, isReady, buId } = useOptionalBuClient();
// mutationFn: if (!supabase || !isReady || !buId) throw
```

---

## Confirmação: Zero select('*')

Nos arquivos alterados, todos os `select('*')` foram substituídos por seleção explícita:

| Arquivo | Status |
|---------|--------|
| `usePermissions.ts` | ✅ Usa RPC `get_my_permissions` |
| `useNotifications.ts` | ✅ `select('display_name')` |
| `useGlobalSearch.ts` | ✅ Usa Edge Function |
| `useProfiles.ts` | ✅ Usa `.update({...})` |
| `useTeamManagement.ts` | ✅ Usa RPC `get_manageable_teams` |
| `OnboardingGuard.tsx` | ✅ Colunas explícitas |
| `NotificationCenter.tsx` | ✅ Colunas explícitas |
| `ModuleContext.tsx` | ✅ Colunas explícitas |
| `useVicAgent.ts` | ✅ Colunas explícitas |
| `usePermissionCatalog.ts` | ✅ Colunas explícitas |
| `useBuUsers.ts` | ✅ Colunas explícitas |

---

## Exceções Justificadas (Cliente Global)

| Arquivo | Justificativa |
|---------|---------------|
| `src/hooks/useAuth.tsx` | Auth antes da BU |
| `src/modules/bu/hooks/useBuData.ts` → `useUserBus` | Bootstrap de memberships |
| `src/modules/bu/hooks/useBuData.ts` → `checkEmailDomainAllowed` | Pré-BU |
| `src/modules/external/hooks/useExternalUser.ts` | Pré-BU |
| `src/components/onboarding/OnboardingGuard.tsx` | Onboarding antes da BU |
| `src/components/CityAutocomplete.tsx` | Dados públicos (edge function) |

---

## Conclusão

✅ **PASS** - Todas as chamadas indevidas de `useBuScopedSupabase()` em contextos pré-BU foram eliminadas.

- Nenhum componente/hook pré-BU chama `useBuScopedSupabase()`
- Todos os hooks pós-BU usam `useOptionalBuClient()` com gating adequado
- Nenhuma regressão identificada
- Zero `select('*')` nos arquivos alterados
