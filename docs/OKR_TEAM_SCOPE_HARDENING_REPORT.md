# OKR Team Scope Hardening Report

**Versão:** 1.0.0  
**Data:** 2026-01-09  
**TCR:** v2.12.0

---

## Resumo Executivo

Implementação de hardening de permissões para OKRs de times, garantindo que líderes só possam criar/gerenciar OKRs dentro de seu escopo hierárquico.

## Problema Resolvido

Anteriormente, a RLS de `okr_team_objectives` validava apenas `is_bu_member`, permitindo que qualquer líder criasse OKRs para qualquer time da BU.

## Solução Implementada

### Backend

1. **Nova função `get_descendant_team_ids(uuid)`**
   - Retorna array recursivo de time + todos descendentes

2. **Nova função `get_okr_manageable_team_ids(uuid, uuid)`**
   - Admin: todos os times da BU
   - Líder: time próprio + descendentes
   - Colaborador: nenhum

3. **Nova função `can_manage_team_okr(uuid, uuid)`**
   - Wrapper para verificação de permissão

4. **RLS atualizada em `okr_team_objectives`**
   - SELECT: `is_bu_member` (leitura aberta)
   - INSERT/UPDATE/DELETE: `is_bu_member AND can_manage_team_okr`

### Frontend

1. **Novo hook `useManageableTeams`**
   - Chama RPC `get_okr_manageable_team_ids`
   - Retorna lista flat com hierarquia

2. **`TeamObjectiveFormDialog` atualizado**
   - Campo Time pré-selecionado automaticamente
   - Select limitado aos times permitidos
   - Read-only se apenas um time disponível
   - Alerta se usuário não tem permissão

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/...` | Novas funções e RLS |
| `src/modules/okrs/hooks/useManageableTeams.ts` | Novo hook |
| `src/modules/okrs/components/TeamObjectiveFormDialog.tsx` | UX atualizada |

## Regras de Negócio Garantidas

| Regra | Enforcement |
|-------|-------------|
| Líder cria OKR no próprio time | ✅ Backend + Frontend |
| Líder cria OKR em sub-times | ✅ Backend + Frontend |
| Líder NÃO cria OKR em time pai | ✅ Backend (RLS bloqueia) |
| Líder NÃO cria OKR em time irmão | ✅ Backend (RLS bloqueia) |
| Admin tem acesso total | ✅ Backend + Frontend |

## Compatibilidade

- ✅ Compatível com TCR v2.12.0
- ✅ Segue DEVELOPMENT_STANDARDS.md
- ✅ Usa funções canônicas (`my_profile_id()`)
- ✅ Query keys via `src/lib/queryKeys.ts`

## QA

Ver `docs/qa/QA_OKR_TEAM_SCOPE.md` para cenários de teste completos.
