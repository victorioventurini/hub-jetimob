# Relatório Wave 3 — Higienização Profunda

**Data:** 2026-01-08  
**Status:** ✅ CONCLUÍDO (Wave 3.1)

---

## Sumário Executivo

Wave 3 e 3.1 concluídas. Migração completa de `profiles.job_title` texto para FK via `job_titles`, consolidação do hook `useNotifications`, e remoção de edge function legacy.

---

## 1. Frontend — job_title → FK

### Concluído

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Users.tsx` | Query com join `job_titles!job_title_id(name)` |
| `src/pages/Profile.tsx` | Query com join, interface atualizada |
| `src/pages/UserProfile.tsx` | Exibição via `profile.job_title` (mapeado via hook) |
| `src/components/users/JetimoberDialog.tsx` | Interfaces e queries atualizadas |
| `src/hooks/useSharedData.ts` | Retorna `job_title` via join |
| `src/hooks/usePublicProfile.ts` | Query com join |
| `src/hooks/useHomeData.ts` | Todas as queries migradas (birthdays, new hires, anniversaries) |
| `src/modules/permissions/hooks/useBuUsers.ts` | Query com join, interface `job_title_name` |
| `src/modules/permissions/pages/BuPermissionsPage.tsx` | Uso de `job_title_name` |
| `src/modules/teams/hooks/useTeams.ts` | Query com join para members |

### Nota: Onboarding

O `OnboardingWizard.tsx` mantém `job_title` como texto livre pois opera **antes** da seleção de BU, não tendo acesso ao contexto necessário para FK. Isso é intencional e documentado.

---

## 2. useNotifications

**Status:** ✅ CONSOLIDADO

- Lógica de `processMentions` movida diretamente para `CheckinDialog.tsx`
- Hook `src/hooks/useNotifications.ts` **DELETADO**
- Zero dependências restantes

---

## 3. Edge Functions

| Função | Ação | Status |
|--------|------|--------|
| `send-magic-link` | Removida (0 logs) | ✅ DONE |

---

## 4. Próximos Passos (Wave 4)

1. DROP coluna `profiles.job_title` (após validação completa)
2. DROP tabelas vazias (metrics, user_notification_preferences, squad_memberships)
3. Migrar URL State hooks (tuple → object API)

---

## Alinhamento TCR

- ✅ Queries sem `select('*')`
- ✅ Join com job_titles via FK
- ✅ BU scope mantido
- ✅ RLS intacto
- ✅ Hook legado removido

---

## Conclusão

Wave 3 e 3.1 concluídas com sucesso. Sistema migrado para FK job_titles, hook de notificações consolidado.
