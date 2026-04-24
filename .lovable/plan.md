# Plano — Vínculo de KRs em Projetos/Milestones

## Objetivo
Permitir vincular Projetos e Milestones tanto a **Team KRs** quanto a **Org KRs**, listando apenas KRs do **ciclo ativo (quarter + year)**, excluindo arquivadas/canceladas, com UI aprimorada (agrupamento por Objetivo + badges de tipo e RAG).

## Decisões aprovadas
1. Schema XOR com nova coluna `org_key_result_id`
2. Ciclo ativo = quarter ativo **+** year ativo
3. Navegação ao clicar em KR vinculada: manter `/okrs?...` (sem nova rota)

## 1. Migration (schema)
- `project_krs`: adicionar `org_key_result_id uuid REFERENCES okr_org_key_results(id) ON DELETE CASCADE`; tornar `key_result_id` nullable.
- `milestone_krs`: idem.
- Trigger `enforce_one_kr_link_xor()` BEFORE INSERT/UPDATE em ambas as tabelas: garante exatamente um dos dois IDs preenchido (proibido CHECK — usar trigger conforme `mem://standards/database/check-constraint-prohibition`).
- Índices parciais em `org_key_result_id` (WHERE NOT NULL).
- Backfill: nenhum (vínculos atuais permanecem como team).

## 2. Hook `useKrsForLinking`
- Receber `activeCycleIds: string[]` (quarter + year ativos via `useActiveCycle().activeCycles`).
- Duas queries paralelas:
  - `okr_team_key_results`: filtro por `bu_id`, `cycle_id IN (...)`, `deleted_at IS NULL`, `cancelled_at IS NULL`. Join com objective + cycle.
  - `okr_org_key_results`: mesmo filtro. Join com objective + cycle.
- Union retornando `{ id, title, kind: 'team'|'org', objective_title, cycle_name, status, rag }`.
- Query key: `projectsKeys.krsForLinking(buId, cycleIds)`.
- Colunas explícitas (sem `select('*')`).

## 3. UI dos popovers
Componentes: `ProjectKrLinkSection`, `MilestoneKrLinkSection`.
- Largura `w-[480px]` (atual `w-80`).
- `CommandGroup` por **Objetivo** (heading com nome do objetivo + badge do ciclo).
- Item da lista: título + `Badge` (`Org`/`Time`) + dot RAG (reuso de `OkrStatusBadge` em modo dot).
- Empty state: "Nenhuma KR ativa no ciclo atual".
- Link de KR já vinculada: mantém destino atual `/okrs?...`.

## 4. Tipos e mutations
- `ProjectKrLink`: adicionar `org_key_result_id?: string | null` e `kind: 'team'|'org'`.
- `useProject.ts`: estender select para `org_kr:okr_org_key_results!project_krs_org_key_result_id_fkey(id, title)`; lógica de fallback no map.
- Mutations (`useLinkProjectKr`, `useUnlinkProjectKr`, `useLinkMilestoneKr`, `useUnlinkMilestoneKr`): aceitar `{ key_result_id?, org_key_result_id? }`; validar XOR no client antes do insert; usar a coluna correta no payload.

## 5. Documentação (memória)
- Criar `mem://features/projects/kr-linking-standard` documentando: schema XOR, filtro por quarter+year, inclusão de org KRs, soft-delete + cancelamento, UI agrupada.
- Atualizar `mem://index.md` (seção "Memórias — Projetos") com referência ao novo standard.

## Compliance (pré-checklist obrigatório)
- TCR + DEVELOPMENT_STANDARDS + DATA_MODEL_REGISTRY consultados
- Regra 1 (BU-scoped): queries filtradas por `bu_id`
- Regra 4: colunas explícitas, sem `select('*')`
- Regra 5: query keys via `projectsKeys`
- `mem://standards/soft-delete-policy-v1`: filtros `deleted_at` + `cancelled_at`
- `mem://standards/database/check-constraint-prohibition`: XOR via trigger
- `mem://features/projects/internal-linking-standard`: navegação preservada
- `mem://features/projects/holistic-module-architecture-v2`: extensão consistente

## Arquivos
- **Migration**: 1 nova
- **Edit**: `src/modules/projects/hooks/useKrsForLinking.ts`, `src/modules/projects/components/ProjectKrLinkSection.tsx`, `src/modules/projects/components/MilestoneKrLinkSection.tsx`, `src/modules/projects/hooks/useProject.ts`, `src/modules/projects/hooks/useProjectKrLinks.ts`, `src/modules/projects/hooks/useMilestoneKrLinks.ts`, `src/modules/projects/types.ts`, `src/lib/queryKeys/projects.ts`
- **Create**: `.lovable/memory/features/projects/kr-linking-standard.md` + update `.lovable/memory/index.md`
