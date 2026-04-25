## Problema
O botão `ExternalLink` em `ContributingOkrCard.tsx` aponta para `/okrs/team/:id` — rota inexistente, gerando 404.

## Rota Canônica (confirmada no codebase)
`/okrs?view=team&team_id={uuid}` — usado consistentemente em `CycleProgressHeader`, `TeamKrCreationPage` e `ObjectiveQualityList`.

## Mudança
**Arquivo:** `src/modules/okrs/components/team-view/ContributingOkrCard.tsx` (linha 125)

```tsx
// Antes
<Link to={`/okrs/team/${objective.team_id}`} aria-label="Abrir time proprietário">

// Depois
<Link to={`/okrs?view=team&team_id=${objective.team_id}`} aria-label="Abrir time proprietário">
```

## Risco
Nenhum. Mudança trivial de string de URL alinhada ao padrão já usado em 3 outros pontos do módulo OKRs.