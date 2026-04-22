# Política de Retenção — Hub da Jet

Centraliza as janelas de retenção dos dados operacionais e de telemetria.
Atualizado em **W1** do plano de performance (Wave 1).

## Janelas Padrão

| Tabela | Coluna | Retenção | Motivação |
|--------|--------|----------|-----------|
| `ai_agent_logs` | `created_at` | **60 dias** | Diagnóstico de falhas em agentes; suficiente para 2 ciclos mensais. |
| `perf_metrics_snapshots` | `collected_at` | **30 dias** | Telemetria do cron de performance; janela rolante mais que suficiente. |
| `cron_execution_logs` | `ran_at` | **14 dias** | Diagnóstico de jobs; volumes altos justificam janela curta. |
| `okr_wizard_sessions` (draft/abandoned) | `updated_at` | **30 dias** | Rascunhos de wizard que não viraram OKR. |
| `audit_logs` | `created_at` | **180 dias** | Conformidade — 6 meses cobre auditoria padrão. |
| `okr_audit_log` | (n/a hoje) | Mantida | Volume baixo (~1k linhas); revisitar se crescer. |

## Como funciona

A função `public.cleanup_old_logs()` é executada periodicamente pelo cron.
Defaults estão definidos no próprio corpo da função e são equivalentes às
janelas acima, então uma chamada sem parâmetros já aplica a política.

```sql
SELECT * FROM public.cleanup_old_logs();
-- Retorna { table_name, rows_deleted } por tabela.
```

Para rodar com janelas customizadas (ex.: limpar mais agressivamente em
incidentes):

```sql
SELECT * FROM public.cleanup_old_logs(
  p_agent_logs_days => 14,
  p_perf_days       => 7,
  p_cron_days       => 3,
  p_wizard_days     => 7,
  p_audit_logs_days => 90
);
```

## Histórico de mudanças

- **2026-04-22 (W1)**: Janelas de retenção atualizadas — perf de "tudo" para 30d,
  cron de 7d para 14d, ai_agent_logs de 14d para 60d. Drop de 18 índices
  não utilizados. ANALYZE manual nas tabelas críticas para atualizar
  estatísticas do planner.
