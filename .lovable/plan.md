# Adicionar "Pendências" à trilha "Seu check-in hoje" + ajustar tempo total

## Contexto

A trilha do Step 1 (`<CollaboratorCheckinTrail>`) lista 5 itens hoje: Indicadores → Projetos → Iniciativas → KRs → Reflexão e envio. Falta o item **Pendências** (step `decisions`), que existe no rito (entre KRs e Reflexão) e tem step próprio (`CollaboratorDecisionsStep`). Como consequência, o "Tempo estimado" também subdimensiona o rito.

Política canônica registrada: a trilha do Step 1 deve espelhar `STEP_ORDER` (`mem://features/rituals/collaborator-step1-order-mirrors-steps`). A omissão de `decisions` viola essa regra.

## Mudanças

### 1) `CollaboratorCheckinTrail.tsx` — função `computeTrailEta`

Acrescentar contribuição de pendências ao cálculo de ETA:

- Nova entrada em `ComputeEtaArgs`: `pendingDecisions?: number` (default 0).
- Nova linha no retorno: `decisions = Math.ceil(1 + 0.5 * Math.max(0, pendingDecisions))`.
  - Base 1 min + 0,5 min por item pendente — mesma régua já usada para KPIs/Projetos.
- `total` passa a somar `decisions`.

### 2) `CollaboratorContextStep.tsx`

- Importar `useMyPendingDecisions` (já existe e é usado no `CollaboratorDecisionsStep` e `CollaboratorSummary`).
- Buscar a contagem: `const { data: pendingDecisions = [] } = useMyPendingDecisions(effectiveUserId);` e derivar `pendingDecisionsCount = pendingDecisions.length`.
- Passar `pendingDecisions: pendingDecisionsCount` para `computeTrailEta`.
- Adicionar builder no map `builders`:
  ```ts
  decisions: () => ({
    label: 'Pendências',
    pendingCount: pendingDecisionsCount,
    summaryOverride:
      pendingDecisionsCount === 0
        ? 'Nada para resolver'
        : `${pendingDecisionsCount} item${pendingDecisionsCount > 1 ? 'ns' : ''} para resolver`,
    etaMinutes: eta.decisions,
  }),
  ```
- Atualizar deps do `useMemo` de `trailSteps` (incluir `pendingDecisionsCount` e `eta.decisions`).

A ordem na UI já vem certa porque `trailSteps` é gerado por `visibleStepOrder.map(...)` — o slot `decisions` cai naturalmente entre `checkin` e `reflection` conforme `STEP_ORDER`.

### 3) Teste

`src/modules/okrs/components/wizards/collaborator/__tests__/CollaboratorContextStep.test.tsx` (já mockando dependências) — adicionar mock leve de `useMyPendingDecisions` retornando `{ data: [] }` para não quebrar; assert que o item "Pendências" aparece quando há contagem >0.

## O que NÃO muda

- `STEP_ORDER` / `wizardSteps.ts` — ordem canônica intacta.
- `CollaboratorWeekActivity` (card "Sua semana até aqui") — Pendências não é "atividade entregue/pendente da semana", continua fora.
- `CollaboratorSummary` — já tem nav e seção de Pendências.
- ETA dos demais steps — fórmulas e bases inalteradas.

## Validação

- Abrir `/rituals/collaborator-checkin` e confirmar que a trilha mostra 6 itens na ordem: Indicadores → Projetos → Iniciativas → KRs → Pendências → Reflexão e envio.
- "Tempo estimado: ~X minutos" reflete a soma incluindo Pendências.
- Quando o usuário não tem pendências: linha aparece com "Nada para resolver" e ETA mínima de 1 min.
- TypeScript build limpo + suite existente do Context Step verde.
