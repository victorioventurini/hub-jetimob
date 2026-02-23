

## Recuperacao do Check-in de Marketing + Correcao de Tabelas na Edge Function

### Problema Encontrado Durante Investigacao

Alem da sessao ausente no banco, a Edge Function `team-checkin-summary` referencia **2 tabelas que nao existem**:

| Referencia na Edge Function | Tabela Real no Banco |
|---|---|
| `okr_cycles` (linha 363) | `cycles` |
| `okr_objectives` (linha 381) | `okr_team_objectives` |

Se invocarmos a Edge Function sem corrigir isso, ela falhara no carregamento de dados.

### Plano de Execucao (3 passos)

**Passo 1: Corrigir Edge Function `team-checkin-summary/index.ts`**

Atualizar as referencias de tabelas no `loadTeamData`:
- Linha 363: `okr_cycles` -> `cycles`  
- Linha 381-389: `okr_objectives` -> `okr_team_objectives`, ajustar campo de KRs de `okr_key_results` para `okr_team_key_results`, e campo de join de `owner_team_id` para `team_id`

Deploy automatico apos a alteracao.

**Passo 2: Criar sessao retroativa via SQL migration**

Inserir registro em `okr_wizard_sessions` com os dados confirmados:

```text
INSERT INTO okr_wizard_sessions (
  bu_id,          -- a0000000-0000-0000-0000-000000000001
  wizard_type,    -- 'team_checkin'
  team_id,        -- c8e5d7a7-0b36-4910-bdf1-6cc912f849fe (Marketing)
  cycle_id,       -- 15b092b9-86f1-4cfd-97e1-62d2026c42e0 (2026-Q1)
  started_by,     -- 110f72b1-ea51-4d31-8235-43aff585022e (Vitor Severo - profile_id)
  status,         -- 'completed'
  completed_at,   -- now()
  summary_sent_at -- NULL (permite envio)
)
```

**Passo 3: Invocar Edge Function via curl**

Chamar `team-checkin-summary` com o `sessionId` recem-criado para disparar o e-mail de resumo aos membros do time Marketing.

### Dados Confirmados

| Campo | Valor |
|---|---|
| BU ID | `a0000000-0000-0000-0000-000000000001` |
| Team (Marketing) | `c8e5d7a7-0b36-4910-bdf1-6cc912f849fe` |
| Cycle (2026-Q1) | `15b092b9-86f1-4cfd-97e1-62d2026c42e0` |
| Vitor profile_id | `110f72b1-ea51-4d31-8235-43aff585022e` |
| Tabela `okr_wizard_sessions` | Existe com 17 colunas, atualmente vazia |

### Conformidade

- **Identity**: Usa `profile_id` para `started_by` (conforme IDENTITY_CONVENTION)
- **BU Scope**: Insert inclui `bu_id` (correto)
- **Edge Function Standard**: Usa `withMiddleware` com `requireAuth` + `requireBu` (padrao v4)
- **Idempotencia**: `summary_sent_at` garante que o e-mail nao sera enviado em duplicata
- **Tabelas corrigidas**: `cycles` e `okr_team_objectives` sao os nomes reais no banco

