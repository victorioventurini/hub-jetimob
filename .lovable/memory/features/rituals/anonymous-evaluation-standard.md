---
name: anonymous-ritual-evaluation-standard
description: Coleta anônima de avaliação de ritos coletivos (MBR, QBR-Meeting, QBR-Post). Página pública /p/r/:shortCode com globalClient PRE-BU, RPCs SECURITY DEFINER, view agregada, e step framework-agnóstico.
type: feature
---

# Anonymous Ritual Evaluation — Standard

## Escopo
Habilitado APENAS para personas: `mbr`, `mbr-first`, `qbr-meeting`, `qbr-post`. Fora: `weekly`, `qbr-pre-clevel`, todos os individuais.
SSOT: `src/modules/okrs/components/wizards/shared/framework/config/evaluationConfig.ts`.

## Anonimato (regra inquebrável)
A linha em `ritual_evaluation_responses` NÃO grava `auth.uid()`, IP, user-agent ou qualquer ID. O condutor vê APENAS médias agregadas + citações sem autoria. RPC `get_ritual_evaluation_open_answers` recusa execução se `evaluation_closed_at IS NULL` (não vaza citações ao vivo).

## Cliente correto (PRE-BU vs POST-BU)
- Página pública `/p/r/:shortCode` → `globalClient` (sem `BuProvider`). BU resolvida server-side pela RPC.
- Step do condutor (dentro do wizard) → `useBuScopedSupabase`.

## Schema
- `okr_wizard_sessions.evaluation_short_code|open_at|closed_at` (3 colunas).
- `ritual_evaluation_responses` (BU denormalizada, validação via trigger — SEM CHECK constraint).
- `v_ritual_evaluation_summary` (`security_invoker=true`, inclui `evaluation_short_code` para hidratação do step).

## RPCs canônicas
- Anônimas: `get_public_ritual_evaluation_form`, `submit_ritual_evaluation`.
- Auth: `open_ritual_evaluation`, `close_ritual_evaluation`, `get_ritual_evaluation_live_count`, `get_ritual_evaluation_open_answers`.
- Permission keys: `okrs.evaluation.{open,close,view}:as_conductor`.

## Componentes / Hooks
- Components (memo, agnósticos): `framework/components/evaluation/{EvaluationCollectionStep,EvaluationStartCard,EvaluationLiveCounter,EvaluationSummary}`.
- Hooks: `framework/hooks/{useOpenCloseRitualEvaluation,usePublicRitualEvaluation,useRitualEvaluationLiveCount,useRitualEvaluationOpenAnswers,useRitualEvaluationSummary}`.
- Query keys: `src/lib/queryKeys/ritualEvaluation.ts` (prefix `['ritualEvaluation', ...]`).
- Página pública: `src/pages/PublicRitualEvaluation.tsx` + rota lazy em `src/routes/public.routes.tsx` + `PUBLIC_PATHS`.

## Integração nos containers (estado atual)
- `MbrPage`: step `'evaluation'` entre `'qbr-followup'` e `'closing'`.
- `QbrMeetingPage`: step `'evaluation'` entre `'commitments'` e `'closing'`.
- `QbrPostPage`: step `'evaluation'` entre `'follow-up'` e `'minutes'`.

## Histórico
`RitualEvaluationSection` (em `pages/ritual-history/`) prefere o modelo novo (`v_ritual_evaluation_summary` → `EvaluationSummary`) e cai para o legacy `RitualFeedbackSection` (lê `reflectionData.data.ritualFeedback`) quando `response_count = 0`.

## Refactors aplicados
- `MbrClosingStep`: nova prop `hideFeedbackBlock` desativa o bloco de coleta inline (rating 1-5 + comentário) e relaxa `canComplete`. Usado pelo `QbrPreCLevelPage`, que removeu a coleta de feedback (decisão 2026-05-04).
- `WeeklyClosingStep`: já não tinha feedback inline.
- Step `'feedback'` do `QbrPreCLevelPage` mantido (compat de drafts) mas renomeado para "Encerramento".

## Doc completa
`docs/canonical/ANONYMOUS_RITUAL_EVALUATION.md`.
