---
name: All Hands evaluation lean variant
description: All Hands usa avaliação enxuta (2 dimensões: value+time). MBR/QBR seguem com 4. SSOT em evaluationConfig.dimensions; servidor valida via fn_validate_ritual_evaluation_response por wizard_type.
type: feature
---

A página pública `/p/r/:shortCode` é a mesma para todos os ritos coletivos. As dimensões coletadas vêm da RPC `get_public_ritual_evaluation_form` (coluna `dimensions text[]`).

- `all-hands` → `['value','time']` (score_quality/score_decisions DEVEM ser NULL).
- `mbr | mbr-first | qbr-meeting | qbr-post` → `['value','quality','decisions','time']`.

SSOT cliente: `src/modules/okrs/components/wizards/shared/framework/config/evaluationConfig.ts` — campo `dimensions` por persona + helper `getEvaluationDimensions(persona)`.

`get_ritual_evaluation_summary` e `v_ritual_evaluation_summary` calculam `avg_quality`/`avg_decisions` com `FILTER (WHERE ... IS NOT NULL)` — variante enxuta retorna `NULL`. `RitualEvaluationSection` filtra dimensões `null` para não renderizar barras vazias.

Componentes/RPCs/rota NÃO foram duplicados — extensão por SSOT conforme `docs/canonical/ANONYMOUS_RITUAL_EVALUATION.md` §1.2.
