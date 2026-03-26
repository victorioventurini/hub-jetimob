

## Plano: UI de vinculação de KRs a Projetos

### Contexto (pré-checklist ✅)

Documentação revisada:
- **TCR v3.18.0** — Módulo Projetos v1.0, tabela `project_krs` com campos `project_id`, `key_result_id`, `impact`
- **DATA_MODEL** — KRs vivem em `okr_team_key_results`, relação N:N via `project_krs`
- **Identity Convention** — `owner_id` = `profiles.id`, sem comparação com `auth.uid()`
- **RBAC** — `useProjectPermissionsV2` com `canEditProject` como gate para vincular/desvincular KRs
- **BU Scoping** — `useOptionalBuClient` + filtro `.eq('bu_id', buId)` obrigatório
- **Query Keys** — `projectsKeys.detail()`, `projectsKeys.byKr()` já existem
- **Hooks prontos** — `useAddProjectKrLink` e `useRemoveProjectKrLink` já implementados e exportados

### Situação atual

O backend e os hooks de mutação estão prontos. A `ProjectDetailPage` já exibe KRs vinculadas (read-only, linhas 247-264). Falta apenas a UI interativa para **adicionar e remover** vínculos.

### Implementação (3 arquivos)

#### 1. Hook `useKrsForLinking` (novo)
**Arquivo:** `src/modules/projects/hooks/useKrsForLinking.ts`

- Busca KRs disponíveis na BU atual: `okr_team_key_results` com `.eq('bu_id', buId)`, `.is('deleted_at', null)`, campos `id, title, status, objective:okr_team_objectives(title)`
- Query key: adicionar `krsForLinking` em `projectsKeys`
- Retorna lista flat `{ id, title, objective_title, status }`

#### 2. Componente `ProjectKrLinkSection` (novo)
**Arquivo:** `src/modules/projects/components/ProjectKrLinkSection.tsx`

- **Props:** `projectId`, `linkedKrs` (array atual), `canEdit` (boolean)
- **Read-only:** Lista KRs vinculadas com impacto traduzido (Alto/Médio/Baixo)
- **Edição (se `canEdit`):**
  - Botão "Vincular KR" abre Popover/Combobox com busca
  - Lista KRs disponíveis (filtrando já vinculadas) agrupadas por objetivo
  - Ao selecionar, pede o nível de impacto (high/medium/low) via Select inline
  - Chama `useAddProjectKrLink().mutate()`
  - Cada KR vinculada tem botão de remover → `useRemoveProjectKrLink().mutate()`
- Padrão UI: consistente com `MultiTeamSelect` (Popover + lista com checkbox)

#### 3. Integração na `ProjectDetailPage`
**Arquivo:** `src/modules/projects/pages/ProjectDetailPage.tsx`

- Substituir o bloco read-only atual (linhas 247-264) pelo novo `ProjectKrLinkSection`
- Passar `canEdit={canEditProject}` como gate de permissão
- Remover lógica inline de renderização de KRs

#### 4. Query key (atualização menor)
**Arquivo:** `src/lib/queryKeys/projects.ts`

- Adicionar: `krsForLinking: (buId) => ['projects', 'krs-for-linking', buId] as const`

### Conformidade

| Regra | Status |
|-------|--------|
| BU-scoped client (`useOptionalBuClient`) | ✅ |
| Frontend `.eq('bu_id', buId)` | ✅ |
| Query keys centralizadas | ✅ |
| RBAC via `canEditProject` | ✅ |
| Identity: `profiles.id` | ✅ |
| Sem `select('*')` | ✅ |
| Hooks existentes reutilizados | ✅ |
| Invalidação de cache (detail + byKr) | ✅ já nos hooks |

