# QA Wave 3 — Higienização Profunda

**Data:** 2026-01-08  
**Status:** ✅ PARCIAL (itens críticos concluídos)

---

## Casos de Teste Executados

### 1. CRUD de Usuários (cargo correto)

| Teste | Status |
|-------|--------|
| Lista de usuários exibe cargo via join | ✅ |
| Busca por cargo funciona | ✅ |
| Criação de usuário com job_title_id | ✅ |
| Edição de usuário mantém cargo | ✅ |

### 2. Troca de BU

| Teste | Status |
|-------|--------|
| Cargos isolados por BU | ✅ |
| Sem vazamento de dados entre BUs | ✅ |

---

## Arquivos Migrados (job_title → join)

- ✅ `src/pages/Users.tsx`
- ✅ `src/components/users/JetimoberDialog.tsx`
- ✅ `src/hooks/useSharedData.ts`
- ✅ `src/hooks/usePublicProfile.ts`

## Arquivos Pendentes Wave 3.1

- ⏳ `src/pages/Profile.tsx`
- ⏳ `src/pages/UserProfile.tsx`
- ⏳ `src/hooks/useHomeData.ts`
- ⏳ `src/components/layout/Header.tsx`
- ⏳ `src/modules/permissions/hooks/useBuUsers.ts`
- ⏳ `src/modules/teams/components/SquadDetailDialog.tsx`
- ⏳ `src/modules/okrs/components/initiatives/InitiativeDialog.tsx`

---

## Edge Functions

| Função | Logs (30d) | Ação |
|--------|------------|------|
| `send-magic-link` | 0 | ✅ REMOVIDA |
| `request-magic-link` | Ativa | Mantida |

---

## Tabelas Vazias (candidatas a DROP)

| Tabela | Registros | Ação Wave 3.1 |
|--------|-----------|---------------|
| `metrics` | 0 | DROP |
| `user_notification_preferences` | 0 | DROP |
| `squad_memberships` | 0 | DROP |

---

## Validação

- [x] Build passa
- [x] Lista de usuários funciona
- [x] Join com job_titles correto
