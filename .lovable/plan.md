
## Contexto (pós-checklist)

- **TCR / `mem://features/okrs/contributor-kr-uses-modal`**: KRs contribuidoras vivem em `okr_team_key_results` (Team KR). O `ContributingOkrCard` já é o ponto único de UI da contribuição.
- **Padrão atual em Team KR (`ObjectiveListItem.tsx` linhas 729–749)**: quando expandida, uma KR de time mostra `<InitiativesList>` + `<ProjectsForKrSection>` lado a lado.
- **Hooks já genéricos e reaproveitáveis** (sem novo código backend):
  - `useKrInitiatives(krId)` — não distingue Team/Org KR.
  - `useProjectsForKr(krId)` / `useMilestonesForKr(krId)` — consultam `project_krs.key_result_id` (Team KR), exatamente o caso da KR contribuidora.
  - `useAddProjectKrLink({ kind: 'team' })` — já suporta o vínculo.
  - `useCanManageTeamOkr(teamId)` — já governa permissão de líder do time contribuidor.
- **`mem://features/projects/internal-linking-standard`** e **`mem://features/projects/kr-linking-standard`** definem que o componente correto é `ProjectsForKrSection` com popover de `w-[480px]` e impacto fixo `'medium'` (sem seletor).
- **Gap**: `ContributingOkrCard` hoje exibe apenas título/progresso por KR contribuidora — **não** monta `InitiativesList` nem `ProjectsForKrSection`. É a única coisa que falta.

Não há necessidade de migração de schema, novas RLS, novos hooks ou novos componentes — toda a infra já existe e é canônica.

## Plano de execução

### 1. Expandir o card de KR contribuidora em `ContributingOkrCard.tsx`

Arquivo: `src/modules/okrs/components/team-view/ContributingOkrCard.tsx`

- Transformar cada item de `contributedKrs` num bloco expansível (toggle por chevron, ou expansor único como em `ObjectiveListItem`).
- Quando expandido, renderizar abaixo do progresso da KR:
  ```tsx
  <InitiativesList
    krId={kr.id}
    krTitle={kr.title}
    krContext={{
      id: kr.id,
      title: kr.title,
      objectiveTitle: objective.title,
      teamName: objective.team?.name,
    }}
    krTeamId={currentTeamId}                // time contribuidor é dono da KR
    canEdit={canContribute}                 // mesma permissão que governa "Adicionar KR"
    isDraft={objective.status === 'draft'}
  />
  <ProjectsForKrSection
    krId={kr.id}
    krKind="team"                            // KR contribuidora = Team KR
    canEdit={canContribute}
  />
  ```
- Estado local `expandedKrId: string | null` para controlar o expand (ou `Set` se quisermos múltiplos abertos — alinhar com padrão de `ObjectiveListItem`).
- `React.memo` já está em uso; manter.

### 2. Permissão (sem regressão)

`canContribute` no card já reflete "líder do time contribuidor ou admin", que é o mesmo critério que `useCanManageTeamOkr(currentTeamId)` aplica internamente em `InitiativesList`. Não há nova lógica de RBAC. RLS de `project_krs_insert` e `okr_initiatives` já cobrem o caso (KR pertence ao time do usuário).

### 3. Atualizar memória canônica

Atualizar `mem://features/okrs/contributor-kr-uses-modal` com a seção:

> **Iniciativas e Projetos em KR contribuidora**
> Cada KR contribuidora exibida no `ContributingOkrCard` é expansível e renderiza `InitiativesList` + `ProjectsForKrSection` (`krKind="team"`), idêntico ao padrão de Team KR em `ObjectiveListItem`. Permissão herda de `canContribute`. Nenhum hook/RLS específico — reuso 100% do canon.

### 4. Validação

- `bunx tsc --noEmit -p tsconfig.app.json` — tipos limpos.
- QA visual no preview: `/okrs?view=team&team_id=...` → expandir KR contribuidora → verificar (a) listar iniciativas existentes, (b) criar iniciativa, (c) vincular projeto via popover, (d) desvincular.

## O que NÃO será feito (fora de escopo / já coberto)

- Não criar novos hooks, componentes ou rotas.
- Não tocar em `useProjectsForKr`/`useMilestonesForKr` — já funcionam para Team KR.
- Não alterar schema `project_krs`/`milestone_krs` nem RLS.
- Não reintroduzir seletor de impacto (proibido por `mem://features/projects/kr-linking-standard`).

## Arquivos afetados

- `src/modules/okrs/components/team-view/ContributingOkrCard.tsx` (única mudança de código)
- `.lovable/memory/features/okrs/contributor-kr-uses-modal.md` (atualização de doc)
