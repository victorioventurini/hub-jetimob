---
name: all-hands-standard
description: Rito mensal All Hands (1ª sexta), reaproveita steps MBR em read-only. BU admin only. Avaliação anônima. Cadência via sync-ritual-calendar.
type: feature
---

# All Hands — Standard

## Escopo
Rito mensal de comunicação da BU. 4 steps: Sumário, KPI Gate, OKRs Org, Avaliação. Conduzido apenas por BU admin + super_admin (`<RitualRoute requiresBuAdmin>`).

## Reuso (não duplicar)
- Steps 2/3: `MbrKpiGateStep`/`MbrOrgOkrsStep` em modo read-only (`showInlineDecisionInput=false`, `showStrategicDecisionToggle=false`, handlers no-op).
- Step 4: `EvaluationCollectionStep` canônico com `persona='all-hands'` (allowlist em `evaluationConfig.ts`).
- Step 1 novo: `AllHandsSummaryStep` (condensado, derivado do payload do MBR).

## Hidratação
`useLatestMbrForMonth(referenceMonth)` busca último `okr_wizard_sessions` com `wizard_type='mbr'`, `status='completed'` e `reflection_data.referenceMonth === ref`. Sem MBR → CTA bloqueia avanço.

## Cadência
`sync-ritual-calendar-from-cycles` upserta `ritual_cadences` com `wizard_type='all-hands'`, `frequency='monthly'`, `month_week_ordinal=1`, `day_of_week=5`, `team_id=NULL`. Ocorrências geradas por `generate-ritual-occurrences` (sem alteração).

## Janela de disponibilidade
`useRitualAvailability` para `'all-hands'`: composite window (review_date_first_month e review_date) com offset `0..+10` dias úteis (pós-MBR).

## SSOTs atualizados
- `WizardPersona += 'all-hands'`
- `RITUAL_LABELS`, `RITUAL_GREETING_PHRASES`, `RITUAL_FINALIZATION_COPY`, `RITUAL_STEP_LABELS.v1`
- `WIZARD_CONFIGS['all-hands']`
- `STRUCTURE_VERSION_BY_WIZARD_TYPE['all-hands'] = 'v1'`
- `EVALUATION_CONFIG['all-hands']` (enabled), `ATTENDANCE_CONFIG['all-hands']` (bu-leaders, conductor)

## Rota
`/rituals/all-hands` (lazyWithRetry).
