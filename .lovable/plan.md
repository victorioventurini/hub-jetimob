## Objetivo

Em **Pré-MBR** e **Pré-QBR**, exibir apenas projetos/milestones onde o líder do time ou algum liderado (membros do time + subtimes, recursivamente) seja responsável.

## Regra de filtro (única, compartilhada)

Para o time selecionado no rito:

1. **Árvore de times** = time + todos os descendentes (via `team_is_descendant` ou `parent_team_id` recursivo).
2. **Membros** = união de:
   - `teams.leader_user_id` de cada time da árvore
   - `user_team_memberships.user_id` de cada time da árvore
3. **Projetos visíveis** = projetos vinculados via `project_teams` a qualquer time da árvore (já é o comportamento atual de descoberta) E que satisfaçam:
   - `projects.owner_id ∈ membros`, **OU**
   - existe pelo menos um `project_milestones.owner_id ∈ membros` (não deletado) no projeto.
4. **Milestones visíveis dentro do projeto** = apenas aqueles com `owner_id ∈ membros`. O líder não revisa o que não é responsabilidade do time.

## Validação de resultado — guilherme@jetimob.com (time "Comercial")

Árvore: Comercial + Novos Negócios + Parcerias.
Membros (apenas líderes — não há `user_team_memberships`): Guilherme, Gabriel Lobato, Lara Pretto.

Dos 4 projetos vinculados hoje, **apenas 1 passa**:

- **Programa de Treinamento** — owner = Laura Dias Almansa (fora do time), mas tem milestones de Lara e Gabriel. Lista de milestones será restrita a esses dois owners.

Os outros 3 (Billing, Campanha Mês do Gestor, Lançamento Jet.IA) somem porque nem o projeto nem milestone tem responsável no time/subtimes. Nenhum item visível está atrasado.

## Implementação

### 1. Novo hook compartilhado: `useTeamResponsibilityScope(teamId)`

Arquivo: `src/modules/teams/hooks/useTeamResponsibilityScope.ts`.

Retorna `{ teamIds: string[]; memberProfileIds: Set<string>; isLoading: boolean }`.

Estratégia:
- Query 1: `teams.select('id, leader_user_id').or('id.eq.<teamId>,parent_team_id.eq.<teamId>')` em loop BFS (profundidade típica ≤ 3) até esgotar — evita migração; OU usar a função `team_is_descendant` via `select('id, leader_user_id').filter('id','in','(...)')` se preferirmos viewer SQL. Decisão: loop client-side (sem migração nova).
- Query 2: `user_team_memberships.select('user_id').in('team_id', teamIds)`.
- Memoiza `memberProfileIds = new Set([...leaders, ...memberships])`.
- BU isolation: `useBuScopedSupabase` (todas as queries herdam RLS).

### 2. Pré-MBR — `useMbrPreTeamProjects.ts`

- Importar `useTeamResponsibilityScope(teamId)`.
- Adicionar `owner_id` ao `PROJECT_COLUMNS` e a `project_milestones(...)`.
- No `useMemo`:
  - Filtrar milestones por `owner_id ∈ memberProfileIds` antes de calcular `total/done/pct/health/overdue`.
  - Descartar projeto se `owner_id ∉ memberProfileIds` E `milestones.length === 0` após filtro.
- Versionar `mbrKeys.preTeamProjects` (bump) para invalidar cache antigo. Incluir `memberProfileIds.size` ou um hash estável na key? Não — basta versionar o nome da key; o conjunto de membros é determinístico por `teamId`.
- `enabled` aguarda `!scope.isLoading`.

### 3. Pré-QBR — não alterar `useProjectsForWizard`

`useProjectsForWizard` é genérico (consumido fora do QBR). Criar wrapper QBR-only:

Arquivo: `src/modules/okrs/hooks/useQbrPreTeamProjects.ts`.
- Chama `useProjectsForWizard(teamId)` + `useTeamResponsibilityScope(teamId)`.
- Retorna projetos filtrados (mesma regra) com `milestones` reduzidos.

Consumidores QBR-pré a atualizar:
- `UnlinkedProjectsList.tsx` — trocar `useProjectsForWizard` por `useQbrPreTeamProjects` (mantém props/comportamento; só muda a fonte).

Validar com `rg "useProjectsForWizard"` quais outros consumidores existem; se houver outro QBR-pré usando direto, aplicar o mesmo wrapper. Outras rotas (KR detail, geral) ficam intocadas.

### 4. Empty state

`MbrPreProjectsStep.tsx` e o `UnlinkedProjectsList.tsx` já lidam com lista vazia. Ajustar copy quando aplicável:

> "Nenhum projeto ou milestone sob responsabilidade sua ou do seu time/subtimes."

## Compliance com regras do projeto

- BU Isolation: todas as queries via `useBuScopedSupabase` + `bu_id`. ✓
- Identity: leitura apenas; sem mutations. `realProfileId` não se aplica. ✓
- Soft Delete: `projects.deleted_at IS NULL`; `project_milestones.deleted_at IS NULL` (sem `cancelled_at` em milestones). ✓
- Sem `select('*')`; colunas listadas. ✓
- Query keys via `src/lib/queryKeys/*.ts` (versionar `mbrKeys` + adicionar `qbrKeys.preTeamProjects` se necessário). ✓
- `React.memo` mantido nos componentes existentes. ✓
- Sem migração, sem RLS nova, sem mudança em Edge Functions. ✓

## Arquivos tocados

- **Novo:** `src/modules/teams/hooks/useTeamResponsibilityScope.ts`
- **Novo:** `src/modules/okrs/hooks/useQbrPreTeamProjects.ts`
- **Edit:** `src/modules/okrs/hooks/useMbrPreTeamProjects.ts`
- **Edit:** `src/modules/okrs/components/wizards/qbr-pre/UnlinkedProjectsList.tsx`
- **Edit (opcional):** `src/lib/queryKeys/okrs.ts` (bump `preTeamProjects` + adicionar key QBR)
- **Edit (cópia, opcional):** `MbrPreProjectsStep.tsx` se for ajustar copy de empty state.

## Pergunta antes de implementar

Confirma a interpretação de **ocultar milestones de não-membros dentro de projetos visíveis** (proposta acima)? A alternativa é mostrar todos os milestones do projeto e apenas usá-los para qualificar o projeto na lista — mas isso reintroduz no rito itens de outros responsáveis.
