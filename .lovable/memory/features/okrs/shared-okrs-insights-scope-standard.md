---
name: Shared OKRs insights — scope standard
description: Numerador (sharedOkrsCount) e denominador (totalOkrsCount) DEVEM vir do mesmo escopo (teamId+year). Senão geram "300% colaborativas".
type: feature
---

# Shared OKRs Insights — escopo consistente

## Regra
`SharedOkrInsights` calcula percentual de colaboração como `shared / total`.
**Numerador e denominador DEVEM vir do mesmo escopo** (mesma BU, mesmo time
quando aplicável, mesmo ano/ciclo).

## Bug histórico (2026-04-25)

- `useSharedOkrsSummary` fazia `select * from v_shared_okrs_summary` sem filtros → trazia **todos** os shared OKRs da BU.
- `OkrDashboardPage` passava esse total como `sharedOkrsCount` (3 — BU inteira) e `displayObjectives.length` como `totalOkrsCount` (1 — só o time filtrado).
- Resultado: insight "300% das OKRs são colaborativas" no dashboard de Tecnologia que tinha 1 OKR.

## Padrão correto

```ts
// Hook aceita escopo
useSharedOkrsInsights({ teamId, year })

// Numerador e denominador no mesmo escopo
<SharedOkrInsights
  sharedOkrsCount={sharedInsights.sharedOkrsCount}        // filtrado por teamId+year
  totalOkrsCount={teamObjectives?.length ?? 0}            // mesmo teamId+year
  ...
/>
```

## Defesa em profundidade

`SharedOkrInsights.tsx`:
1. `Math.min(100, ...)` no percentual — clamp.
2. `if (sharedOkrsCount > totalOkrsCount)` → não renderiza o insight de percentual + `console.warn`.

## Filtro `or` no postgrest

```ts
query.or(`primary_team_id.eq.${teamId},contributor_team_ids.cs.{${teamId}}`)
```
Time é dono OU consta no array de contribuidores.

## Query key

`queryKeys.okrs.sharedSummary(teamId, year)` — escopo no key. Prefix
`sharedSummaryPrefix()` para invalidação ampla.
