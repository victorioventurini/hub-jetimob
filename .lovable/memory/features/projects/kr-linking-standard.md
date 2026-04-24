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
- Coluna `impact` (`project_impact` enum: high/medium/low) **mantida com `NOT NULL DEFAULT 'medium'`** por compatibilidade de schema, mas **NÃO é mais exposta na UI** (decisão de produto 2026-04-24: categorização não trazia valor para o usuário). Nenhum input nem display de impacto. Mutations enviam `impact: 'medium'` fixo.

## Listagem para vínculo (`useKrsForLinking`)
Inclui:
- Team KRs **e** Org KRs do BU atual.
- Filtragem por ciclo é **DUAL** (schemas diferentes):
  - **Team Objectives** → via `objective.cycle_id` ∈ ciclos ativos (quarter + year).
  - **Org Objectives** → via `objective.year` ∈ anos ativos (canônico — Org Objectives normalmente têm `cycle_id` NULL e usam `year::int`). Aceita também `cycle_id` como fallback de compatibilidade futura.
- Exclui KR com `deleted_at IS NOT NULL` ou `cancelled_at IS NOT NULL`.
- Exclui KR cujo **objetivo pai** esteja em `status='draft'`, `status='cancelled'`, com `deleted_at` ou `cancelled_at` preenchidos. Rascunho de KR não existe no schema (KR.status é enum RAG); o estado "rascunho" é herdado do objetivo, conforme `mem://features/okrs/draft-okr-governance`.

## UI (popovers de vínculo + chips de KRs vinculados)
- Largura do popover: `w-[480px]`.
- Resultados agrupados por **Objetivo** com badge de origem + nome do ciclo.
- **Badge de origem (regra canônica)**:
  - Team KR → exibe **nome do time** dono do objetivo (`okr_team_objectives.team.name`); fallback defensivo `'Time'` se ausente.
  - Org KR → exibe `'Org'`.
  - Aplica-se ao popover de busca **e** aos chips dos KRs já vinculados (Project + Milestone).
- Empty state: "Nenhuma KR ativa no ciclo atual".
- Busca cobre título da KR, título do objetivo **e nome do time**.
- **Sem seletor de impacto** no popover. Após selecionar a KR, basta clicar em "Vincular".

## Mutations
- `useAddProjectKrLink` / `useAddMilestoneKrLink` recebem `{ kr_id, kind: 'team'|'org', impact }` (assinatura preservada por compat) e gravam na coluna correta.
- Call sites na UI passam **sempre `impact: 'medium'`** — campo é detalhe interno do schema.
- Unlink usa o par `(project_id|milestone_id, kr_id)` filtrando pela coluna correspondente ao `kind`.

## Navegação
KR já vinculada continua linkando para `/okrs?...` (padrão atual). Não foi criada rota dedicada nesta entrega.
