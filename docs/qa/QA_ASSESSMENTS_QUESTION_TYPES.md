# QA — Assessments: novos tipos de questão + scoring

**Escopo:** validar `single_choice`, `multiple_choice`, `scale` (Likert/NPS), `scoring` automático e anti-cheat universal entregues em `20260518142152_*.sql`.

## Pré-validação (read-only, executável agora)

```sql
-- 1. ENUM contém os 5 tipos
SELECT unnest(enum_range(NULL::public.assessment_question_type))::text;
-- esperado: short_text, long_text, single_choice, multiple_choice, scale

-- 2. Trigger de validação ativo
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.assessment_form_questions'::regclass
  AND tgname = 'trg_assessment_question_validate';
-- esperado: 1 linha

-- 3. RPC de grading existe com search_path travado
SELECT proname, prosecdef, proconfig FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND proname='rpc_assessment_run_grade';
-- esperado: prosecdef=true, proconfig={search_path=public}

-- 4. Colunas novas em assessment_runs
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='assessment_runs'
  AND column_name IN ('auto_score','objective_score','graded_at');
-- esperado: 3 linhas
```

## Cenários de validation trigger (rodar em draft real)

> Pré-requisito: ter um `version_id` de uma versão draft (`frozen=false`).

```sql
-- Caso A: single_choice válido
INSERT INTO public.assessment_form_questions
  (version_id, position, question_type, prompt, options, scoring, points, required, time_limit_seconds)
VALUES ('<draft_version_id>', 1, 'single_choice', 'Cor preferida?',
  '[{"id":"a","label":"Azul","order":1},{"id":"b","label":"Verde","order":2}]'::jsonb,
  '{"mode":"exact","correct_option_ids":["a"]}'::jsonb,
  1, true, 60);
-- esperado: sucesso

-- Caso B: single_choice SEM options → trigger rejeita
INSERT INTO public.assessment_form_questions
  (version_id, position, question_type, prompt, options, scoring, points, required)
VALUES ('<draft_version_id>', 2, 'single_choice', 'Sem opções',
  NULL, '{"mode":"none"}'::jsonb, 1, true);
-- esperado: ERRO do trigger assessment_question_validate

-- Caso C: scale com min >= max → trigger rejeita
INSERT INTO public.assessment_form_questions
  (version_id, position, question_type, prompt, options, scoring, points, required)
VALUES ('<draft_version_id>', 3, 'scale', 'NPS',
  '{"min":10,"max":1,"step":1}'::jsonb, '{"mode":"none"}'::jsonb, 1, true);
-- esperado: ERRO do trigger

-- Caso D: scoring.correct_option_ids fora de options[].id → trigger rejeita
INSERT INTO public.assessment_form_questions
  (version_id, position, question_type, prompt, options, scoring, points, required)
VALUES ('<draft_version_id>', 4, 'multiple_choice', 'Inválido',
  '[{"id":"x","label":"A"},{"id":"y","label":"B"}]'::jsonb,
  '{"mode":"partial","correct_option_ids":["z"]}'::jsonb, 1, true);
-- esperado: ERRO do trigger
```

## Cenário de grading automático

```sql
-- Após responder run com 1 questão exact (a) + 1 multiple partial (x,y corretos,
-- respondidos x e z) + 1 scale_target target=8 tol=1 respondido 9:
SELECT public.rpc_assessment_run_grade('<run_id>'::uuid);

SELECT auto_score, objective_score, graded_at
FROM public.assessment_runs WHERE id='<run_id>';

-- Cálculo esperado (com points=1 cada, total=3):
--   exact: 1.0 ponto (acerto exato)
--   partial: max(0, (1 - 1)/2) * 1 = 0 ponto
--   scale_target: |9-8| ≤ 1 → 1.0 ponto
-- earned=2.0 / 3.0 → auto_score = 66.67, objective_score = 66.67
```

## Checklist UI (manual no preview)

| Passo | Esperado |
|---|---|
| Criar form draft → add 1 questão de cada tipo (5 tipos) | Editor mostra dispatcher correto (RadioGroup, Checkbox, NPS, Input, Textarea) |
| Ativar gabarito em `single_choice` / `multiple_choice` / `scale` | Switch revela controles de pontos, corretas / target+tolerance |
| Salvar `single_choice` com gabarito vazio | Toast de erro (validation trigger) |
| Publicar versão | `frozen=true`, edição bloqueada |
| Gerar convite → abrir `/q/:token` | Cada questão renderiza pelo componente certo do `runner/` |
| Tentar paste em `short_text` / `long_text` | Bloqueado, telemetria `paste` registrada em `signals` |
| Mudar de aba durante run | Telemetria `tab_switch` registrada |
| Submit | `auto_score` e `objective_score` aparecem em `/assessments/runs/:runId` com badges Correta/Parcial/Incorreta |

## Permissão de gabarito (defesa em profundidade)

- Editar gabarito exige `assessments.form.update:bu`.
- `FormEditorPage` esconde o bloco de scoring quando o perfil ativo não possui a key, mesmo se conseguir abrir o editor.
- Verificar logando como perfil com `assessments.form.view:bu` apenas: ao abrir uma questão, a área "Esta questão tem gabarito" não aparece.

## Lints

`supabase--linter` rodado em 2026-05-18. Nenhum warning novo atribuível à migration `20260518142152` — função e trigger criados com `SET search_path = public`.
