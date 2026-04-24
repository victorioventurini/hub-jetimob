---
name: KR linking standard (projects + milestones)
description: Schema XOR e regras de listagem de KRs vinculáveis a Projetos e Marcos
type: feature
---
# Vínculo de KRs em Projetos e Marcos

## Schema (XOR)
- `project_krs` e `milestone_krs` aceitam vínculo a **Team KR** (`key_result_id`) **OU** **Org KR** (`org_key_result_id`).
- Trigger `enforce_one_kr_link_xor` (BEFORE INSERT/UPDATE) garante exatamente um dos dois preenchido (proibido CHECK — ver `mem://standards/database/check-constraint-prohibition`).
- PK surrogate `id uuid` substituiu PK composta legada.
- Índices UNIQUE parciais evitam duplicatas: `(project_id|milestone_id, kr_id)` por tipo.

## Listagem para vínculo (`useKrsForLinking`)
Inclui:
- Team KRs **e** Org KRs do BU atual.
- Apenas do **ciclo ativo**: quarter ATIVO + year ATIVO (via `objective.cycle_id`).
- Exclui KR com `deleted_at IS NOT NULL` ou `cancelled_at IS NOT NULL`.
- Exclui KR cujo **objetivo pai** esteja em `status='draft'`, `status='cancelled'`, com `deleted_at` ou `cancelled_at` preenchidos. Rascunho de KR não existe no schema (KR.status é enum RAG); o estado "rascunho" é herdado do objetivo, conforme `mem://features/okrs/draft-okr-governance`.

## UI (popovers de vínculo)
- Largura `w-[480px]`.
- Resultados agrupados por **Objetivo** com badge `Org`/`Time` e nome do ciclo.
- Empty state: "Nenhuma KR ativa no ciclo atual".
- Busca cobre título da KR e título do objetivo.

## Mutations
- `useAddProjectKrLink` / `useAddMilestoneKrLink` recebem `{ kr_id, kind: 'team'|'org', impact }` e gravam na coluna correta.
- Unlink usa o par `(project_id|milestone_id, kr_id)` filtrando pela coluna correspondente ao `kind`.

## Navegação
KR já vinculada continua linkando para `/okrs?...` (padrão atual). Não foi criada rota dedicada nesta entrega.
