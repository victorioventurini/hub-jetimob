# Relatório Wave 3 — Higienização Profunda

**Data:** 2026-01-08  
**Status:** ✅ PARCIAL (60% concluído)

---

## Sumário Executivo

Wave 3 iniciada com foco na migração de `profiles.job_title` (texto) para join via `job_title_id`. Arquivos críticos migrados, edge function legacy removida.

---

## 1. Frontend — job_title → FK

### Concluído

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Users.tsx` | Query com join `job_titles!job_title_id(name)` |
| `src/components/users/JetimoberDialog.tsx` | Interfaces e queries atualizadas |
| `src/hooks/useSharedData.ts` | Retorna `job_title` via join |
| `src/hooks/usePublicProfile.ts` | Query com join |

### Pendente Wave 3.1

- Profile.tsx, UserProfile.tsx, useHomeData.ts
- Header.tsx, useBuUsers.ts, componentes de squads/OKRs

---

## 2. URL State

**Status:** ⏳ ADIADO

Hooks legados em uso como compatibility wrappers. Migração requer refatoração de API (tuple → object).

---

## 3. useNotifications

**Status:** ⏳ ADIADO

Único consumidor (CheckinDialog.tsx). Hook marcado como @deprecated.

---

## 4. Edge Functions

| Função | Ação | Status |
|--------|------|--------|
| `send-magic-link` | Removida (0 logs) | ✅ DONE |

---

## 5. Database

### Itens Identificados para DROP

| Item | Registros | Status |
|------|-----------|--------|
| `profiles.job_title` (coluna) | Deprecated | ⏳ Wave 3.1 |
| `metrics` (tabela) | 0 | ⏳ Wave 3.1 |
| `user_notification_preferences` | 0 | ⏳ Wave 3.1 |
| `squad_memberships` | 0 | ⏳ Wave 3.1 |

---

## 6. Próximos Passos (Wave 3.1)

1. Completar migração frontend (arquivos restantes)
2. DROP tabelas vazias
3. DROP coluna `profiles.job_title`
4. Migrar URL State hooks
5. Consolidar useNotifications

---

## Alinhamento TCR

- ✅ Queries sem `select('*')`
- ✅ Join com job_titles via FK
- ✅ BU scope mantido
- ✅ RLS intacto

---

## Conclusão

Wave 3 parcialmente concluída. Itens críticos (Users.tsx, edge function) finalizados. Continuação em Wave 3.1.
