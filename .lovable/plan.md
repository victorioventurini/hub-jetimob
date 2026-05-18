## Pré-checklist (cumprido)

- ✅ Regras Core de `mem://index.md` aplicadas.
- ✅ `docs/canonical/core/INDEX.md` (router) e `PRE_CHECKLIST.md` consultados.
- ✅ `docs/canonical/modules/assessments.md` lido — **detectado desatualizado**: cita tabelas inexistentes (`assessment_responses`, `assessment_questions`). Reais: `assessment_form_questions`, `assessment_answers`, `assessment_form_versions`, `assessment_runs`, `assessment_invites`, `assessment_form_links`, `assessment_themes`.
- ✅ Master `mem://features/assessments/categories-standard` **não existe** no filesystem (referência órfã em `mem://index`). Tratada como anomalia documental.
- ✅ Permission keys reais checadas em `permission_template_items_v2`: usar `assessments.form.update:bu` para gabarito (não criar key nova).
- ✅ Schema atual: ENUM `assessment_question_type = (short_text, long_text, single_choice, multiple_choice)`; colunas `options jsonb`, `answer_options jsonb`, `signals jsonb` já existem; RPC `rpc_assessment_answer_upsert` já aceita `p_answer_options`.

## Contexto

Só `long_text` é funcional. Editor (`FormEditorPage`) não tem UI para `options`; runner (`AssessmentRunnerView`) só renderiza textarea; `runnerApi.upsertAnswer` envia `p_answer_options: null` fixo.

## Escopo

1. Ativar `single_choice` e `multiple_choice` end-to-end.
2. Adicionar `scale` (Likert/NPS) ao ENUM.
3. Scoring com gabarito para objetivas.
4. Anti-cheat (timer/paste/tab/visibility) universal.

Fora de escopo: upload, numérico, data, sim/não dedicado.

## Modelo de dados (migration)

```text
ALTER TYPE assessment_question_type ADD VALUE 'scale';

ALTER TABLE assessment_form_questions
  ADD COLUMN scoring jsonb NOT NULL DEFAULT '{"mode":"none"}'::jsonb,
  ADD COLUMN points  numeric NOT NULL DEFAULT 1;

ALTER TABLE assessment_runs
  ADD COLUMN auto_score      numeric,
  ADD COLUMN objective_score numeric,
  ADD COLUMN graded_at       timestamptz;
```

Formato de `options` por tipo:

```text
single_choice / multiple_choice:
  [{ id: uuid, label: text, order: int }]
scale:
  { min: int, max: int, step: int, min_label?: text, max_label?: text }
```

Formato de `scoring`:

```text
{ mode: "none" | "exact" | "partial" | "scale_target",
  correct_option_ids?: uuid[],
  target?: number,
  tolerance?: number }
```

Formato de `assessment_answers`:
- Choice: `answer_options = ["opt-id-1", ...]`
- Scale:  `answer_options = { value: 7 }`
- Text:   continua em `answer_text`

**Validation trigger** (regra Core: nada de CHECK) em `assessment_form_questions`:
- `single_choice`/`multiple_choice` exigem `options` array ≥2 itens.
- `scale` exige `options.min < options.max` e `step > 0`.
- `scoring.mode` consistente com `question_type`.
- Quando `scoring.mode='exact'|'partial'`: `correct_option_ids` ⊆ `options[].id`.

## RPC e scoring

- `rpc_assessment_answer_upsert` — sem mudança de assinatura.
- **Nova** `rpc_assessment_run_grade(p_run_id uuid)` SECURITY DEFINER — invocada dentro de `rpc_assessment_run_submit`. Soma `points` × correção / total → `auto_score`, `objective_score`, `graded_at`.
- Texto (`short_text`/`long_text`) fica fora do `objective_score` (correção manual posterior).

## UI — `FormEditorPage.tsx`

Reescrever `SortableQuestionRow` (linhas 230–339):
- Select de tipo expõe 5 valores (acrescenta "Escala/NPS").
- `single_choice`/`multiple_choice`: lista editável de alternativas (label + reorder + remover + marcar como correta).
- `scale`: inputs `min`/`max`/`step`/`min_label`/`max_label` + preview.
- Switch "Esta questão tem gabarito" → revela `points` + marcação de corretas / target.
- Manter regra `frozen` para versões publicadas.

## UI — `AssessmentRunnerView.tsx`

Substituir o `LockedTextarea` único por dispatcher em `src/modules/assessments/components/runner/`:

```text
ShortTextQuestion.tsx       (Input + bloqueio paste)
LongTextQuestion.tsx        (mantém LockedTextarea)
SingleChoiceQuestion.tsx    (RadioGroup — semantic tokens)
MultipleChoiceQuestion.tsx  (Checkbox list)
ScaleQuestion.tsx           (RadioGroup horizontal estilo NPS)
```

Telemetria (timer por questão, paste, tab-switch, visibility) passa a valer para todos os tipos. `signals` no answer recebe `{ type, interactions }`.

## UI — `RunDetailPage.tsx`

- Header: `auto_score` / `objective_score` quando `graded_at`.
- Por questão: badge "Correta" / "Incorreta" / "Parcial" nas objetivas; texto exibido cru aguardando correção manual.

## Documentação (saneamento)

- Atualizar `docs/canonical/modules/assessments.md` com tabelas reais, novos tipos suportados, scoring.
- Remover referência órfã ao Master inexistente OU criar `mem://features/assessments/assessments-master-standard` consolidando categorias + tipos de questão + scoring. **Decisão recomendada:** criar o Master agora, já que este plano gera material consolidável.

## Arquivos afetados

```text
supabase/migrations/<ts>_assessments_question_types.sql              (novo)
src/modules/assessments/pages/FormEditorPage.tsx                     (editor multi-tipo)
src/modules/assessments/components/AssessmentRunnerView.tsx          (dispatcher)
src/modules/assessments/components/runner/*.tsx                      (novo)
src/modules/assessments/runner/runnerApi.ts                          (AnswerInput aceita options)
src/modules/assessments/pages/RunDetailPage.tsx                      (exibe score)
src/modules/assessments/hooks/useAssessmentsData.ts                  (tipos)
docs/canonical/modules/assessments.md                                (correção + escopo novo)
mem://features/assessments/assessments-master-standard               (criar — opcional)
```

## Compatibilidade

- Questões existentes continuam funcionando (`scoring` default `{mode:"none"}`, `points=1`).
- Runs antigos: `auto_score` `NULL`, página de detalhe esconde seção.
- Versões publicadas permanecem imutáveis (regra `frozen`).

## QA / aceitação

- Criar prova com 1 questão de cada tipo, publicar, gerar convite.
- Respondente submete os 5 tipos via `/q/:token`.
- Telemetria de paste/tab funciona em choice e scale.
- `auto_score` aparece em `RunDetailPage` com breakdown.
- Salvar `single_choice` sem alternativas → erro pelo validation trigger.
- Lints/linter Supabase limpos após migration.
