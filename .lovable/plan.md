## Diagnóstico (verificado)

Na BU Jetimob, hoje (29/07/2026):

- `2026-Q2` está `active` (terminou em 30/06), `2026-Q3` está `planning` (começou em 01/07).
- O módulo OKRs da Jetimob tem `config.auto_cycle_transition = true` — ou seja, a transição automática **está habilitada**.
- O `cron-dispatcher` roda a cada minuto com sucesso (logs `cron_execution_logs` = `success`), mas **nunca** aparece a linha `[cron-dispatcher] Cycle transitions: ...` nos logs — o RPC `auto_transition_cycle_statuses` retorna erro e o código ignora o erro silenciosamente.

**Causa raiz:** a tabela `cycles` tem o trigger `trg_enforce_bu_scope_cycles` (`enforce_bu_scope()`), que chama `current_bu_id()`. O cron executa como service role, sem `auth.uid()` — e `current_bu_id()` faz `RAISE EXCEPTION 'NO_BU_CONTEXT'`. Assim, todo `UPDATE cycles SET status = ...` disparado pelo cron falha. O resultado: nenhum ciclo transiciona automaticamente em nenhuma BU, e os rituais continuam puxando as OKRs do Q2.

## Correção proposta

### 1. Tornar `enforce_bu_scope()` seguro para contexto de serviço (migration)
Ajustar a função para: quando `auth.uid() IS NULL` (cron / SECURITY DEFINER interno) **e** `NEW.bu_id` já está preenchido, retornar `NEW` sem chamar `current_bu_id()`. Se `auth.uid() IS NULL` e `NEW.bu_id IS NULL`, continuar levantando erro. Nenhuma flexibilização para usuários autenticados — o isolamento de BU no caminho do app permanece idêntico.

### 2. Deixar o erro visível (edge function)
Em `supabase/functions/cron-dispatcher/index.ts`, logar `cycleErr` quando o RPC falhar (hoje o erro é descartado). Mesmo tratamento para os outros RPCs de manutenção que hoje só logam em caso de sucesso.

### 3. Corrigir os dados atuais da Jetimob
Após a migration, executar a transição: `2026-Q2` → `closed`, `2026-Q3` → `active` (o ciclo anual `2026` permanece `active`). Feito via chamada ao próprio `auto_transition_cycle_statuses()`, validando que o resultado retorna `{activated: 1, closed: 1}`.

### 4. Verificação
- Reconsultar `cycles` da Jetimob e confirmar Q2 `closed` / Q3 `active`.
- Confirmar nos logs do `cron-dispatcher` a linha `Cycle transitions` na execução seguinte.
- Conferir que outras BUs com ciclos vencidos não sofrem transição indevida (só transiciona quem tem `auto_cycle_transition = true` — hoje apenas Jetimob).

## Detalhes técnicos

- Nenhum `CHECK` constraint novo; apenas `CREATE OR REPLACE FUNCTION public.enforce_bu_scope()`.
- O trigger `validate_single_active_cycle` continua garantindo 1 ciclo ativo por tipo/BU — a ordem do RPC (fecha o ativo, depois ativa o novo) já respeita isso.
- Impacto lateral positivo: outros jobs de manutenção que escrevem em tabelas BU-scoped pelo cron deixam de falhar pelo mesmo motivo.
