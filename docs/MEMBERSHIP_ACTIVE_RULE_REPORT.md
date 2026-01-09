# Membership Active Rule - Report Final

**Data:** 2026-01-09  
**Versão:** 1.0  
**Status:** ✅ COMPLETO

---

## 1. Regra Final Escolhida

### user_team_memberships
- **Regra:** Existência do registro = membro ativo
- **Remoção:** DELETE do registro
- **Justificativa:** Tabela não possui colunas `is_active`, `left_at`, ou `deleted_at`

### squad_memberships
- **Regra:** `deleted_at IS NULL` = membro ativo
- **Remoção:** Soft delete (set `deleted_at = now()`)
- **Justificativa:** Tabela possui coluna `deleted_at` para soft delete

### teams / squads
- **Regra:** `deleted_at IS NULL` = entidade ativa
- **Remoção:** Soft delete
- **Justificativa:** Ambas possuem `deleted_at`

---

## 2. Funções Alteradas

| Função | Problema Original | Correção Aplicada |
|--------|-------------------|-------------------|
| `get_team_member_ids(uuid)` | Usava `utm.is_active = true` (coluna inexistente) | Removida. Existe apenas versão com 2 params |
| `get_team_member_ids(uuid, boolean)` | OK mas duplicada | Mantida como única versão |
| `can_view_ticket(uuid, uuid)` | Usava `user_squad_memberships` (tabela inexistente) | Corrigido para `squad_memberships` com `deleted_at IS NULL` |
| `check_scope_access(uuid, text, jsonb)` | Scope 'squad' retornava `false` sempre | Implementado com `squad_memberships.deleted_at IS NULL` |
| `get_leader_teams(uuid)` | OK (existência = ativo) | Adicionado comentário explicativo |

---

## 3. Documentação Atualizada

- [x] `docs/perf/MEMBERSHIP_SCHEMA_CHECK.md` - Schema real das tabelas
- [x] `docs/qa/QA_MEMBERSHIP_ACTIVE_RULE.md` - Cenários de teste
- [x] `scripts/audit-sql-missing-columns.ts` - Script de auditoria

---

## 4. Output do Audit

### Antes da Correção

```
❌ get_team_member_ids: utm.is_active (coluna inexistente)
❌ can_view_ticket: user_squad_memberships (tabela inexistente)
❌ check_scope_access: scope 'squad' não implementado
```

### Após a Correção

```sql
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%utm.is_active%'
    OR pg_get_functiondef(p.oid) ILIKE '%user_squad_memberships%'
  );

-- Resultado: 0 rows ✅
```

---

## 5. QA Summary

| Categoria | Status |
|-----------|--------|
| Schema documentado | ✅ PASS |
| Funções corrigidas | ✅ PASS |
| Regras canônicas definidas | ✅ PASS |
| Soft delete respeitado | ✅ PASS |
| BU scope mantido | ✅ PASS |
| Contrato frontend estável | ✅ PASS |
| Build passing | ✅ PASS |

---

## 6. Prevenção de Regressão

### Regras para Novas Funções

1. **user_team_memberships**: NUNCA filtrar por `is_active`, `left_at`, ou `deleted_at`
2. **squad_memberships**: SEMPRE filtrar por `deleted_at IS NULL`
3. **teams/squads**: SEMPRE filtrar por `deleted_at IS NULL` em queries e tree traversals
4. **Tabela correta**: Usar `squad_memberships` (NÃO `user_squad_memberships`)

### Audit Periódico

Executar `scripts/audit-sql-missing-columns.ts` após alterações em funções SQL.

---

## 7. Migration Aplicada

```sql
-- Migration: 20260109_membership_active_rule_hardening
-- Corrige todas as funções para usar regras canônicas de membership
```

---

**Aprovado por:** Sistema  
**Data de Aprovação:** 2026-01-09
