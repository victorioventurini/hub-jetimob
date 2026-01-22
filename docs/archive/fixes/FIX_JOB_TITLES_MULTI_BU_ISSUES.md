# Fix: Problemas Pós-Migração Job Titles Multi-BU

**Data:** 2026-01-13  
**Versão:** Wave 2.6.1

---

## Problemas Identificados e Corrigidos

### 1. ✅ `useJobTitles()` não filtrava por BU

**Arquivo:** `src/modules/settings/hooks/useJobTitles.ts`

**Problema:** O hook buscava TODOS os job_titles sem filtrar por `bu_ids[]`, mostrando cargos de outras BUs na listagem admin.

**Correção:**
- Adicionado filtro `.contains("bu_ids", [buId])` para retornar apenas cargos da BU atual
- Atualizado `usage_count` para considerar:
  - `profiles.job_title_id` (cargo default)
  - `bu_user_memberships.job_title_id` (override por BU)

---

### 2. ✅ `useUserProfile()` não considerava override de membership

**Arquivo:** `src/hooks/useSharedData.ts`

**Problema:** O hook buscava `job_title_rel` do profile sem considerar o override de cargo na `bu_user_memberships`.

**Correção:**
- Agora verifica se existe override na membership da BU atual
- Prioridade: `membership.job_title_id` > `profile.job_title_id`
- Query key atualizada para incluir `buId` para invalidação correta

---

### 3. ✅ Query Key `profiles.detail` atualizada

**Arquivo:** `src/lib/queryKeys/auth.ts`

**Problema:** A query key não incluía `buId`, causando cache incorreto entre BUs.

**Correção:**
- Assinatura alterada de `detail(userId)` para `detail(userId, buId?)`

---

## Verificações Realizadas

### RLS Policies (OK)
As políticas RLS de `job_titles` já estavam corretas:
- `SELECT`: `EXISTS (SELECT 1 FROM unnest(job_titles.bu_ids) bid WHERE user_has_bu_access(auth.uid(), bid))`
- `INSERT`: Valida acesso + `is_current_bu`
- `UPDATE/DELETE`: Valida acesso via `user_has_bu_access`

---

## Itens Pendentes (Baixa Prioridade)

### Views Legadas
As views `v_bu_active_profiles` e `v_profiles_directory` fazem join com `job_titles` sem validar `bu_ids[]`. Isso é aceitável porque:
- As views usam `SECURITY INVOKER` e respeitam RLS
- O cargo exibido é o do profile, não o da membership (comportamento esperado para diretório)

### JetimoberDialog
A query busca `job_title_rel` do profile, mas isso é correto neste contexto pois:
- É usado para exibir o cargo atual do usuário antes de adicioná-lo à BU
- O cargo específico da BU é definido via `addToBuMutation`

---

## Testes Recomendados

1. [ ] Listar cargos em BU A - deve mostrar apenas cargos com `bu_ids` contendo A
2. [ ] Listar cargos em BU B - deve mostrar apenas cargos com `bu_ids` contendo B
3. [ ] Cargo compartilhado (A+B) deve aparecer em ambas as listagens
4. [ ] `usage_count` deve refletir uso em profiles + memberships
5. [ ] Trocar de BU e verificar que perfil exibe cargo correto da membership
