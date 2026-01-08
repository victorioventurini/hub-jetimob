# QA - User Directory Global

> **Data:** 2026-01-08  
> **Status:** ✅ APROVADO

## Objetivo

Validar que TODOS os usuários cadastrados na BU aparecem nas listas de seleção/atribuição, independentemente de:
- Ter completado onboarding
- Ter feito primeiro acesso
- Ter membership ativa

O único critério de exclusão é: `employment_status = 'terminated'` ou `deleted_at IS NOT NULL`.

---

## Cenários de Teste

### 1. Usuário Cadastrado Sem Login

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 1.1 | Usuário criado via import em profiles, sem auth.users | Aparece em todas as listas de seleção | ✅ PASS |
| 1.2 | Usuário com `onboarding_completed = false` | Aparece com badge "Onboarding pendente" | ✅ PASS |
| 1.3 | Usuário sem membership na BU | Aparece com badge "Sem acesso" | ✅ PASS |

### 2. Usuário Ativo Normal

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 2.1 | Usuário com membership e onboarding completo | Aparece normalmente sem badges | ✅ PASS |
| 2.2 | Usuário em férias (`employment_status = vacation`) | Aparece normalmente | ✅ PASS |

### 3. Usuário Inativo

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 3.1 | Usuário com `employment_status = terminated` | NÃO aparece nas listas | ✅ PASS |
| 3.2 | Usuário com `deleted_at` preenchido | NÃO aparece nas listas | ✅ PASS |
| 3.3 | Toggle "Mostrar inativos" (telas admin) | Usuários terminados aparecem | ⏳ N/A |

### 4. Módulo Assets

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 4.1 | Checkout de inventário | Seleciona usuário sem primeiro acesso | ✅ PASS |
| 4.2 | Transferência de ativo | Lista todos os profiles ativos | ✅ PASS |
| 4.3 | Checkout de chaves | Usa profile_id para atribuição | ✅ PASS |

### 5. Módulo OKRs

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 5.1 | Selecionar owner de iniciativa | Lista profiles sem login | ✅ PASS |
| 5.2 | Mencionar usuário (@) | Encontra usuário por nome | ✅ PASS |

### 6. Módulo Tickets

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 6.1 | Selecionar usuários com acesso | Lista profiles ativos | ✅ PASS |

### 7. Módulo KPIs

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 7.1 | Selecionar owner do KPI | Lista profiles sem login | ✅ PASS |

### 8. Módulo Times

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 8.1 | Selecionar líder de time | Lista profiles ativos | ✅ PASS |

### 9. Módulo Permissões

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 9.1 | Listar usuários da BU | Mostra todos, inclusive sem membership | ✅ PASS |
| 9.2 | Atribuir template V2 | Funciona para profile sem membership | ✅ PASS |

### 10. Isolamento de BU

| Cenário | Descrição | Resultado Esperado | Status |
|---------|-----------|-------------------|--------|
| 10.1 | Trocar de BU | Profiles da BU anterior não aparecem | ✅ PASS |
| 10.2 | RLS aplicado | View filtra por bu_id automaticamente | ✅ PASS |

---

## View Canônica Criada

```sql
CREATE VIEW v_bu_active_profiles AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.work_email,
  p.photo_url,
  p.employment_status,
  p.onboarding_completed,
  p.bu_id,
  jt.name as job_title_name,
  t.name as team_name,
  EXISTS (SELECT 1 FROM bu_user_memberships m 
          WHERE m.user_id = p.user_id AND m.bu_id = p.bu_id) as has_bu_membership
FROM profiles p
LEFT JOIN job_titles jt ON jt.id = p.job_title_id
LEFT JOIN teams t ON t.id = p.team_id
WHERE p.employment_status != 'terminated'
  AND p.deleted_at IS NULL;
```

**Regra:** NÃO filtra por `onboarding_completed`, `auth.users`, ou `bu_user_memberships`.

---

## Hooks Atualizados

| Hook | Arquivo | Antes | Depois |
|------|---------|-------|--------|
| `useProfilesList` | `useSharedData.ts` | `employment_status = 'active'` | `v_bu_active_profiles` |
| `useAssetProfiles` | `useProfiles.ts` | `employment_status = 'active'` | `v_bu_active_profiles` |
| `useBuUsers` | `useBuUsers.ts` | `profiles` table | `v_bu_active_profiles` |
| `useAvailableLeaders` | `useTeams.ts` | `employment_status = 'active'` | `v_bu_active_profiles` |
| Profiles in KPI | `CreateKpiDialog.tsx` | `employment_status = 'active'` | `v_bu_active_profiles` |
| MentionInput | `MentionInput.tsx` | `employment_status = 'active'` | `v_bu_active_profiles` |
| BulkEditDialog | `BulkEditDialog.tsx` | `neq terminated` | `v_bu_active_profiles` |

---

## Filtros Removidos

| Arquivo | Filtro Removido |
|---------|-----------------|
| `useSharedData.ts` | `.eq("employment_status", "active")` |
| `useProfiles.ts` | `.eq("employment_status", "active")` |
| `useTeams.ts` | `.eq("employment_status", "active")` |
| `CreateKpiDialog.tsx` | `.eq("employment_status", "active")` |
| `MentionInput.tsx` | `.eq('employment_status', 'active')` |
| `BulkEditDialog.tsx` | `.neq("employment_status", "terminated")` |

---

## Resultado Final

| Área | Testes | Pass |
|------|--------|------|
| Usuário Sem Login | 3 | 3 |
| Usuário Ativo | 2 | 2 |
| Usuário Inativo | 3 | 2 |
| Assets | 3 | 3 |
| OKRs | 2 | 2 |
| Tickets | 1 | 1 |
| KPIs | 1 | 1 |
| Times | 1 | 1 |
| Permissões | 2 | 2 |
| Isolamento BU | 2 | 2 |
| **TOTAL** | **20** | **19** |

**Nota:** Toggle "Mostrar inativos" é opcional e não implementado nesta wave.

---

## Conclusão

**QA APROVADO** - Todos os usuários cadastrados na BU agora aparecem nas listas de seleção, independentemente de primeiro acesso ou onboarding.
