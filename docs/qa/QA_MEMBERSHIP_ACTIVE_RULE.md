# QA - Membership Active Rule

**Data:** 2026-01-09  
**Versão:** 1.0

## Regras Canônicas Aplicadas

| Tabela                 | Regra de Membro Ativo           |
|------------------------|----------------------------------|
| user_team_memberships  | Existência do registro           |
| squad_memberships      | `deleted_at IS NULL`             |
| teams                  | `deleted_at IS NULL`             |
| squads                 | `deleted_at IS NULL`             |

---

## Cenários de Teste

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Usuário membro de time aparece em `get_team_member_ids` | ✅ PASS |
| 2 | Usuário removido do time (registro deletado) NÃO aparece | ✅ PASS |
| 3 | `get_leader_teams.member_count` conta apenas membros existentes | ✅ PASS |
| 4 | `check_scope_access('team')` retorna true para membro existente | ✅ PASS |
| 5 | `check_scope_access('squad')` valida `deleted_at IS NULL` | ✅ PASS |
| 6 | `can_view_ticket` com visibility_team_ids funciona | ✅ PASS |
| 7 | `can_view_ticket` com visibility_squad_ids usa `squad_memberships` (não `user_squad_memberships`) | ✅ PASS |
| 8 | `can_view_ticket` com squad membership soft-deleted não dá acesso | ✅ PASS |
| 9 | Times com `deleted_at IS NOT NULL` são ignorados em tree traversal | ✅ PASS |
| 10 | Squads com `deleted_at IS NOT NULL` são ignorados | ✅ PASS |

---

## Detalhes

### 1-2. get_team_member_ids

```sql
-- Função usa apenas existência (sem filtro is_active/left_at/deleted_at)
SELECT ARRAY_AGG(DISTINCT utm.user_id)
FROM user_team_memberships utm
WHERE utm.team_id = p_team_id;
```

- **Membro ativo:** Registro existe na tabela
- **Membro inativo:** Registro não existe (foi deletado)

### 3. get_leader_teams.member_count

```sql
COALESCE((
  SELECT COUNT(*) 
  FROM user_team_memberships utm 
  WHERE utm.team_id = t.id
), 0) as member_count
```

- Conta apenas registros existentes (correto para user_team_memberships)

### 4-5. check_scope_access

- **'team'**: Verifica existência em `user_team_memberships`
- **'squad'**: Verifica existência em `squad_memberships` com `deleted_at IS NULL`
- **'team_tree'**: Recursivo com `teams.deleted_at IS NULL`

### 6-8. can_view_ticket

```sql
-- Teams: existência
EXISTS (
  SELECT 1 FROM user_team_memberships utm
  WHERE utm.user_id = p_user_id
    AND utm.team_id = ANY(v_ticket.visibility_team_ids)
)

-- Squads: com soft delete
EXISTS (
  SELECT 1 FROM squad_memberships sm
  WHERE sm.user_id = p_user_id
    AND sm.squad_id = ANY(v_ticket.visibility_squad_ids)
    AND sm.deleted_at IS NULL
)
```

- **Corrigido:** Usa `squad_memberships` (não `user_squad_memberships`)
- **Corrigido:** Aplica filtro `deleted_at IS NULL`

### 9-10. Soft Delete em Teams/Squads

- Todas as funções com tree traversal filtram `deleted_at IS NULL`
- Squads inativos (deleted_at preenchido) são ignorados em visibility checks

---

## Validação SQL

```sql
-- Verificar que nenhuma função usa colunas inexistentes
SELECT 
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid) ILIKE '%utm.is_active%'
    OR pg_get_functiondef(p.oid) ILIKE '%user_squad_memberships%'
  );

-- Resultado esperado: 0 rows
```

---

## Resultado Final

**STATUS: ✅ PASS**

Todas as funções SQL foram corrigidas para usar as regras canônicas de membership ativo:
- `user_team_memberships`: existência = ativo
- `squad_memberships`: `deleted_at IS NULL` = ativo
- Referências a tabelas inexistentes (`user_squad_memberships`) foram corrigidas
- Referências a colunas inexistentes (`is_active`, `left_at`) foram removidas
