# Migração do Cron de Notificações

## Contexto

O cron original para processamento do `notification_outbox` e `evaluate-notification-health` utilizava o `pg_net` (extensão PostgreSQL) para fazer chamadas HTTP diretamente do banco de dados. Esta abordagem falhou no Lovable Cloud pois a extensão `pg_net` não está disponível.

**Erro original:**
```
schema "net" does not exist
```

## Solução Implementada

### Arquitetura Anterior (Descontinuada)
```
PostgreSQL (cron.schedule) -> net.http_post() -> Edge Function
```

### Nova Arquitetura
```
cron-job.org (externo) -> Edge Function cron-dispatcher -> Supabase
```

## Componentes

### 1. Edge Function: `cron-dispatcher`
- **Localização:** `supabase/functions/cron-dispatcher/index.ts`
- **Responsabilidades:**
  - Validar header `x-cron-secret` contra variável de ambiente
  - Processar itens pendentes do `notification_outbox`
  - Executar avaliação de saúde do sistema de notificações
  - Logar execuções na tabela `cron_execution_logs`

### 2. Tabela: `cron_execution_logs`
- Armazena histórico de execuções
- Métricas: outbox processados, enviados, falhas
- Alertas de saúde criados/resolvidos
- Correlation ID para rastreabilidade

### 3. Integração no Hub
- **Página:** `/hub/integrations/cron-job`
- Exibe URL do endpoint e instruções de configuração
- Mostra histórico de execuções
- Permite teste manual

## Configuração Necessária

### 1. Variável de Ambiente
Adicionar `CRON_SECRET` nas Edge Functions:
```
CRON_SECRET=<string-aleatória-longa>
```

### 2. cron-job.org
1. Criar conta em https://cron-job.org
2. Criar novo cronjob:
   - **URL:** `https://<project-id>.supabase.co/functions/v1/cron-dispatcher`
   - **Método:** POST
   - **Header:** `x-cron-secret: <valor-do-secret>`
   - **Frequência:** `*/1 * * * *` (a cada 1 minuto)

## Segurança

1. **Autenticação via secret:** Toda chamada deve incluir o header `x-cron-secret`
2. **RLS na tabela de logs:** Apenas hub admins podem visualizar
3. **Service Role:** Edge function usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS

## Rollback

Para reverter à arquitetura anterior (se pg_net for disponibilizado):
1. Reativar os cron jobs no PostgreSQL
2. Desativar o cronjob no cron-job.org
3. Manter a Edge Function como fallback

## Histórico

| Data | Versão | Mudança |
|------|--------|---------|
| 2025-01 | 1.0 | Implementação inicial com pg_net |
| 2025-01 | 2.0 | Migração para cron externo (cron-job.org) |
