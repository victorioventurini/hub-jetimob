---
name: Collaborator Step 1 — Snapshot e trilha espelham STEP_ORDER
description: Snapshot e trilha do Step 1 do Check-in Individual derivam ordem de STEP_ORDER (SSOT em wizardSteps.ts). Reordenar STEP_ORDER propaga automaticamente.
type: feature
---

# Collaborator Check-in Step 1 — Ordem Espelhada

## Regra
A ordem das linhas no `<CollaboratorSnapshot>` e dos itens em
`<CollaboratorCheckinTrail>` DEVE espelhar a sequência real dos steps do
rito, definida em
`src/modules/okrs/components/wizards/collaborator/wizardSteps.ts` (`STEP_ORDER`).

Sequência canônica atual:
1. Indicadores (KPIs)
2. Projetos
3. Iniciativas
4. KRs
5. Reflexão e envio (apenas trilha)

## Implementação
- `wizardSteps.ts` é SSOT consumida por `CollaboratorCheckinPage` e
  `CollaboratorContextStep`.
- O Step 1 recebe `visibleStepOrder` (filtro dinâmico já aplicado pela página)
  e mapeia esse array para construir os itens da trilha — **nunca hardcode**.
- O snapshot tem 4 linhas fixas (KPIs, Projetos, Iniciativas, KRs) na ordem
  acima; reordenar exige editar `CollaboratorSnapshot.tsx` E `STEP_ORDER`
  juntos.

## Sinal de iniciativas
`useCollaboratorInitiativesSignal(effectiveUserId, cycleId)` reutiliza o mesmo
filtro de `CollaboratorInitiativesStep` (owner OR contributor, ciclo ativo,
soft-deletes filtrados). Projeção mínima, cache `'opening-signal'`.
