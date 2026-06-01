## Objetivo

Tornar o motivo do bloqueio do Pré-MBR explícito via toast, complementando a exibição inline já existente em `MbrPreDataValidationStep`. Hoje os motivos aparecem em cada linha de pendência, mas o líder não recebe feedback ativo quando:

1. tenta avançar e o botão está desabilitado (não há clique → nenhum toast);
2. registra um valor de KPI e ele continua pendente (ex.: salvou em `2026-05`, mas o Pré-MBR é de `2026-04`).

## Mudanças (apenas UI, sem alterar regra de negócio)

### 1. `MbrPreDataValidationStep.tsx`

- **Toast ao tentar avançar com pendências**: trocar o `primaryDisabled` por um handler que, se `totalPending > 0`, dispara `toast.error` com a contagem e até 3 motivos resumidos (ex.: `MRR Novas Funcionalidades — Sem valor consolidado para 2026-04`). Manter o botão visualmente em estado bloqueado (`aria-disabled`) mas clicável para emitir o toast; quando `totalPending === 0`, comporta-se normalmente.
- **Toast pós-registro de KPI**: em `handleKpiDialogChange`, após invalidar as queries e elas reassentarem, comparar o conjunto de `kpisPending` antes/depois (via `useRef` do snapshot). Se o KPI recém-resolvido continuar em `kpisPending`, emitir `toast.warning` com o motivo retornado por `kpiReasonLabel` (ex.: explicando que o valor precisa ser do mês `referenceMonth`).
- **Toast pós-check-in de KR**: mesma lógica em `handleKrDialogChange` usando `krReasonLabel`.

### 2. Helpers

- Extrair uma função `summarizePendings(kpisPending, krsPending, referenceMonth)` no próprio arquivo (sem novo módulo) para montar a mensagem do toast de avanço, reutilizando `kpiReasonLabel` / `krReasonLabel` já existentes.

## Não muda

- Lógica de detecção de pendências (`useMbrPreValidationData`).
- Regras de gate, RLS, queries, snapshots mensais.
- Comportamento do super admin (skip continua disponível).
- Layout dos cards e badges.

## Validação

- BU Jetimob, usuário `nicolas@jetimob.com`, Pré-MBR `2026-04`:
  - Botão "Resolver pendências (N)" → ao clicar, toast lista `MRR Novas Funcionalidades — Sem valor consolidado para 2026-04`.
  - Registrar valor no mês errado (ex.: `2026-05`) → toast warning explicando que o mês de referência é `2026-04`.
  - Registrar valor correto em `2026-04` → pendência some, sem toast de erro, botão habilita para "Iniciar Pré-MBR".
