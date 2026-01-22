# Codebase Hygiene Wave 5 Report - Squads Cleanup

**Data:** 2026-01-08  
**Executor:** Lovable AI  
**Status:** ✅ COMPLETO

---

## Objetivo

Avaliar, higienizar e normalizar a tabela `squad_memberships` garantindo modelo consistente com BU scope, eliminação de redundâncias e código mais simples.

---

## 1. Auditoria de Uso

### 1.1 Database

| Atributo | Antes | Depois |
|----------|-------|--------|
| `bu_id` | ❌ Ausente (via join) | ✅ Presente (NOT NULL) |
| `deleted_at` | ❌ Ausente | ✅ Presente |
| Índices | ❌ Nenhum específico | ✅ `idx_squad_memberships_bu_id`, `idx_squad_memberships_user_bu` |
| RLS | ⚠️ Via join com squads | ✅ Direto via `bu_id` |
| Triggers | ❌ Nenhum | ✅ `set_bu_id`, `enforce_bu_scope` |

**Registros na tabela:** 0 (migração trivial)

### 1.2 Frontend

| Arquivo | Uso | Ação |
|---------|-----|------|
| `src/modules/teams/hooks/useSquads.ts` | CRUD completo | ✅ Atualizado |
| `src/modules/teams/components/SquadSection.tsx` | READ | ✅ Inalterado |
| `src/modules/teams/components/SquadDetailDialog.tsx` | READ | ✅ Inalterado |
| `src/modules/teams/components/AddSquadMemberDialog.tsx` | WRITE | ✅ Inalterado (usa hook) |
| `src/hooks/usePublicProfile.ts` | READ | ✅ Atualizado |

---

## 2. Decisão Arquitetural

**Opção escolhida:** B — MANTER e NORMALIZAR

**Justificativa:**
1. `squad_memberships` tem propósito distinto de `user_team_memberships`
   - `user_team_memberships`: vínculo usuário ↔ time (is_primary)
   - `squad_memberships`: papel específico em squad (PO, Tech Lead, UX Lead, member)
2. Feature ativa com CRUD completo em uso
3. 0 registros = migração trivial
4. Arquitetura funcional, faltava apenas normalização

---

## 3. Implementação

### 3.1 Migration SQL

```sql
-- Colunas adicionadas
ALTER TABLE squad_memberships ADD COLUMN bu_id uuid NOT NULL;
ALTER TABLE squad_memberships ADD COLUMN deleted_at timestamptz;

-- Índices
CREATE INDEX idx_squad_memberships_bu_id ON squad_memberships(bu_id);
CREATE INDEX idx_squad_memberships_user_bu ON squad_memberships(user_id, bu_id);

-- Triggers
CREATE TRIGGER trg_squad_membership_set_bu_id
  BEFORE INSERT ON squad_memberships
  FOR EACH ROW EXECUTE FUNCTION set_squad_membership_bu_id();

CREATE TRIGGER trg_enforce_squad_membership_bu_scope
  BEFORE INSERT OR UPDATE ON squad_memberships
  FOR EACH ROW EXECUTE FUNCTION enforce_squad_membership_bu_scope();
```

### 3.2 RLS Policies

| Policy | Operação | Condição |
|--------|----------|----------|
| BU members can view | SELECT | `deleted_at IS NULL AND user_has_bu_access(uid, bu_id)` |
| BU admins can insert | INSERT | `is_bu_admin(uid, bu_id)` |
| BU admins can update | UPDATE | `is_bu_admin(uid, bu_id)` |
| BU admins can delete | DELETE | `is_bu_admin(uid, bu_id)` |

### 3.3 Código Atualizado

**useSquads.ts:**
- `useAddSquadMember`: agora passa `bu_id` explicitamente
- `useRemoveSquadMember`: usa soft delete (`deleted_at`)

**usePublicProfile.ts:**
- `useUserSquads`: filtra `deleted_at IS NULL`, queryKey inclui buId

---

## 4. Cleanup

### Removido
- Nada removido (tabela mantida e normalizada)

### Corrigido
- RLS policies não mais dependem de join com `squads`
- Soft delete implementado corretamente
- QueryKeys incluem `currentBu.id`

---

## 5. Comparação: user_team_memberships vs squad_memberships

| Aspecto | user_team_memberships | squad_memberships |
|---------|----------------------|-------------------|
| Propósito | Vínculo usuário ↔ time | Vínculo usuário ↔ squad |
| Campos específicos | `is_primary` | `role` (PO, Tech Lead, etc.) |
| BU scope | Indireto (via team) | Direto (`bu_id`) |
| Soft delete | ❌ | ✅ (`deleted_at`) |
| Status | Manter | Manter (normalizado) |

---

## 6. Riscos Remanescentes

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| SECURITY DEFINER views | Médio | Pré-existente, não relacionado a Wave 5 |
| Leaked password protection | Baixo | Configuração de Auth, não DB |

---

## 7. Próximos Passos

1. ✅ Wave 5 completa
2. Considerar adicionar `bu_id` a `user_team_memberships` em wave futura
3. Avaliar consolidação de triggers de enforce_bu_scope

---

## Status Final

**Wave 5:** ✅ PASS

| Critério | Status |
|----------|--------|
| Modelo simples e explícito | ✅ |
| BU scope direto | ✅ |
| RLS sem joins | ✅ |
| Soft delete | ✅ |
| Código atualizado | ✅ |
| Build sem erros | ✅ |
