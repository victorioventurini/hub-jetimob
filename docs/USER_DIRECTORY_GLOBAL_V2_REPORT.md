# User Directory Global v2 Report

> **Data:** 2026-01-09  
> **Status:** ✅ CONCLUÍDO

---

## Executive Summary

Correção global e definitiva do problema onde usuários "sem primeiro login" (profiles.user_id NULL) desapareciam de selects/listas por dependerem de bu_user_memberships.

---

## Regra Global (Inquebrável)

1. Listas de usuários internos devem ser baseadas em **profiles** (domínio), não em memberships (auth)
2. Usuário deve aparecer mesmo com `profiles.user_id = NULL`
3. Único motivo para não aparecer: `employment_status = terminated` ou `deleted_at IS NOT NULL`
4. `bu_user_memberships` usado apenas para validar acesso ao Hub, nunca para filtrar existência

---

## 1. View Canônica: v_bu_active_profiles

```sql
CREATE VIEW public.v_bu_active_profiles
WITH (security_invoker = true) AS

-- 1) Primary BU row (sempre inclui, mesmo com user_id NULL)
SELECT
  p.id, p.user_id, p.display_name, ...
  p.bu_id,
  EXISTS (SELECT 1 FROM bu_user_memberships m 
          WHERE m.user_id = p.user_id AND m.bu_id = p.bu_id) AS has_bu_membership
FROM profiles p
WHERE p.employment_status <> 'terminated' AND p.deleted_at IS NULL

UNION ALL

-- 2) BUs adicionais via membership (apenas quando user_id existe)
SELECT ... FROM profiles p
JOIN bu_user_memberships m ON m.user_id = p.user_id
WHERE p.user_id IS NOT NULL AND m.bu_id <> p.bu_id
  AND p.employment_status <> 'terminated' AND p.deleted_at IS NULL;

COMMENT ON VIEW public.v_bu_active_profiles IS
'REGRA INQUEBRÁVEL: Esta view NUNCA depende de membership para INCLUIR profiles.';
```

---

## 2. Health Check View

```sql
CREATE VIEW public.v_user_directory_health AS
SELECT
  bu_id,
  bu_name,
  total_profiles,
  profiles_without_user_id,
  profiles_terminated,
  profiles_active_visible,
  profiles_visible_without_login,
  directory_visible_count
FROM ... ;
```

Use para validar: `directory_visible_count >= profiles_active_visible`

---

## 3. Componentes Padronizados

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `BuUserSelect` | `src/components/selects/BuUserSelect.tsx` | Seleção de usuário único |
| `BuUserMultiSelect` | `src/components/selects/BuUserMultiSelect.tsx` | Seleção de múltiplos usuários |
| `useBuUsersDirectory` | `src/hooks/useBuUsersDirectory.ts` | Hook canônico |

---

## 4. Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/selects/MultiUserSelect.tsx` | Migrado para useBuUsersDirectory |
| `src/components/selects/BuUserSelect.tsx` | **CRIADO** - componente canônico |
| `src/components/selects/BuUserMultiSelect.tsx` | **CRIADO** - componente canônico |
| `scripts/audit-user-directory.ts` | **CRIADO** - audit script |

---

## 5. Audit Script

```bash
npx tsx scripts/audit-user-directory.ts
```

Detecta violações:
- `FROM profiles INNER JOIN bu_user_memberships` em views
- Queries diretas em profiles com filtros de employment_status
- Uso de bu_user_memberships como filtro de pessoas

---

## 6. QA Results

| Check | Status |
|-------|--------|
| Usuários sem login aparecem em Assets | ✅ PASS |
| Usuários sem login aparecem em Tickets | ✅ PASS |
| Usuários sem login aparecem em OKRs | ✅ PASS |
| Usuários sem login aparecem em KPIs | ✅ PASS |
| Usuários sem login aparecem em Teams | ✅ PASS |
| Usuários sem login aparecem em Mentions | ✅ PASS |
| Terminated não aparece | ✅ PASS |
| Isolamento de BU | ✅ PASS |
| Audit script 0 findings | ✅ PASS |

---

## 7. Prevenção

Adicionado ao checklist de PR (DEVELOPMENT_STANDARDS.md):
- [ ] User directory queries usam `v_bu_active_profiles`
- [ ] Nenhum INNER JOIN em bu_user_memberships para listagem
- [ ] `npx tsx scripts/audit-user-directory.ts` retorna 0

---

## Changelog

| Tipo | Descrição |
|------|-----------|
| UPDATE | `v_bu_active_profiles` - comentário de regra inquebrável |
| CREATE | `v_user_directory_health` - view de health check |
| CREATE | `BuUserSelect` - componente canônico |
| CREATE | `BuUserMultiSelect` - componente canônico |
| CREATE | `audit-user-directory.ts` - script de auditoria |
| UPDATE | `MultiUserSelect` - migrado para hook canônico |
| CREATE | `QA_USER_DIRECTORY_GLOBAL_v2.md` |
| CREATE | `USER_DIRECTORY_GLOBAL_V2_REPORT.md` |

---

**Status Final:** ✅ CONCLUÍDO
