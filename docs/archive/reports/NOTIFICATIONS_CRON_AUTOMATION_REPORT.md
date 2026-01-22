# Relatório: Automação do Cron de Notificações

**Data:** Janeiro 2025  
**Status:** ✅ Implementado

## Resumo Executivo

Migração do sistema de cron de notificações do `pg_net` (não disponível no Lovable Cloud) para um scheduler externo (cron-job.org) com Edge Function dedicada.

## Mudanças Implementadas

### 1. Remoção do Cron PostgreSQL
- ❌ Cron jobs usando `net.http_post` não são mais utilizados
- ✅ Nova arquitetura independente de extensões PostgreSQL

### 2. Edge Function: cron-dispatcher
**Arquivo:** `supabase/functions/cron-dispatcher/index.ts`

**Funcionalidades:**
- Autenticação via header `x-cron-secret`
- Processamento do `notification_outbox`
- Avaliação de saúde (health check)
- Logging estruturado com correlation_id
- Persistência de métricas em `cron_execution_logs`

**Segurança:**
- Rejeita chamadas sem secret válido (401)
- Usa service role para operações no banco
- Não expõe dados sensíveis em logs

### 3. Integração no Hub
**Página:** `/hub/integrations/cron-job`

**Features:**
- Toggle de ativação
- URL do endpoint copiável
- Instruções passo a passo
- Histórico de execuções (últimas 10)
- Métricas de sucesso/falha
- Botão de teste manual

### 4. Tabela de Logs
**Tabela:** `cron_execution_logs`

**Campos:**
- `ran_at` - Timestamp da execução
- `status` - success/error
- `duration_ms` - Tempo de execução
- `outbox_processed/sent/failed` - Métricas do outbox
- `health_alerts_created/resolved` - Métricas de saúde
- `correlation_id` - Rastreabilidade

**RLS:** Apenas hub admins podem visualizar

### 5. Catálogo de Integrações
- Adicionada entrada `cron-job` ao `hub_integrations_catalog`
- Ícone: clock (indigo #4F46E5)
- Suporta apenas configuração global

## Configuração do Scheduler Externo

### cron-job.org (Recomendado)

1. **Criar conta:** https://cron-job.org (gratuito)
2. **Novo cronjob:**
   - URL: `https://oiwnghihyqdsinouwmga.supabase.co/functions/v1/cron-dispatcher`
   - Método: POST
   - Header: `x-cron-secret: <seu-secret>`
3. **Frequência:** `*/1 * * * *` (cada minuto)
4. **Ativar**

### Alternativas
- GitHub Actions (workflow scheduled)
- Cloudflare Workers (cron triggers)
- AWS EventBridge

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `CRON_SECRET` | Secret para autenticação | ✅ Sim |
| `SUPABASE_URL` | URL do projeto | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Auto |

## Métricas e Observabilidade

### Logs Disponíveis
- Supabase Edge Function logs
- Tabela `cron_execution_logs`
- cron-job.org dashboard

### Alertas Recomendados
- Falhas consecutivas (> 3)
- Latência alta (> 10s)
- Backlog crescente no outbox

## QA Status

Consultar: `docs/qa/QA_NOTIFICATIONS_CRON.md`

| Categoria | Status |
|-----------|--------|
| Segurança | ⏳ Pendente |
| Funcional | ⏳ Pendente |
| Interface | ⏳ Pendente |
| Resiliência | ⏳ Pendente |

## Próximos Passos

1. [ ] Configurar `CRON_SECRET` nas env vars
2. [ ] Criar conta no cron-job.org
3. [ ] Configurar cronjob conforme instruções
4. [ ] Executar QA completo
5. [ ] Monitorar por 24h

## Rollback

Em caso de problemas:
1. Desativar cronjob no cron-job.org
2. Processar outbox manualmente via UI
3. Investigar logs

## Contato

- **Owner:** Time de Plataforma
- **Slack:** #hub-notifications
