## Milestones em formato tabela + ações por linha (com gating canônico)

### Objetivo
Em `/projects/:id`, substituir a lista de milestones por uma **tabela** (estilo `/tickets`) e adicionar **menu de ações** ao final de cada linha:
- **Editar:** responsável pelo projeto OU responsável pela milestone (+ caminhos estruturais canônicos)
- **Remover:** somente responsável pelo projeto (+ caminhos estruturais canônicos)

### Mudanças

**1. RLS — `project_milestones.UPDATE`**
Migração ampliando apenas `UPDATE` para incluir `project_milestones.owner_id = my_profile_id()`. `SELECT/INSERT/DELETE` inalterados.

**2. Hook — `useProjectPermissionsV2`**
- Adicionar flag `canDeleteMilestone` (espelha `projects.milestone.delete:bu`).
- Adicionar helpers row-aware `canEditMilestoneRecord(milestoneOwnerId, projectOwnerId, actorProfileId, isLeaderOfOwner)` e `canDeleteMilestoneRecord(...)`.

**3. Novo componente — `MilestonesTable`**
- `@/components/ui/table` (mesmo padrão de `TicketsTable`)
- Colunas: Status, Nome, Responsável, Início, Prazo, Observações, Ações
- `React.memo` no componente e nas linhas
- `DropdownMenu` com `MoreHorizontal` (itens com `e.stopPropagation()` — canônico portal isolation)
- Itens "Editar" / "Remover" condicionados aos helpers row-aware

**4. `ProjectDetailPage.tsx`**
- Substituir `MilestoneList` por `MilestonesTable` na view "Lista"
- Estado `editingMilestone` para reusar `MilestoneDialog` (já suporta `defaultValues`)
- `AlertDialog` de confirmação de remoção
- Calcula gating row-aware via novos helpers do hook

**5. Documentação**
- `mem://features/projects/milestone-permissions-row-aware`: nova memória descrevendo a regra
- Atualizar `mem://index.md`

### Arquivos
- `supabase/migrations/<ts>_milestone_owner_can_update.sql`
- `src/modules/projects/hooks/useProjectPermissionsV2.ts` (edit)
- `src/modules/projects/components/MilestonesTable.tsx` (novo)
- `src/modules/projects/components/__tests__/MilestonesTable.test.tsx` (novo)
- `src/modules/projects/pages/ProjectDetailPage.tsx` (edit)
- `mem://features/projects/milestone-permissions-row-aware` (novo)
- `mem://index.md` (edit)
