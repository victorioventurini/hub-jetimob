## Objetivo
Variante "enxuta" da avaliação anônima para o **All Hands**: remover **Qualidade da discussão** (`score_quality`) e **Clareza das decisões** (`score_decisions`). Mantém **Valor** (`score_value`) e **Tempo** (`score_time`) + `change_one_thing` (obrigatório) + `what_worked` (opcional). MBR/QBR permanecem com 4 dimensões. Sem duplicar página/componentes — extensão por SSOT.

## Princípio (alinhado ao canônico ANONYMOUS_RITUAL_EVALUATION §1.2)
- **Componentes não conhecem persona.** Adicionar entrada em `evaluationConfig.ts` + `dimensions` opcional → tudo herda.
- **Server-side é fonte de verdade**: trigger valida quais dimensões podem ser nulas por `wizard_type`.
- **Anonimato preservado** — nada novo na superfície de privacidade.

## Mudanças

### 1) Banco (migração única)
- `ritual_evaluation_responses`: tornar `score_quality` e `score_decisions` `NULL`-able. Demais NOT NULL preservados.
- `fn_validate_ritual_evaluation_response`: ler `wizard_type` da sessão. Para `all-hands`: exigir `score_quality IS NULL` e `score_decisions IS NULL`; `score_value`/`score_time` em 1..5. Para outras personas: comportamento atual (4 scores 1..5).
- `get_public_ritual_evaluation_form`:
  - Adicionar `'all-hands' → 'All Hands'` no `CASE` de label.
  - Estender `show_what_worked` para incluir `'all-hands'`.
  - Adicionar coluna `dimensions text[]` no retorno (e.g. `ARRAY['value','time']` para `all-hands`; `ARRAY['value','quality','decisions','time']` para os demais).
- `submit_ritual_evaluation`: aceitar `p_score_quality int DEFAULT NULL` e `p_score_decisions int DEFAULT NULL`, gravar como vier; trigger faz a validação por persona.
- `get_ritual_evaluation_summary`: trocar `AVG(score_quality)` e `AVG(score_decisions)` por `AVG(...) FILTER (WHERE ... IS NOT NULL)` (retornará `NULL` quando todas as respostas forem da variante enxuta).
- `v_ritual_evaluation_summary`: replicar o mesmo `FILTER` para as duas colunas (consistência entre RPC e view).
- `get_ritual_evaluation_open_answers`: nada (só lê textos).

### 2) Frontend — SSOT
`src/modules/okrs/components/wizards/shared/framework/config/evaluationConfig.ts`:
- Novo tipo `EvaluationDimensionKey = 'value'|'quality'|'decisions'|'time'`.
- Adicionar `dimensions: EvaluationDimensionKey[]` em `EvaluationConfig` (opcional; default = todas as 4).
- Definir explicitamente:
  - `mbr`, `mbr-first`, `qbr-meeting`, `qbr-post`: `dimensions: ['value','quality','decisions','time']`.
  - `all-hands`: `dimensions: ['value','time']`.
- Helper `getEvaluationDimensions(persona)`.

### 3) Página pública (`src/pages/PublicRitualEvaluation.tsx`)
- `usePublicRitualEvaluationForm` lê `dimensions` da RPC e expõe em `PublicEvaluationForm`. Fallback: 4 dimensões (compat com sessões antigas).
- Refatorar constantes: `DIMENSIONS` (array fixa) → `DIMENSION_META: Record<DimensionKey, {label, hintLow, hintHigh}>`. Render itera `form.dimensions`.
- `scores` segue `Record<DimensionKey, number|null>`; `allScored` valida apenas as habilitadas.
- `handleSubmit` envia `null` para dimensões não presentes em `form.dimensions`.

### 4) Hook submit
`useSubmitRitualEvaluation`:
- `SubmitEvaluationInput.scoreQuality?: number | null` e `scoreDecisions?: number | null` (opcionais).
- Repassa `null` quando ausente.

### 5) Histórico (`RitualEvaluationSection`)
- Já consome `useRitualEvaluationSummary`. Quando `avg_quality`/`avg_decisions` vierem `NULL`, ocultar essas duas barras (não renderizar "0"). Ajuste pontual no componente.

## Componentes preservados (sem duplicar)
- `PublicRitualEvaluation`, `EvaluationCollectionStep`, `EvaluationSummary`, `EvaluationStartCard`, `EvaluationLiveCounter`, todos os hooks (`usePublicRitualEvaluationForm`, `useSubmitRitualEvaluation`, `useRitualEvaluationSummary`, `useRitualEvaluationLiveCount`, `useRitualEvaluationOpenAnswers`, `useOpenRitualEvaluation`, `useCloseRitualEvaluation`), rota `/p/r/:shortCode`, query keys, fingerprint, RLS, RBAC keys.

## Não-objetivos
- Sem nova tabela / nova rota / nova página.
- Sem mudança em MBR, QBR, ou nos steps internos do All Hands (segue `EvaluationCollectionStep`).
- Sem mexer em `change_one_thing` / `what_worked` (textos seguem iguais).
- Sem alteração de permission keys.

## Atualização documental (após merge)
- `docs/canonical/ANONYMOUS_RITUAL_EVALUATION.md`: adicionar linha `all-hands` na tabela §2 (com nota "2 dimensões: valor + tempo") e descrever `dimensions` em §4/§7.
- `mem://features/rituals/anonymous-evaluation-standard`: nota da variante enxuta.
