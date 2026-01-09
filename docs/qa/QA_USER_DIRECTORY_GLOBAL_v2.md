# QA - User Directory Global v2

> **Data:** 2026-01-09  
> **Status:** ✅ APROVADO

## Objetivo

Validar que TODOS os usuários cadastrados na BU aparecem nas listas de seleção/atribuição, independentemente de:
- Ter completado onboarding
- Ter feito primeiro acesso (user_id NULL)
- Ter bu_user_membership ativa

O único critério de exclusão é: `employment_status = 'terminated'` ou `deleted_at IS NOT NULL`.

---

## Cenários de Teste

### 1. Usuário Cadastrado Sem Login (profiles.user_id = NULL)

| Cenário | Descrição | Resultado | Status |
|---------|-----------|-----------|--------|
| 1.1 | Assets > Emprestar para | Aparece na lista | ✅ PASS |
| 1.2 | Tickets > Atribuir para | Aparece na lista | ✅ PASS |
| 1.3 | OKRs > Owner / Co-responsáveis | Aparece na lista | ✅ PASS |
| 1.4 | KPIs > Owner | Aparece na lista | ✅ PASS |
| 1.5 | Teams/Squads > Adicionar membro | Aparece na lista | ✅ PASS |
| 1.6 | Mentions @ (MentionInput) | Aparece no autocomplete | ✅ PASS |

### 2. Usuário Terminated

| Cenário | Descrição | Resultado | Status |
|---------|-----------|-----------|--------|
| 2.1 | Usuário com employment_status = terminated | NÃO aparece | ✅ PASS |
| 2.2 | Usuário com deleted_at preenchido | NÃO aparece | ✅ PASS |

### 3. Isolamento de BU

| Cenário | Descrição | Resultado | Status |
|---------|-----------|-----------|--------|
| 3.1 | Troca de BU não vaza dados | Profiles da BU anterior não aparecem | ✅ PASS |
| 3.2 | RLS aplicado via view | View filtra por bu_id automaticamente | ✅ PASS |

### 4. Audit Script

| Cenário | Descrição | Resultado | Status |
|---------|-----------|-----------|--------|
| 4.1 | audit-user-directory retorna 0 findings | Sem violações detectadas | ✅ PASS |

---

## View Canônica

```sql
CREATE VIEW v_bu_active_profiles WITH (security_invoker = true) AS
-- 1) Primary BU (sempre inclui, mesmo com user_id NULL)
SELECT ... FROM profiles p
WHERE p.employment_status <> 'terminated' AND p.deleted_at IS NULL

UNION ALL

-- 2) BUs adicionais via membership (apenas quando user_id existe)
SELECT ... FROM profiles p
JOIN bu_user_memberships m ON m.user_id = p.user_id
WHERE p.user_id IS NOT NULL AND m.bu_id <> p.bu_id
  AND p.employment_status <> 'terminated' AND p.deleted_at IS NULL;
```

**REGRA INQUEBRÁVEL:** Esta view NUNCA depende de bu_user_memberships para INCLUIR profiles.

---

## Health Check View

```sql
SELECT * FROM v_user_directory_health;
```

Valida que:
- `directory_visible_count >= profiles_active_visible`
- `profiles_visible_without_login > 0` (usuários sem login aparecem)

---

## Componentes Padronizados

| Componente | Uso |
|------------|-----|
| `BuUserSelect` | Seleção de usuário único |
| `BuUserMultiSelect` | Seleção de múltiplos usuários |
| `useBuUsersDirectory` | Hook canônico para queries |

---

## Audit Script

```bash
npx tsx scripts/audit-user-directory.ts
```

Detecta:
- INNER JOIN bu_user_memberships para listagem
- Queries diretas em profiles com filtros incorretos
- Uso de bu_user_memberships como filtro de pessoas

---

## Conclusão

**QA APROVADO** - Todos os usuários cadastrados na BU aparecem nas listas, independentemente de primeiro acesso, onboarding ou membership.
