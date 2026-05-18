# Módulo Assessments — Canonical

**Slug:** `assessments` · **Status:** ✅ Ativo
**Master/SSOT:** este documento (Master de memória ainda não consolidado)

## Tabelas

- `assessments` — provas (header)
- `assessment_categories`, `assessment_subcategories` — taxonomia BU-scoped
- `assessment_themes` — temas
- `assessment_forms` — formulários (gabaritos reutilizáveis)
- `assessment_form_versions` — versões publicáveis (frozen quando publicadas)
- `assessment_form_questions` — perguntas (multi-tipo, scoring, options, points)
- `assessment_form_links` — vínculo prova ↔ versão de formulário
- `assessment_invites` — convites com token público
- `assessment_runs` — tentativas (status, telemetria, scores)
- `assessment_answers` — respostas por questão

Schema autoritativo: `src/integrations/supabase/types.ts`.

## Tipos de questão (`assessment_question_type`)

| Tipo | UI | Armazenamento da resposta |
|---|---|---|
| `short_text` | Input com bloqueio de paste | `answer_text` |
| `long_text` | `LockedTextarea` | `answer_text` |
| `single_choice` | RadioGroup | `answer_options = [option_id]` |
| `multiple_choice` | Checkbox list | `answer_options = [option_id, ...]` |
| `scale` | RadioGroup horizontal numérico (Likert/NPS) | `answer_options = { value: number }` |

Formato de `assessment_form_questions.options` (`jsonb`):

- Choice: `[{ id: uuid, label: string, order: int }]`
- Scale:  `{ min: int, max: int, step?: int, min_label?: string, max_label?: string }`

## Scoring (gabarito automático)

`assessment_form_questions.scoring` (`jsonb`, default `{"mode":"none"}`):

```text
{ "mode": "none" }
{ "mode": "exact",        "correct_option_ids": [uuid, ...] }
{ "mode": "partial",      "correct_option_ids": [uuid, ...] }
{ "mode": "scale_target", "target": number, "tolerance": number }
```

`assessment_form_questions.points` (`numeric`, default `1`) — peso da questão no score final.

`assessment_runs` ganha:
- `auto_score` — % geral (todas as questões com gabarito)
- `objective_score` — % apenas das questões objetivas com gabarito
- `graded_at` — quando rodou

Scoring é executado automaticamente dentro de `rpc_assessment_run_submit` via `rpc_assessment_run_grade(run_id)`. Texto livre fica fora — correção manual posterior.

## Validações

Validation trigger `assessment_question_validate` (não CHECK constraint):
- choice exige `options` array com ≥2 itens
- scale exige `options.min < options.max` e `step > 0`
- `scoring.mode` consistente com `question_type`
- `correct_option_ids` ⊆ `options[].id`

## Categorias

Catálogo BU-scoped, gerido via permission key `assessments.category.manage:bu`.

## Permissões

- `assessments.assessment.{view,create,update,delete}:bu`
- `assessments.form.{view,create,update,delete,publish}:bu` — gabarito/scoring usam `form.update:bu`
- `assessments.invite.{view,create,revoke}:bu`
- `assessments.run.view:bu`
- `assessments.category.manage:bu`, `assessments.theme.{view,manage}:bu`
- `assessments.settings.manage:bu`

## Páginas

- `/assessments` — lista
- `/assessments/forms/:id` — editor de formulário multi-tipo (FormEditorPage)
- `/assessments/provas/:id` — detalhes da prova
- `/assessments/provas/:id/preview` — pré-visualização do ambiente
- `/assessments/runs/:runId` — detalhe da tentativa com score
- `/q/:token` — runner público

## Componentes Runner

`src/modules/assessments/components/runner/`:
- `QuestionRenderer` — dispatcher por `question_type`
- `ShortTextQuestion`, `LongTextQuestion`
- `SingleChoiceQuestion`, `MultipleChoiceQuestion`
- `ScaleQuestion`

Telemetria (timer por questão, paste, copy, tab-switch, visibility) vale para todos os tipos.

## Referências

- RBAC: `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
- RPC: `rpc_assessment_run_start`, `rpc_assessment_answer_upsert`, `rpc_assessment_run_submit`, `rpc_assessment_run_grade`, `rpc_assessment_run_telemetry`
