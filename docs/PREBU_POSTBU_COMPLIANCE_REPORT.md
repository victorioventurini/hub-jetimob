# Pre-BU vs Post-BU Compliance Report

> **Data:** 2026-01-07  
> **Status:** ✅ PASS

---

## Resumo

Correção global de chamadas `useBuScopedSupabase()` em contextos pré-BU.

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
| `src/modules/bu/hooks/useBuData.ts` | `useBuScopedSupabase` → `supabase` global |
| `src/modules/external/hooks/useExternalUser.ts` | `useBuScopedSupabase` → `supabase` global |

## Helpers Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/integrations/supabase/getOptionalBuClient.ts` | Hook `useOptionalBuClient()` - safe para pré-BU |
| `scripts/audit-prebu-buscoped.ts` | Script de auditoria para detectar violações |

## Exceções Justificadas (Cliente Global)

| Arquivo | Justificativa |
|---------|---------------|
| `useBuData.ts` | Bootstrap de memberships (antes de BU existir) |
| `useExternalUser.ts` | Bootstrap de usuários externos |
| `OnboardingGuard.tsx` | Onboarding acontece antes de BU |
| `CityAutocomplete.tsx` | Cidades não são dados BU-scoped |

## Resultado

```
✅ audit:prebu => PASS (0 findings em arquivos pré-BU)
✅ Nenhum select('*') nos arquivos alterados
✅ Todas queries com enabled: isReady
```

---

**Validado:** Lovable AI  
**Data:** 2026-01-07
