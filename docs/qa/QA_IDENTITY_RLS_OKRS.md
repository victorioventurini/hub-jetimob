# QA Checklist: Identity RLS (OKRs e Outros)

**Data:** 2026-01-08  
**Status:** ✅ **PASS**

---

## 1. Cenários de OKRs

### 1.1 Check-ins

| Cenário | Esperado | Status |
|---------|----------|--------|
| Owner de KR consegue criar check-in | ✅ Permitido | PASS |
| Co-responsável consegue criar check-in | ✅ Permitido | PASS |
| Não-owner NÃO consegue criar check-in | ❌ Bloqueado | PASS |
| Usuário com mesmo auth.uid mas sem profile correto falha | ❌ Bloqueado | PASS |

### 1.2 Dependências

| Cenário | Esperado | Status |
|---------|----------|--------|
| Owner de KR pode gerenciar dependências | ✅ Permitido | PASS |
| Co-responsável pode gerenciar dependências | ✅ Permitido | PASS |
| Não-autorizado NÃO pode gerenciar | ❌ Bloqueado | PASS |

### 1.3 Iniciativas

| Cenário | Esperado | Status |
|---------|----------|--------|
| Owner pode atualizar/deletar iniciativa | ✅ Permitido | PASS |
| Líder do time pode atualizar/deletar iniciativa | ✅ Permitido | PASS |
| Não-owner/não-líder NÃO pode atualizar/deletar | ❌ Bloqueado | PASS |

### 1.4 Team Key Results

| Cenário | Esperado | Status |
|---------|----------|--------|
| Owner pode atualizar KR | ✅ Permitido | PASS |
| Co-responsável pode atualizar KR | ✅ Permitido | PASS |
| Líder do time pode gerenciar KRs do time | ✅ Permitido | PASS |
| Líder de outro time NÃO pode gerenciar | ❌ Bloqueado | PASS |

### 1.5 Team Objectives

| Cenário | Esperado | Status |
|---------|----------|--------|
| Líder do time pode gerenciar objetivos | ✅ Permitido | PASS |
| Owner pode cancelar objetivo (com permissão de time) | ✅ Permitido | PASS |
| Não-líder/não-owner NÃO pode gerenciar | ❌ Bloqueado | PASS |

---

## 2. Cenários de Tickets

### 2.1 Criação

| Cenário | Esperado | Status |
|---------|----------|--------|
| Usuário pode criar ticket com seu profile_id | ✅ Permitido | PASS |
| created_by_user_id = my_profile_id() é validado | ✅ Validado | PASS |

### 2.2 Atualização

| Cenário | Esperado | Status |
|---------|----------|--------|
| Criador pode atualizar ticket | ✅ Permitido | PASS |
| Owner pode atualizar ticket | ✅ Permitido | PASS |
| Admin da BU pode atualizar ticket | ✅ Permitido | PASS |
| Não-relacionado NÃO pode atualizar | ❌ Bloqueado | PASS |

### 2.3 Mensagens

| Cenário | Esperado | Status |
|---------|----------|--------|
| Autor pode editar sua mensagem | ✅ Permitido | PASS |
| Admin pode editar qualquer mensagem | ✅ Permitido | PASS |
| Não-autor NÃO pode editar mensagem | ❌ Bloqueado | PASS |

---

## 3. Cenários de KPIs

| Cenário | Esperado | Status |
|---------|----------|--------|
| Líder do time pode gerenciar KPIs do time | ✅ Permitido | PASS |
| Owner do KPI pode inserir valores | ✅ Permitido | PASS |
| Não-líder/não-owner NÃO pode gerenciar | ❌ Bloqueado | PASS |

---

## 4. Cenários de Teams

| Cenário | Esperado | Status |
|---------|----------|--------|
| Líder pode gerenciar memberships do time | ✅ Permitido | PASS |
| Não-líder NÃO pode gerenciar memberships | ❌ Bloqueado | PASS |

---

## 5. Cenários de Coaching Events

| Cenário | Esperado | Status |
|---------|----------|--------|
| Usuário pode ver seus próprios eventos | ✅ Permitido | PASS |
| Usuário pode inserir seus próprios eventos | ✅ Permitido | PASS |
| Admin pode ver todos os eventos | ✅ Permitido | PASS |
| user_id usa auth.users.id (auditável) | ✅ Correto | PASS |

---

## 6. Validação de Erros RLS

| Teste | Resultado |
|-------|-----------|
| Nenhum erro "violates row-level security" por ID incorreto | ✅ PASS |
| Comparações auth.uid() com profiles.id eliminadas | ✅ PASS |
| Todas policies usam my_profile_id() ou funções canônicas | ✅ PASS |

---

## 7. Funções Canônicas Validadas

| Função | Teste | Resultado |
|--------|-------|-----------|
| `my_profile_id()` | Retorna profiles.id correto | ✅ PASS |
| `is_team_leader(auth.uid(), team_id)` | Reconhece líder | ✅ PASS |
| `user_can_manage_team(auth.uid(), team_id)` | Autoriza gestão | ✅ PASS |

---

## 8. Resumo

| Módulo | Policies | Corrigidas | Pendentes |
|--------|----------|------------|-----------|
| OKRs | 10 | 10 | 0 |
| Tickets | 5 | 5 | 0 |
| KPIs | 2 | 2 | 0 |
| Teams | 1 | 1 | 0 |
| **Total** | **18** | **18** | **0** |

**Status Geral: ✅ PASS**

---

*Checklist validado em 2026-01-08*
