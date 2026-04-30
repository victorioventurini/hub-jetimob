# Onda 4 — Sub-tarefa `relatedKrTitle` (encerrada 2026-04-30)

## Resultado

A pendência aberta na Fase 5 ("redesign de autocomplete por KR") foi resolvida via **descontinuação do campo**, não via redesign — auditoria mostrou que o input de sugestão de KPI já tinha sido removido da UI em commits anteriores; só restavam:
- props `@deprecated` em `QbrKpiAnalysisStep` (não usadas);
- `relatedKrTitle: string` (obrigatório) em dois types;
- um fixture de teste populando o campo legado.

## Alterações

| Arquivo | Mudança |
|---|---|
| `src/modules/okrs/types/wizard/mbr.ts` | `relatedKrTitle?: string` + tag `@deprecated` Fase 5 |
| `src/modules/okrs/types/wizard/qbr.ts` | idem |
| `src/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep.tsx` | Removidas props `kpisToCreate`, `onKpisToCreateChange`, `zombieCandidates`, `onZombieCandidatesChange` (todas `@deprecated`) |
| `src/modules/okrs/pages/MbrPrePage.tsx` | Stop de passagem de `kpisToCreate`/`onKpisToCreateChange` |
| `src/modules/okrs/pages/QbrPrePage.tsx` | idem |
| `src/modules/okrs/components/wizards/qbr-pre-clevel/__tests__/QbrCLevelSteps.test.tsx` | Fixture sem `relatedKrTitle` |
| `mem://standards/wizard-snapshot-denormalized-fields-deprecation` | Pendência marcada como resolvida; campo agora entra no drop normal da Fase 5 |

## Validação

`bunx vitest run src/modules/okrs` → **1769/1769 passing** (1 flake de timeout 5s em teste de import isolado, confirmado verde em re-run).

## Estado da Onda 4

Todas as fases (1-4) entregues + pendência de `relatedKrTitle` encerrada. Apenas o **drop físico** dos campos `@deprecated` segue diferido para após janela de observação ≥90 dias (Fase 5).
