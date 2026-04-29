---
name: Wizard Snapshot — Denormalized Fields Deprecation (Onda 4 Fase 1)
description: Campos de nome/título em snapshots de ritos foram marcados @deprecated. Readers devem preferir lookup por ID; writers não devem propagar novos usos.
type: preference
---

# Padrão

Snapshots de ritos em `okr_wizard_sessions.reflection_data` historicamente gravavam **nome + ID** lado a lado (ex.: `teamId` + `teamName`). A partir de Onda 4 Fase 1, todos os campos de nome/título foram marcados `@deprecated` em `src/modules/okrs/types/wizard/*`.

## Regras

1. **Writers (steps de wizard)**: continuam preenchendo os campos `@deprecated` para não quebrar snapshots em produção. Não adicione novos campos denormalizados em tipos novos.
2. **Readers (renderers, cards, exports)**: para implementações novas, prefira resolver `id → nome` via lookup em runtime (`useTeams`, `useKeyResults`, `useObjectives`, `useProfiles`, `useKpiMetrics`). Se o registro foi excluído, exiba `(removido)`.
3. **Pattern de leitura defensiva** (sub-ondas futuras):
   ```ts
   const teamName = lookups.teams.get(snapshot.teamId)?.name ?? snapshot.teamName ?? '(removido)';
   ```

## Campos afetados (16)

| Tipo | Campo | Lookup canônico |
|------|-------|-----------------|
| `KrFinalStateSnapshot` | `krTitle`, `objectiveTitle` | `useKeyResults`, `useObjectives` |
| `MbrOrgOkrSnapshot.keyResults[].ownerName` | — | `useProfiles` |
| `MbrTeamOkrObjectiveSnapshot.keyResults[].ownerName` | — | `useProfiles` |
| `MbrTeamOkrSnapshot.teamName` | — | `useTeams` |
| `MbrPreDraftData.krFinalStates[].{krTitle,objectiveTitle}` | — | KR/Objective lookup |
| `MbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | KR lookup |
| `MbrPreTeamSubmission.submittedByName` | — | `useProfiles` |
| `QbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | KR lookup |
| `WeeklyPriorityItem.teamName` | — | `useTeams` |
| `WeeklyPeopleSignalAggregated.teamName` | — | `useTeams` |
| `CollaboratorCheckinResult.{krTitle,objectiveTitle}` | — | KR/Objective lookup |
| `KpiCheckinResult.kpiName` | — | `useKpiMetrics` |
| `AreaOkrSummary.areaName` | — | `useTeams` |
| `CompanyOkrSummary.objectiveTitle` | — | `useObjectives` |

## Exclusões intencionais

- `DecisionThreadMessage.authorName`: semântica de comentário/post (não snapshot estruturado).
- `WizardVicContext.*`: contexto runtime para Vic, não persiste.
- `DraftKrMetricLink.kpiName`: estado de UI ephemeral pré-save.

## Próximas sub-ondas (não executadas em Fase 1)

- Hook canônico `useEntityLookup({ teamIds, krIds, profileIds, ... })`.
- Atualizar renderers para preferir lookup com fallback ao campo legado.
- Após N meses sem regressão, parar de gravar (writers) e dropar campos.
