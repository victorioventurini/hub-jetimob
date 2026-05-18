---
name: Assessments Master Standard
description: Master do módulo Assessments — tabelas reais, tipos de questão (texto, choice, scale), scoring automático com gabarito, validation trigger, anti-cheat universal, categorias BU-scoped, permissões.
type: feature
---

# Assessments — Master

## Tabelas (autoritativo: `src/integrations/supabase/types.ts`)

`assessments`, `assessment_categories`, `assessment_subcategories`, `assessment_themes`,
`assessment_forms`, `assessment_form_versions`, `assessment_form_questions`,
`assessment_form_links`, `assessment_invites`, `assessment_runs`, `assessment_answers`.

Tabelas legadas mencionadas em docs antigos (`assessment_responses`, `assessment_questions`) **não existem** — ignorar.

## Tipos de questão (`assessment_question_type`)

| Tipo | Componente runner | Armazenamento |
|---|---|---|
| `short_text` | `ShortTextQuestion` (Input + bloqueio paste) | `answer_text` |
| `long_text` | `LongTextQuestion` (`LockedTextarea`) | `answer_text` |
| `single_choice` | `SingleChoiceQuestion` (RadioGroup) | `answer_options = [option_id]` |
| `multiple_choice` | `MultipleChoiceQuestion` (Checkbox) | `answer_options = [option_id,...]` |
| `scale` | `ScaleQuestion` (RadioGroup horizontal, Likert/NPS) | `answer_options = { value: number }` |

Formato de `assessment_form_questions.options` (jsonb):
- Choice: `[{ id: uuid, label: string, order: int }]`
- Scale:  `{ min: int, max: int, step?: int, min_label?: string, max_label?: string }`

## Scoring com gabarito

`assessment_form_questions.scoring` (jsonb, default `{"mode":"none"}`):

```
{ "mode": "none" }
{ "mode": "exact",        "correct_option_ids": [uuid,...] }
{ "mode": "partial",      "correct_option_ids": [uuid,...] }
{ "mode": "scale_target", "target": number, "tolerance": number }
```

`assessment_form_questions.points` (numeric, default 1) = peso da questão.

`assessment_runs`: `auto_score` (% geral), `objective_score` (% só objetivas com gabarito), `graded_at`.

Executado automaticamente em `rpc_assessment_run_submit` → chama `rpc_assessment_run_grade(run_id)` (SECURITY DEFINER, `search_path=public`). Texto livre fica fora do `objective_score` (correção manual posterior).

Regras de cálculo:
- `exact`: tudo ou nada (`answer_options` ⊆ `correct_option_ids` ∧ vice-versa).
- `partial`: `max(0, (acertos - erros) / |corretas|) * points`.
- `scale_target`: ponto cheio se `|value - target| ≤ tolerance`.

## Validation trigger (`assessment_question_validate`, BEFORE INSERT/UPDATE)

- `single_choice`/`multiple_choice` exigem `options` array ≥2 itens com `id` único.
- `scale` exige `options.min < options.max` e `step > 0`.
- `scoring.mode` consistente com `question_type` (`scale_target` só em `scale`; `exact`/`partial` só em choice).
- `scoring.correct_option_ids` ⊆ `options[].id`.

Sem CHECK constraint (regra Core).

## Anti-cheat universal

Telemetria registrada para **todos** os tipos via `runner/QuestionRenderer`:
- Timer por questão (`time_spent_seconds`)
- Paste/Copy bloqueado e registrado em `assessment_answers.signals.interactions`
- Tab-switch e visibility change registrados em `assessment_runs` via `rpc_assessment_run_telemetry`
- `signals = { type, interactions: [{ kind, at, ... }] }`

## Categorias BU-scoped

Catálogo `assessment_categories` + `assessment_subcategories` por BU. Gestão via permission key `assessments.category.manage:bu`. CRUD em `AssessmentCategoriesSettings`.

## Permissões

| Key | Cobre |
|---|---|
| `assessments.assessment.{view,create,update,delete}:bu` | Provas |
| `assessments.form.{view,create,update,delete,publish}:bu` | Formulários — **`form.update:bu` inclui gabarito/scoring** |
| `assessments.invite.{view,create,revoke}:bu` | Convites |
| `assessments.run.view:bu` | Tentativas |
| `assessments.category.manage:bu` | Catálogo de categorias |
| `assessments.theme.{view,manage}:bu` | Temas |
| `assessments.settings.manage:bu` | Configurações gerais |

`FormEditorPage` esconde o bloco de scoring quando o perfil ativo não tem `assessments.form.update:bu` (defesa em profundidade — a página em si já é gated).

## Páginas & runner

- `/assessments` lista · `/assessments/forms/:id` editor multi-tipo · `/assessments/provas/:id[/preview]` · `/assessments/runs/:runId` detalhe com score · `/q/:token` runner público.
- Runner em `src/modules/assessments/components/runner/`: `QuestionRenderer` (dispatcher) + 5 componentes especializados.

## RPCs

- `rpc_assessment_run_start(invite_token)`
- `rpc_assessment_answer_upsert(run_id, question_id, answer_text, answer_options, signals)`
- `rpc_assessment_run_submit(run_id)` → invoca grading
- `rpc_assessment_run_grade(run_id)` (SECURITY DEFINER)
- `rpc_assessment_run_telemetry(run_id, event, payload)`

## Compatibilidade

- Questões antigas continuam com `scoring={mode:"none"}`, `points=1`, `options=null`.
- Runs antigos: `auto_score=NULL`, página de detalhe esconde a seção.
- Versões publicadas permanecem imutáveis (`frozen=true`).

## QA & Docs

- QA reproduzível: `docs/qa/QA_ASSESSMENTS_QUESTION_TYPES.md`
- Doc canônico: `docs/canonical/modules/assessments.md`
- Migration: `supabase/migrations/20260518142152_*.sql`
