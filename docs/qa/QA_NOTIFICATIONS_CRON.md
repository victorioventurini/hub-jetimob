# QA: Sistema de Cron para Notificações

## Pré-requisitos

- [ ] `CRON_SECRET` configurado nas Edge Functions
- [ ] Edge Function `cron-dispatcher` deployada
- [ ] Integração `cron-job` visível no catálogo

## Testes de Segurança

### T1: Chamada sem header de autenticação
**Passos:**
1. Fazer POST para `https://<project>.supabase.co/functions/v1/cron-dispatcher`
2. Não incluir header `x-cron-secret`

**Resultado esperado:**
- Status: 401 Unauthorized
- Body: `{"error": "Unauthorized"}`

### T2: Chamada com secret incorreto
**Passos:**
1. Fazer POST para o endpoint
2. Incluir header `x-cron-secret: valor_errado`

**Resultado esperado:**
- Status: 401 Unauthorized
- Body: `{"error": "Unauthorized"}`

### T3: Chamada com secret correto
**Passos:**
1. Fazer POST para o endpoint
2. Incluir header `x-cron-secret: <secret-correto>`

**Resultado esperado:**
- Status: 200 OK
- Body contém: `success: true`, `outbox`, `health`, `duration_ms`

## Testes Funcionais

### T4: Processamento do Outbox
**Pré-condição:**
- Criar 3 itens em `notification_outbox` com status `pending`

**Passos:**
1. Executar o cron dispatcher com secret válido
2. Verificar tabela `notification_outbox`
3. Verificar tabela `cron_execution_logs`

**Resultado esperado:**
- Itens em `notification_outbox` com status `sent`
- Log criado em `cron_execution_logs` com `outbox_processed: 3`

### T5: Avaliação de Saúde
**Pré-condição:**
- Função RPC `evaluate_notification_health` disponível

**Passos:**
1. Executar o cron dispatcher
2. Verificar resposta

**Resultado esperado:**
- Campo `health` na resposta com contadores de alertas

### T6: Logging de Execução
**Passos:**
1. Executar o cron dispatcher múltiplas vezes
2. Acessar página `/hub/integrations/cron-job`

**Resultado esperado:**
- Histórico de execuções visível
- Métricas corretas (processed, sent, failed)
- Duration em ms exibido

## Testes de Interface

### T7: Página de Configuração
**Passos:**
1. Acessar `/hub/integrations`
2. Clicar em "cron-job.org"

**Resultado esperado:**
- Página carrega sem erros
- URL do endpoint visível
- Instruções de configuração legíveis
- Toggle de ativação funcional

### T8: Copiar URL
**Passos:**
1. Na página de config, clicar no botão de copiar URL

**Resultado esperado:**
- URL copiada para clipboard
- Toast de confirmação exibido

### T9: Toggle de Ativação
**Passos:**
1. Alternar switch de "Integração Ativa"

**Resultado esperado:**
- Estado persiste no banco
- Toast de confirmação

## Testes de Resiliência

### T10: CRON_SECRET não configurado
**Passos:**
1. Remover variável CRON_SECRET do ambiente
2. Chamar o endpoint

**Resultado esperado:**
- Status: 500
- Log de erro indicando misconfiguration

### T11: Falha no processamento de item
**Pré-condição:**
- Item no outbox com dados inválidos

**Passos:**
1. Executar cron dispatcher

**Resultado esperado:**
- Item com falha não trava execução
- Log mostra `outbox_failed` incrementado
- Outros itens processados normalmente

## Checklist Final

- [ ] T1 - PASS
- [ ] T2 - PASS
- [ ] T3 - PASS
- [ ] T4 - PASS
- [ ] T5 - PASS
- [ ] T6 - PASS
- [ ] T7 - PASS
- [ ] T8 - PASS
- [ ] T9 - PASS
- [ ] T10 - PASS
- [ ] T11 - PASS

## Aprovação

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| QA | | | |
| Dev | | | |
| PM | | | |
