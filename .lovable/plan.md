

## Plano: Vincular projetos a KRs pela UI de OKRs

### Situação atual

- O componente `ProjectsForKrSection` já existe (`src/modules/projects/components/ProjectsForKrSection.tsx`) e exibe projetos vinculados a um KR (read-only).
- **Ele não é usado em nenhum lugar.** A UI de OKR não mostra nem permite gerenciar projetos vinculados.
- Na expansão de um KR no dashboard (`ObjectiveListItem.tsx`, linha 678), apenas `InitiativesList` é renderizada.

### O que será feito

#### 1. Exibir `ProjectsForKrSection` no KR expandido
**Arquivo:** `src/modules/okrs/components/dashboard/ObjectiveListItem.tsx`

- Abaixo do bloco `InitiativesList` (linha 693), adicionar `ProjectsForKrSection` passando `krId={kr.id}`.
- Renderizar apenas para KRs de time (`type === 'team'` e `showInitiatives`), mesmo guard existente.
- Read-only — mostra projetos já vinculados com saúde, progresso e impacto.

#### 2. Adicionar capacidade de vincular/desvincular projetos do KR (interativo)
**Arquivo:** `src/modules/projects/components/ProjectsForKrSection.tsx`

- Adicionar prop opcional `canEdit` (boolean, default `false`).
- Quando `canEdit=true`:
  - Botão "Vincular Projeto" abre Popover com busca de projetos da BU (reutilizar hook existente ou criar `useProjectsForLinking`).
  - Select inline de impacto (high/medium/low) antes de confirmar.
  - Chama `useAddProjectKrLink` (já existe).
  - Cada projeto listado ganha botão de remover → `useRemoveProjectKrLink` (já existe).
- Padrão visual consistente com `ProjectKrLinkSection` (que faz o inverso: vincula KRs a projetos).

#### 3. Hook `useProjectsForLinking` (novo)
**Arquivo:** `src/modules/projects/hooks/useProjectsForLinking.ts`

- Busca projetos da BU atual (não deletados, status != cancelled).
- Retorna `{ id, name, status, health }` para seleção.
- Query key em `projectsKeys`.

#### 4. Passar `canEdit` no ObjectiveListItem
- Reutilizar a mesma lógica de permissão já aplicada ao `InitiativesList`: `canDoEdit || canDoCheckin`.

### Conformidade

| Regra | Status |
|---|---|
| BU-scoped client | ✅ `useOptionalBuClient` |
| Frontend `.eq('bu_id')` | ✅ |
| Query keys centralizadas | ✅ |
| Hooks de mutação reutilizados | ✅ |
| Sem `select('*')` | ✅ |
| RBAC via permissão existente | ✅ |

