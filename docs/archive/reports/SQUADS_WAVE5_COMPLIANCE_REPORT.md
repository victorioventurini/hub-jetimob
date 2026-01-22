# Squad Memberships - Wave 5 Compliance Report

**Data:** 2026-01-08  
**Executor:** Lovable AI  
**Status:** ✅ PASS

---

## Sumário Executivo

A Wave 5 normalizou a tabela `squad_memberships` para conformidade total com os padrões do Hub:

| Critério | Status |
|----------|--------|
| BU Scope Hardening | ✅ PASS |
| Identity Convention | ✅ PASS |
| RBAC (sem hardcode) | ✅ PASS |
| Soft Delete | ✅ PASS |
| RLS Policies | ✅ PASS |
| Triggers | ✅ PASS |
| Frontend Compliance | ✅ PASS |

---

## Parte A: Schema (DB)

### A1. Estrutura Final

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK |
| squad_id | uuid | NOT NULL | FK → squads.id |
| user_id | uuid | NOT NULL | **PROFILE_ID** → profiles.id |
| role | squad_role | NOT NULL | `product_owner`, `tech_lead`, `ux_ui_lead`, `member` |
| bu_id | uuid | **NOT NULL** | FK → bu_units.id ✅ |
| deleted_at | timestamptz | NULL | Soft delete ✅ |
| created_at | timestamptz | NOT NULL | Timestamp |
| updated_at | timestamptz | NOT NULL | Timestamp |

### A2. Índices

| Índice | Colunas |
|--------|---------|
| `squad_memberships_pkey` | (id) |
| `squad_memberships_squad_id_user_id_key` | (squad_id, user_id) UNIQUE |
| `idx_squad_memberships_bu_id` | (bu_id) ✅ |
| `idx_squad_memberships_user_bu` | (user_id, bu_id) ✅ |
| `idx_squad_memberships_squad_id` | (squad_id) |
| `idx_squad_memberships_user_id` | (user_id) |

### A3. Triggers

| Trigger | Função | Evento |
|---------|--------|--------|
| `trg_squad_membership_set_bu_id` | `set_squad_membership_bu_id()` | BEFORE INSERT |
| `trg_enforce_squad_membership_bu_scope` | `enforce_squad_membership_bu_scope()` | BEFORE INSERT/UPDATE |
| `update_squad_memberships_updated_at` | `update_updated_at_column()` | BEFORE UPDATE |

### A4. RLS Policies (Corrigidas)

| Policy | Operação | Condição |
|--------|----------|----------|
| BU members can view squad memberships | SELECT | `deleted_at IS NULL AND is_current_bu(bu_id) AND (user_has_bu_access(...) OR is_platform_admin(...))` |
| BU admins can insert squad memberships | INSERT | `is_bu_admin(...) OR is_platform_admin(...)` |
| BU admins can update squad memberships | UPDATE | `is_bu_admin(...) OR is_platform_admin(...)` |
| BU admins can delete squad memberships | DELETE | `is_bu_admin(...) OR is_platform_admin(...)` |

**Políticas Legadas Removidas:**
- ~~`squad_memberships_select` (USING true)~~ — **REMOVIDA** ⚠️
- ~~`squad_memberships_admin`~~ — **REMOVIDA**

---

## Parte B: Identidade

### B1. Coluna user_id

| Aspecto | Valor |
|---------|-------|
| Referencia | `profiles.id` ✅ |
| Tipo | PROFILE_ID (domínio) |
| FK Constraint | `squad_memberships_user_id_fkey` → profiles(id) |

**Conformidade:** A coluna `user_id` armazena `profiles.id`, seguindo a convenção de identidade do Hub.

### B2. Uso em Código

```typescript
// useSquads.ts - Correto
.select(`user:profiles!squad_memberships_user_id_fkey(id, display_name, ...)`)
```

---

## Parte C: Frontend

### C1. Hooks e Componentes

| Arquivo | Usa `useBuScopedSupabase`? | QueryKeys centralizadas? | Sem select('*')? |
|---------|---------------------------|--------------------------|------------------|
| `useSquads.ts` | ✅ | ✅ (parcial) | ⚠️ `squads.*` |
| `SquadSection.tsx` | Via hook | Via hook | Via hook |
| `SquadDetailDialog.tsx` | Via hook | Via hook | Via hook |
| `AddSquadMemberDialog.tsx` | Via hook | Via hook | Via hook |

**Nota:** O `useSquads` usa `select("*, squad_teams!inner...")` para squads, mas não para squad_memberships. Aceitável neste contexto pois squads tem poucos campos.

### C2. Troca de BU

- ✅ QueryKeys incluem `buId`
- ✅ `enabled: !!currentBu?.id` presente
- ✅ Hooks usam `useBuScopedSupabase()` que envia `x-current-bu-id`

---

## Parte D: Auditorias

| Audit | Resultado |
|-------|-----------|
| BU Scope | ✅ 0 críticos em squad_memberships |
| Identity | ✅ user_id → profiles.id confirmado |
| Overfetch | ⚠️ squads usa `*`, memberships usa campos explícitos |
| RBAC | ✅ Sem hardcode de roles |
| Pre-BU | ✅ Não usa useBuScopedSupabase em PRE-BU |

---

## Parte E: QA

Ver: [docs/qa/QA_SQUADS_WAVE5.md](./qa/QA_SQUADS_WAVE5.md)

| Área | Status |
|------|--------|
| Visualização | ✅ PASS |
| Gestão de Membros | ✅ PASS |
| BU Scope | ✅ PASS |
| Perfil do Usuário | ✅ PASS |
| Auditoria Técnica | ✅ PASS |

---

## Parte F: Documentação Atualizada

### TCR v2.11.1

- Adicionada seção `squad_memberships` com schema completo
- Documentado que `user_id` é PROFILE_ID
- Listados triggers e RLS policies
- Clarificada diferença de `user_team_memberships`

### DEVELOPMENT_STANDARDS v1.0.1

- Adicionada seção G.4 "Checklist Completo para Novas Tabelas Operacionais"
- `squad_memberships` como exemplo de implementação correta

---

## Parte G: Diferença squad_memberships vs user_team_memberships

| Aspecto | user_team_memberships | squad_memberships |
|---------|----------------------|-------------------|
| Propósito | Vínculo permanente usuário ↔ time | Papel em projeto/squad |
| Campos específicos | `is_primary` | `role` (PO, Tech Lead, etc.) |
| BU scope | Via team (indireto) | Direto (`bu_id` NOT NULL) |
| Soft delete | ❌ | ✅ (`deleted_at`) |
| Triggers | Nenhum específico | 2 triggers |
| Status | Legacy (avaliar normalização) | ✅ Normalizado |

**Conclusão:** Tabelas são **complementares**, não duplicadas.

---

## Riscos Remanescentes

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| SECURITY DEFINER views | Médio | Pré-existente, não relacionado a Wave 5 |
| `user_team_memberships` sem bu_id direto | Baixo | Avaliar em wave futura |
| `useSquads` usa `select("*")` para squads | Baixo | Squads tem poucos campos |

---

## Status Final

**Wave 5: ✅ PASS**

Todos os critérios atendidos:
- ✅ BU scope com `bu_id` NOT NULL + `is_current_bu()` + `user_has_bu_access()`
- ✅ Identity: `user_id` → `profiles.id`
- ✅ RBAC: Policies usam `is_bu_admin()`, sem hardcode
- ✅ Soft delete: `deleted_at` presente
- ✅ Triggers: `set_bu_id` + `enforce_bu_scope`
- ✅ Políticas legadas permissivas removidas
- ✅ Documentação atualizada (TCR v2.11.1, Standards v1.0.1)
