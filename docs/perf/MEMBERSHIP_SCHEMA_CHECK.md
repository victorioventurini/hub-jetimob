# Membership Schema Check

**Data:** 2026-01-09  
**Versão:** 1.0

## 1. user_team_memberships

### Schema Real

| Column     | Type                     | Nullable |
|------------|--------------------------|----------|
| id         | uuid                     | NO       |
| user_id    | uuid                     | NO       |
| team_id    | uuid                     | NO       |
| is_primary | boolean                  | NO       |
| created_at | timestamp with time zone | NO       |
| updated_at | timestamp with time zone | NO       |

### Observações

- **NÃO EXISTE** coluna `is_active`
- **NÃO EXISTE** coluna `left_at`
- **NÃO EXISTE** coluna `deleted_at`
- Regra canônica: **membership existence = active** (se row existe, membro está ativo)
- Para remover um membro, basta deletar o registro

---

## 2. squad_memberships

### Schema Real

| Column     | Type                     | Nullable |
|------------|--------------------------|----------|
| id         | uuid                     | NO       |
| squad_id   | uuid                     | NO       |
| user_id    | uuid                     | NO       |
| role       | squad_member_role (enum) | NO       |
| created_at | timestamp with time zone | NO       |
| updated_at | timestamp with time zone | NO       |
| bu_id      | uuid                     | NO       |
| deleted_at | timestamp with time zone | YES      |

### Observações

- **EXISTE** coluna `deleted_at` para soft delete
- Regra canônica: **ativo = deleted_at IS NULL**
- Tabela correta: `squad_memberships` (NÃO `user_squad_memberships`)

---

## 3. teams

### Schema Real

| Column                | Type                     | Nullable |
|-----------------------|--------------------------|----------|
| id                    | uuid                     | NO       |
| name                  | text                     | NO       |
| description           | text                     | YES      |
| leader_user_id        | uuid                     | YES      |
| parent_team_id        | uuid                     | YES      |
| status                | team_status (enum)       | NO       |
| created_at            | timestamp with time zone | NO       |
| updated_at            | timestamp with time zone | NO       |
| deleted_at            | timestamp with time zone | YES      |
| bu_id                 | uuid                     | NO       |
| checkin_frequency     | text                     | NO       |
| checkin_day           | integer                  | NO       |
| checkin_deadline_hour | integer                  | NO       |

### Observações

- **EXISTE** coluna `deleted_at` para soft delete
- Regra: times com `deleted_at IS NOT NULL` devem ser ignorados

---

## 4. squads

### Schema Real

| Column      | Type                     | Nullable |
|-------------|--------------------------|----------|
| id          | uuid                     | NO       |
| name        | text                     | NO       |
| description | text                     | YES      |
| bu_id       | uuid                     | NO       |
| products    | text[]                   | NO       |
| status      | squad_status (enum)      | NO       |
| created_at  | timestamp with time zone | NO       |
| updated_at  | timestamp with time zone | NO       |
| deleted_at  | timestamp with time zone | YES      |

---

## 5. Problemas Detectados em Funções SQL

### get_team_member_ids(p_team_id uuid)
- **BUG:** Usa `utm.is_active = true` mas coluna NÃO EXISTE
- **FIX:** Remover filtro (existência = ativo)

### can_view_ticket
- **BUG:** Referencia `user_squad_memberships` mas tabela NÃO EXISTE
- **FIX:** Usar `squad_memberships` com `deleted_at IS NULL`

### get_leader_teams
- **BUG:** member_count não filtra nada (OK para user_team_memberships)
- **STATUS:** Correto (existência = ativo)

### check_scope_access
- **STATUS:** Correto para user_team_memberships (existência = ativo)
- **BUG POTENCIAL:** Caso 'squad' retorna false sempre (não implementado)

---

## 6. Regra Canônica de Membro Ativo

| Tabela                 | Regra de Ativo                    |
|------------------------|-----------------------------------|
| user_team_memberships  | Existência do registro            |
| squad_memberships      | `deleted_at IS NULL`              |
| teams                  | `deleted_at IS NULL`              |
| squads                 | `deleted_at IS NULL`              |

---

## Evidência

Query executada:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_team_memberships' 
ORDER BY ordinal_position;
```

Resultado confirma ausência de `is_active`, `left_at`, `deleted_at`.
