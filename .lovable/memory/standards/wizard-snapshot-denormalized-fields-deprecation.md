---
name: Wizard Snapshot — Denormalized Fields Deprecation (Onda 4 Fases 1-3)
description: Campos de nome/título em snapshots de ritos foram marcados @deprecated e tornados opcionais. Writers persistentes pararam de gravar. Readers usam `useEntityLookup` + `resolveName` com fallback ao snapshot legado.
type: preference
---

# Padrão

Snapshots de ritos em `okr_wizard_sessions.reflection_data` historicamente gravavam **nome + ID** lado a lado (ex.: `teamId` + `teamName`). A partir de Onda 4 Fase 1, todos os campos de nome/título foram marcados `@deprecated` em `src/modules/okrs/types/wizard/*`. A partir de Onda 4 Fase 2, os renderers leem nomes em runtime via `useEntityLookup` com fallback defensivo.

## Regras

1. **Writers persistentes (Fase 3 concluída)**: NÃO gravam mais campos `@deprecated` Onda 4 Fase 1. Snapshots novos ficam enxutos (apenas IDs).
2. **Tipos**: campos `@deprecated` Fase 1 estão **opcionais** (`?:`) — snapshots legados continuam válidos.
2. **Readers (renderers, cards, exports)**: use `useEntityLookup` + `resolveName`. Nunca leia nome direto do snapshot sem fallback.
3. **Pattern canônico de leitura**:
   ```ts
   import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';

   const lookups = useEntityLookup({ teamIds, teamKrIds, profileIds, kpiIds });
   const teamName = resolveName(lookups.teams, snap.teamId, snap.teamName);
   //                                                       ^^^^ fallback legado
   ```
4. **KR ambíguo (team vs org)**: quando o snapshot não distingue origem, consulte ambos os mapas e fallback ao legado:
   ```ts
   const krName =
     lookups.teamKrs.get(id)?.name ??
     lookups.orgKrs.get(id)?.name ??
     legacyTitle ?? '(removido)';
   ```

## Renderers migrados (9/11 — Onda 4 Fase 2 completa)

| Renderer | Lookups consumidos |
|---|---|
| `TeamCheckinReport` | teamKrs |
| `LeaderPrepReport` | teamKrs, kpis |
| `ManagersCheckinReport` | kpis |
| `QbrPostReport` | orgObjectives |
| `CollaboratorReport` | teamKrs, teamObjectives, kpis |
| `MbrReport` | teams, teamObjectives, orgObjectives, kpis, profiles |
| `MbrPreReport` | teamKrs, orgKrs, kpis |
| `QbrPreReport` | teamKrs, orgKrs, kpis |
| `QbrMeetingReport` | teams, profiles |

## Renderers fora de escopo (intencional)

- `QbrCLevelReport`: snapshot só tem categorias/flags/textos — sem IDs para resolver.
- `CLevelCheckinReport`: `reviewedOkrs[]` é genérico (string ou objeto), sem ID confiável e sem garantia de tipo.

## Campos afetados (16)

| Tipo | Campo | Lookup canônico |
|------|-------|-----------------|
| `KrFinalStateSnapshot` | `krTitle`, `objectiveTitle` | `useEntityLookup({ teamKrIds, orgKrIds, teamObjectiveIds, orgObjectiveIds })` |
| `MbrOrgOkrSnapshot.keyResults[].ownerName` | — | `profiles` |
| `MbrTeamOkrObjectiveSnapshot.keyResults[].ownerName` | — | `profiles` |
| `MbrTeamOkrSnapshot.teamName` | — | `teams` |
| `MbrPreDraftData.krFinalStates[].{krTitle,objectiveTitle}` | — | KR/Objective lookup |
| `MbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | KR lookup |
| `MbrPreTeamSubmission.submittedByName` | — | `profiles` |
| `QbrPreDraftData.kpisToCreate[].relatedKrTitle` | — | KR lookup |
| `WeeklyPriorityItem.teamName` | — | `teams` |
| `WeeklyPeopleSignalAggregated.teamName` | — | `teams` |
| `CollaboratorCheckinResult.{krTitle,objectiveTitle}` | — | KR/Objective lookup |
| `KpiCheckinResult.kpiName` | — | `kpis` |
| `AreaOkrSummary.areaName` | — | `teams` |
| `CompanyOkrSummary.objectiveTitle` | — | `orgObjectives` |

## Exclusões intencionais

- `DecisionThreadMessage.authorName`: semântica de comentário/post (não snapshot estruturado).
- `WizardVicContext.*`: contexto runtime para Vic, não persiste.
- `DraftKrMetricLink.kpiName`: estado de UI ephemeral pré-save.

## Writers persistentes migrados (Onda 4 Fase 3 — concluída)

| Writer | Campos removidos |
|---|---|
| `MbrPrePage.tsx` (seed `krFinalStates`) | `krTitle`, `objectiveTitle` |
| `QbrPrePage.tsx` (seed `krFinalStates`) | `krTitle`, `objectiveTitle` |
| `CollaboratorCheckinStep.tsx` (handleSave + handleSkip) | `krTitle`, `objectiveTitle` |
| `CollaboratorKpiStep.tsx` (onComplete) | `kpiName` |

## Campos sem writer persistente

A maioria dos 16 campos `@deprecated` Fase 1 vive em tipos derivados em runtime (não persistem em `okr_wizard_sessions.reflection_data`):
- `MbrTeamOkrSnapshot.teamName`, `MbrOrgOkrSnapshot.keyResults[].ownerName`, `MbrTeamOkrObjectiveSnapshot.keyResults[].ownerName` — derivados em `useWizardAI`
- `MbrPreTeamSubmission.submittedByName` — derivado em `useMbrPreSubmissions`
- `WeeklyPriorityItem.teamName`, `WeeklyPeopleSignalAggregated.teamName` — derivados em `useWeeklyPreWeeklyAggregation`
- `AreaOkrSummary.areaName` — derivado em `useManagersPanorama`
- `CompanyOkrSummary.objectiveTitle` — derivado em `useCompanyOkrs`

Estes não exigem migração de writer (não são gravados). Permanecem `@deprecated` apenas como sinal arquitetural para evitar dependência futura.

## Diferido para Fase 5 (drop)

- `kpisToCreate[].relatedKrTitle` (MBR Pre + QBR Pre): hoje é input livre/textual do líder, sem `krId`. Migração exige redesenhar input (adicionar autocomplete por KR), fora do escopo de "parar de gravar".

## Próximas sub-ondas

- **Fase 4**: edge functions que lêem snapshot (`mbr-summary`, `qbr-clevel-learnings-summary`).
- **Fase 5**: drop dos campos dos types e do schema (após período de observação).
