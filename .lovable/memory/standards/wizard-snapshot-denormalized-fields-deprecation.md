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

## Pendência `relatedKrTitle` — resolvida (2026-04-30)

Auditoria revelou que a "feature de sugestão de KPI pelo líder" foi **descontinuada na UI**: `QbrKpiAnalysisStep` não renderiza mais nenhum campo de captura, e os arrays `kpisToCreate` permanecem `[]` no fluxo atual. Entradas existentes vêm apenas de drafts/snapshots legados.

Ações executadas:
- `relatedKrTitle` agora é `?: string` (opcional) em `MbrPreDraftData.kpisToCreate[]` e `QbrPreSnapshot.kpisToCreate[]`, com `@deprecated` apontando para Fase 5.
- Props `@deprecated` `kpisToCreate`/`onKpisToCreateChange` removidas de `QbrKpiAnalysisStep` e dos call-sites em `MbrPrePage`/`QbrPrePage`. (Os pares `zombieCandidates*` foram totalmente removidos em 2026-04-30.)
- Reader histórico (`MbrPage` → `proposedKpis` → `MbrKpiGateStep`) já trata o campo como opcional; nenhuma mudança necessária.
- Fixture `QbrCLevelSteps.test.tsx` atualizado para refletir o novo shape.

Não há mais "redesign de autocomplete" pendente — apenas o drop final junto da Fase 5.

## Edge functions migradas (Onda 4 Fase 4 — concluída)

| Edge function | Lookup adicionado |
|---|---|
| `qbr-pre-summary` | `okr_team_key_results` por `krId` para resolver `krTitle` antes de montar prompt |
| `collaborator-checkin-summary` | `okr_team_key_results` por `krId` + `kpi_metrics` por `kpiId` (Promise.all) com fallback ao snapshot legado |

Edge functions inspecionadas e **fora de escopo** (não desestruturam campos denormalizados):
- `mbr-summary`: passa `snapshot` inteiro como JSON ao LLM, sem ler `krTitle/objectiveTitle` direto.
- `qbr-clevel-learnings-summary`: recebe `teamName` no payload do cliente (não lê de snapshot).
- `qbr-executive-report`, `okr-org-health-review`, `weekly-curate-opening`, `okr-construction-review`: usam `teamName/objectiveTitle` em inputs/outputs derivados em runtime, não em leituras de snapshot.

## Próxima sub-onda

- **Fase 5 (diferida ≥ 90 dias)**: drop dos campos `@deprecated` dos types e dos branches de fallback em readers/edge functions, após janela de observação confirmando que snapshots novos não os contêm. Inclui agora `relatedKrTitle` (sem dependência de redesign).

## Auditoria de produção pós-Fase 3 (T0 da janela de observação)

**Data do baseline**: 2026-04-30 (dia da entrega de Fase 3 do `QbrPrePage.tsx`).

Query auditando `okr_wizard_sessions.reflection_data->'data'` dos últimos 30 dias para os campos `@deprecated` Fase 1 (`krTitle`, `objectiveTitle`, `kpiName`, `relatedKrTitle`) revelou:

| Wizard | Total snapshots (30d) | Snapshots sujos | Snapshot sujo mais recente |
|---|---|---|---|
| `collaborator` | 24 | **0** | n/a |
| `mbr` | 1 | **0** | n/a |
| `mbr-pre` | 0 | **0** | n/a |
| `qbr-pre` | 11 | 9 (krTitle), 2 (relatedKrTitle) | 2026-04-20 20:57 |

**Conclusão**: todos os snapshots "sujos" são **anteriores** ao deploy da Fase 3 do `QbrPrePage.tsx` (2026-04-30 02:22). Nenhum snapshot criado após a Fase 3 contém campos `@deprecated`. Writers migrados estão funcionando como projetado.

### Critério para Fase 5 (drop físico)

Re-executar a auditoria em **2026-07-30** (≥ 90 dias). Se nenhum snapshot novo (`updated_at > 2026-04-30`) contiver os campos `@deprecated`, prosseguir com Fase 5:
1. Remover campos `@deprecated` Fase 1 dos types em `src/modules/okrs/types/wizard/*`.
2. Remover branches de fallback `?? legacyTitle` dos readers (`useEntityLookup`/`resolveName`).
3. Remover queries de fallback nas edge functions migradas (`qbr-pre-summary`, `collaborator-checkin-summary`).

### Query de auditoria (executar trimestralmente)

```sql
WITH audit AS (
  SELECT
    wizard_type, id, updated_at,
    jsonb_path_exists(reflection_data, '$.data.krCheckins[*].krTitle') AS coll_has_krTitle,
    jsonb_path_exists(reflection_data, '$.data.krCheckins[*].objectiveTitle') AS coll_has_objectiveTitle,
    jsonb_path_exists(reflection_data, '$.data.kpiCheckins[*].kpiName') AS coll_has_kpiName,
    jsonb_path_exists(reflection_data, '$.data.krFinalStates[*].krTitle') AS pre_has_krTitle,
    jsonb_path_exists(reflection_data, '$.data.krFinalStates[*].objectiveTitle') AS pre_has_objectiveTitle,
    jsonb_path_exists(reflection_data, '$.data.kpisToCreate[*].relatedKrTitle') AS pre_has_relatedKrTitle
  FROM okr_wizard_sessions
  WHERE updated_at > '2026-04-30'::timestamptz
    AND wizard_type IN ('collaborator','mbr-pre','qbr-pre','mbr')
)
SELECT wizard_type, COUNT(*) AS total,
  SUM((coll_has_krTitle OR pre_has_krTitle)::int) AS dirty_krTitle,
  SUM((coll_has_objectiveTitle OR pre_has_objectiveTitle)::int) AS dirty_objectiveTitle,
  SUM(coll_has_kpiName::int) AS dirty_kpiName,
  SUM(pre_has_relatedKrTitle::int) AS dirty_relatedKrTitle
FROM audit GROUP BY wizard_type ORDER BY wizard_type;
```

## Status Onda 4

Fases 1-4 concluídas. Fase 5 diferida; janela de observação iniciada em **2026-04-30**, próxima auditoria em **2026-07-30**. Pendência `relatedKrTitle` resolvida via descontinuação da feature. Baseline de testes: **1769/1769 passing**.
