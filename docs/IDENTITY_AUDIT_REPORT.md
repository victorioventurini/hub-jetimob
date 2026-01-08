# Relatório de Auditoria - Convenção de Identidade (user_id vs profile_id)

**Data:** 2026-01-08  
**Autor:** Lovable AI  
**Status:** 🔴 CRÍTICO - Inconsistências encontradas

## Resumo Executivo

A auditoria identificou **inconsistências críticas** na convenção de identidade do Hub. Várias colunas que deveriam armazenar `auth.users.id` estão armazenando `profiles.id`, quebrando:

- ❌ Verificação de liderança de times
- ❌ Escopo de permissões (user_can_manage_team)
- ❌ RLS policies que comparam `auth.uid()`
- ❌ Atribuição de ativos

## Resultados da Auditoria

### Tabela de Colunas Auditadas

| Tabela | Coluna | Total Registros | Matches auth.users | Matches profiles.id | Status |
|--------|--------|-----------------|-------------------|---------------------|--------|
| `teams` | `leader_user_id` | 1 | 0 | 1 | 🔴 **WRONG** |
| `asset_inventory` | `current_user_id` | 241 | 1 | 240 | 🔴 **WRONG** |
| `bu_user_permission_groups` | `user_id` | 7 | 0 | 7 | 🔴 **WRONG** |
| `okr_org_objectives` | `owner_user_id` | 3 | 0 | 3 | 🔴 **WRONG** |
| `tickets` | `owner_user_id` | 1 | 0 | 1 | 🔴 **WRONG** |
| `tickets` | `created_by_user_id` | 1 | 0 | 1 | 🔴 **WRONG** |
| `profiles` | `manager_user_id` | 1 | 0 | 0 | ⚠️ **ORPHAN** |
| `asset_movements` | `from_user_id` | - | - | - | ⚪ NO_DATA |
| `asset_movements` | `to_user_id` | 1 | 1 | 0 | ✅ OK |
| `asset_movements` | `performed_by_user_id` | 1 | 1 | 0 | ✅ OK |
| `bu_user_memberships` | `user_id` | 3 | 3 | 0 | ✅ OK |

### Legenda

- 🔴 **WRONG**: Coluna contém `profiles.id` mas deveria conter `auth.users.id`
- ⚠️ **ORPHAN**: Valores não correspondem a nenhuma das duas tabelas
- ⚪ **NO_DATA**: Sem dados para verificar
- ✅ **OK**: Usando convenção correta

## Análise Detalhada

### 1. `teams.leader_user_id` 🔴

**Problema:** Contém `profile_id` (110f72b1-ea51-4d31-8235-43aff585022e) do Vitor Severo.

**Impacto:**
- Função `is_team_leader(auth.uid(), team_id)` sempre retorna FALSE
- Vitor não consegue gerenciar OKRs do time Marketing
- RLS de escopo de time quebrada

**Dados:**
```
team_id: c8e5d7a7-0b36-4910-bdf1-6cc912f849fe
team_name: Marketing
leader_user_id: 110f72b1-ea51-4d31-8235-43aff585022e (profiles.id)
auth.users.id correto: 0519fa0e-e130-4707-b05e-6debc0fbeb27
```

### 2. `asset_inventory.current_user_id` 🔴

**Problema:** 240 de 241 registros contêm `profile_id`.

**Impacto:**
- Consultas que comparam `auth.uid()` falham
- Relatórios de ativos por usuário podem quebrar
- Trigger de movimentação pode estar salvando ID errado

**Causa provável:** Importação em massa usou `profile_id` por conveniência.

### 3. `bu_user_permission_groups.user_id` 🔴

**Problema:** Todos os 7 registros contêm `profile_id`.

**Impacto CRÍTICO:**
- Permissões são atribuídas por `profile_id`
- Função `user_has_permission(auth.uid(), ...)` pode falhar
- Se frontend passa `profile_id`, funciona. Se passa `auth.uid()`, quebra.

**Observação:** A FK definida aponta para `profiles.id`, então foi **intencionalmente desenhado assim**. Isso é uma **decisão arquitetural** documentada em `docs/IDENTITY_CONVENTION.md`.

### 4. `okr_org_objectives.owner_user_id` 🔴

**Problema:** 3 registros contêm `profile_id`.

**Impacto:**
- Owner não é reconhecido para edição
- Políticas `self_or_owner` não funcionam

### 5. `tickets.owner_user_id` e `created_by_user_id` 🔴

**Problema:** Ambas colunas contêm `profile_id`.

**Impacto:**
- Ticket não reconhece owner para permissões
- Histórico de criação inconsistente

## Foreign Keys Atuais

Não foram encontradas FKs explícitas para `auth.users` ou `profiles` nas colunas problemáticas. Isso permitiu a inconsistência.

## Recomendações

### Prioridade 1 - CRÍTICO (Impacto imediato)
1. ✅ Corrigir `teams.leader_user_id` → migrar para `auth.users.id`
2. ✅ Corrigir `asset_inventory.current_user_id` → migrar para `profile_id` (decisão arquitetural - ver IDENTITY_CONVENTION.md)

### Prioridade 2 - ALTO
3. Revisar `bu_user_permission_groups.user_id` → já usa `profile_id` por design
4. Corrigir `okr_org_objectives.owner_user_id` → migrar para `profile_id`
5. Corrigir `tickets.*_user_id` → migrar para `profile_id`

### Prioridade 3 - HARDENING
6. Adicionar FKs para prevenir regressão
7. Criar triggers de validação
8. Documentar convenção

## Próximos Passos

Ver `docs/IDENTITY_CONVENTION.md` para a convenção oficial.
Ver `docs/IDENTITY_MIGRATION_PLAN.md` para o plano de migração.
