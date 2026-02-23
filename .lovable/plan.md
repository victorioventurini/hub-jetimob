

## Recuperacao do Check-in de Marketing: Passo 2 e 3

### Status Atual

- Passo 1 (correcao da Edge Function): CONCLUIDO e deployado com sucesso
- Passo 2 (criar sessao retroativa): PENDENTE
- Passo 3 (invocar Edge Function): PENDENTE

### Problema

Nao tenho acesso direto a escrita no banco (o tool `read-query` e somente leitura). Para contornar isso, vou criar uma Edge Function temporaria de recuperacao.

### Plano

**Arquivo unico: `supabase/functions/recover-checkin-session/index.ts`**

Uma Edge Function temporaria que:
1. Verifica se a sessao ja existe (idempotente)
2. Se nao, insere um registro em `okr_wizard_sessions` com status `completed`
3. Invoca `team-checkin-summary` internamente para disparar o e-mail

Dados hardcoded (confirmados):

| Campo | Valor |
|---|---|
| bu_id | `a0000000-0000-0000-0000-000000000001` |
| team_id | `c8e5d7a7-0b36-4910-bdf1-6cc912f849fe` |
| cycle_id | `15b092b9-86f1-4cfd-97e1-62d2026c42e0` |
| started_by | `110f72b1-ea51-4d31-8235-43aff585022e` |

**Apos execucao**: Deploy, invocar via `curl_edge_functions`, verificar logs, e entao **deletar a funcao** com `delete_edge_functions`.

### Conformidade

- Usa `createServiceClient` do `_shared/client.ts` (padrao v4)
- Usa `corsHeaders` do `_shared/cors.ts`
- Identity: `started_by` usa `profile_id` (conforme IDENTITY_CONVENTION)
- BU Scope: Include `bu_id` no insert e `x-current-bu-id` na invocacao
- Idempotente: Verifica existencia antes de inserir
- Temporaria: Sera deletada apos uso

