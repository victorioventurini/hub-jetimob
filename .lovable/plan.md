

## Status Efetivo de KR — Canonical Utility

### Resumo

Utilitário canônico `getEffectiveKrRagStatus` que corrige o status `not_started` quando a KR já teve atividade (check-in ou atualização de KPI primário vinculado). Aplicado em todas as camadas de transformação de dados de KRs organizacionais.

### Regra

Se `status === 'not_started'` **E** `current_value !== baseline` → status efetivo = `green` (On Track).

### Arquivo canônico

`src/modules/okrs/utils/effectiveStatus.ts`

### Pontos de aplicação

| Arquivo | Contexto |
|---|---|
| `hooks/queries/useOrgObjectiveViewQueries.ts` | Org view + Org objective detail (2 pontos) |
| `hooks/useOrgOkrsForContext.ts` | MBR wizard org OKRs |
| `hooks/useTeamContributionView.ts` | Team contribution view |
| `hooks/queries/aggregateUtils.ts` | Aggregated status calculation |
| `components/OrgObjectiveCard.tsx` | Org card (raw query consumer) |

### Teste

`src/modules/okrs/utils/__tests__/effectiveStatus.test.ts` — 3 testes cobrindo todos os cenários.
