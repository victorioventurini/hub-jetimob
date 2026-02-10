# QA Checklist: BU Scope Security

Este documento descreve os testes manuais para validar a segurança do escopo de BU no Hub.

## Pré-requisitos

### Usuários de Teste

| Role | Email | BUs |
|------|-------|-----|
| Platform Admin | admin@jet.com | Todas |
| BU Admin | bu-admin@jet.com | BU A |
| Colaborador Multi-BU | user@jet.com | BU A, BU B |

### Ambiente

- Ambiente de staging/desenvolvimento
- DevTools do navegador abertos
- Console do Supabase disponível (opcional)

---

## Testes

### 1. Alternar BU e Criar Registro

**Objetivo:** Verificar que registros são criados na BU correta após alternar.

**Passos:**
1. Login como colaborador com 2 BUs
2. Selecionar BU A no seletor
3. Navegar para OKRs > Criar Objetivo de Time
4. Preencher dados e salvar
5. Verificar no banco: `SELECT bu_id FROM okr_team_objectives WHERE title = '...'`
6. Alternar para BU B
7. Criar outro objetivo
8. Verificar que o novo objetivo tem bu_id da BU B

**Resultado Esperado:**
- [x] Primeiro objetivo tem bu_id da BU A
- [x] Segundo objetivo tem bu_id da BU B

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 2. Injeção de bu_id Diferente via DevTools

**Objetivo:** Verificar que o banco bloqueia tentativas de inserir dados em outra BU.

**Passos:**
1. Login como colaborador da BU A
2. Abrir DevTools > Network
3. Iniciar criação de um OKR
4. Interceptar a request POST para o Supabase
5. Modificar o payload para incluir `bu_id` da BU B (ou BU inexistente)
6. Reenviar a request modificada

**Resultado Esperado:**
- [x] Request falha com erro `BU_SCOPE_VIOLATION` ou `MISSING_BU_ID`
- [x] Nenhum registro criado

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 3. Isolamento de Dados por BU

**Objetivo:** Verificar que usuário só vê dados da BU atual.

**Passos:**
1. Login como colaborador com 2 BUs
2. Na BU A, criar: 1 OKR, 1 Asset, 1 Ticket
3. Alternar para BU B
4. Verificar listagens de OKRs, Assets, Tickets

**Resultado Esperado:**
- [x] Registros da BU A não aparecem quando BU B está selecionada
- [x] Vice-versa também funciona

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 4. Platform Admin Acesso Total

**Objetivo:** Verificar que platform admin pode ver dados de qualquer BU.

**Passos:**
1. Login como platform admin
2. Verificar se consegue alternar entre BUs
3. Verificar se consegue ver dados de ambas as BUs

**Resultado Esperado:**
- [x] Admin consegue ver dados de todas as BUs

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 5. Scanner de Código (audit:bu)

**Objetivo:** Verificar que o scanner não encontra problemas críticos.

**Passos:**
1. Executar: `npm run audit:bu`
2. Revisar output

**Resultado Esperado:**
- [x] Zero findings críticos (INSERT/UPDATE/UPSERT sem bu_id)
- [x] Findings de SELECT são aceitáveis se RLS está ativo

**Output do Scanner:**
```
(colar output aqui)
```

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 6. Erro Amigável para Violação de Escopo

**Objetivo:** Verificar que erros de BU scope mostram mensagem clara.

**Passos:**
1. Forçar um erro de BU_SCOPE_VIOLATION (via DevTools ou banco)
2. Observar a mensagem de erro exibida

**Resultado Esperado:**
- [x] Mensagem clara em português: "Erro de escopo: Você não pode operar em dados de outra BU."
- [x] Não expõe detalhes técnicos do banco

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

### 7. Frontend Query BU Filter (v4.1.0)

**Objetivo:** Verificar que queries de listagem filtram por BU no frontend.

**Passos:**
1. Login como platform admin (acesso a múltiplas BUs)
2. Na BU A, navegar para KPIs → verificar que lista mostra apenas KPIs da BU A
3. Alternar para BU B → verificar que lista mostra apenas KPIs da BU B
4. Repetir para OKRs, Assets, Tickets, Teams
5. Verificar no DevTools > Network que as requests incluem filtro `bu_id=eq.{buId}`

**Resultado Esperado:**
- [x] Cada módulo lista apenas dados da BU ativa
- [x] Requests REST incluem filtro `bu_id` explícito
- [x] Nenhum dado cross-BU aparece mesmo para admins

**Status:** ⬜ Não testado | ✅ PASS | ❌ FAIL

---

## Resumo da Execução

| Data | Executor | PASS | FAIL | N/A |
|------|----------|------|------|-----|
| | | | | |

## Observações

(Adicionar observações e bugs encontrados aqui)

---

## Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-01-06 | Lovable | Versão inicial |
