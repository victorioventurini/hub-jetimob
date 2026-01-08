# QA Checklist - Squads Cleanup (Wave 5)

## Objetivo
Validar que a normalização da tabela `squad_memberships` foi concluída com sucesso e que todas as funcionalidades de squads funcionam corretamente com BU scope.

---

## 1. Visualização de Squads

### 1.1 Lista de Squads por Time
- [x] Acessar página de detalhe de um time
- [x] Squads relacionados são exibidos corretamente
- [x] Contagem de membros está correta
- [x] Apenas squads da BU atual são exibidos

### 1.2 Detalhe do Squad
- [x] Clicar em um squad abre o dialog de detalhes
- [x] Líderes (PO, Tech Lead, UX Lead) são listados separadamente
- [x] Membros regulares são listados corretamente
- [x] Produtos vinculados são exibidos
- [x] Times vinculados são exibidos

### Status: [x] PASS / [ ] FAIL

---

## 2. Gestão de Membros

### 2.1 Adicionar Membro
- [x] Botão "Adicionar" visível para admins
- [x] Dialog de adicionar membro funciona
- [x] Seleção de usuário funciona (apenas usuários da BU)
- [x] Seleção de papel funciona
- [x] Membro é adicionado com sucesso
- [x] Lista atualiza após adição

### 2.2 Alterar Papel
- [x] Dropdown de papel visível para admins
- [x] Alteração de papel persiste corretamente
- [x] Toast de sucesso é exibido

### 2.3 Remover Membro
- [x] Botão de remover visível para admins
- [x] Remoção funciona (soft delete)
- [x] Membro removido não aparece mais na lista
- [x] Toast de sucesso é exibido

### Status: [x] PASS / [ ] FAIL

---

## 3. BU Scope

### 3.1 Isolamento de Dados
- [x] Squads de uma BU não aparecem em outra
- [x] Membros de squads respeitam BU scope
- [x] Troca de BU recarrega dados corretamente

### 3.2 RLS Policies
- [x] Usuários só veem squads da sua BU
- [x] Apenas admins podem adicionar/remover membros
- [x] Nenhum erro de permissão no console

### Status: [x] PASS / [ ] FAIL

---

## 4. Perfil do Usuário

### 4.1 Squads do Usuário
- [x] Página de perfil exibe squads do usuário
- [x] Papel do usuário em cada squad é exibido
- [x] Apenas squads ativos (não deletados) são mostrados

### Status: [x] PASS / [ ] FAIL

---

## 5. Auditoria Técnica

### 5.1 Schema
- [x] Coluna `bu_id` adicionada e NOT NULL
- [x] Coluna `deleted_at` adicionada
- [x] Índices criados (`idx_squad_memberships_bu_id`, `idx_squad_memberships_user_bu`)
- [x] Trigger `trg_squad_membership_set_bu_id` criado
- [x] Trigger `trg_enforce_squad_membership_bu_scope` criado

### 5.2 RLS Policies
- [x] Policy SELECT com `deleted_at IS NULL` e `is_current_bu(bu_id)`
- [x] Policy INSERT/UPDATE/DELETE para BU admins
- [x] `is_platform_admin` como fallback em todas
- [x] Políticas legadas permissivas removidas (`squad_memberships_select`, `squad_memberships_admin`)

### 5.3 Build
```bash
npm run build
```
- [x] Build passa sem erros de tipo

### Status: [x] PASS / [ ] FAIL

---

## Resultado Final

| Área | Status |
|------|--------|
| Visualização | ✅ PASS |
| Gestão de Membros | ✅ PASS |
| BU Scope | ✅ PASS |
| Perfil do Usuário | ✅ PASS |
| Auditoria Técnica | ✅ PASS |

**Status Geral:** [x] PASS / [ ] FAIL

**Data:** 2026-01-08
**Executor:** Lovable AI

---

## Notas
- Tabela `squad_memberships` normalizada com `bu_id` e `deleted_at`
- Soft delete implementado (update `deleted_at` ao invés de DELETE)
- Triggers garantem consistência de `bu_id`
- RLS policies atualizadas para usar `bu_id` direto (sem join)
