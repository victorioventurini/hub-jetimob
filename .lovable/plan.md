## Ajustes na tabela de Milestones (`/projects/:id`)

### Mudanças
1. **Grid auto-ajustável** — remover larguras fixas (`w-[140px]`, `w-[200px]`, `w-[120px]`, `w-[60px]`) e deixar a tabela respirar conforme o conteúdo:
   - Status: `w-auto whitespace-nowrap`
   - Nome: `w-full` (coluna flexível, ocupa o espaço restante)
   - Responsável: `whitespace-nowrap`
   - Início / Prazo: `whitespace-nowrap`
   - Ações: `w-px` (ajusta ao ícone)
   - Remover `line-clamp-1` do nome (deixa quebrar se necessário).

2. **Remover coluna "Obs." dedicada** — observações deixam de ser ícone+tooltip.

3. **Linha de observações abaixo da principal**:
   - Quando `milestone.notes` existe, renderizar uma segunda `<TableRow>` logo após a linha principal contendo um único `<TableCell colSpan={6}>` (Status, Nome, Responsável, Início, Prazo, Ações = 6 colunas após remover Obs.).
   - Estilo: `text-xs text-muted-foreground whitespace-pre-wrap` com leve indent (`pl-[140px]` aproximado, alinhando após Status), sem borda superior (`border-t-0`) para visualmente "colar" na linha pai.
   - Texto **completo** das observações (sem truncar, sem tooltip).
   - Linha pai mantém `border-b-0` quando há nota; a linha de notas carrega o `border-b`.

4. **Cabeçalho** atualizado: remover `<TableHead>Obs.</TableHead>`. Total de 6 colunas.

### Arquivos
- `src/modules/projects/components/MilestonesTable.tsx` — único arquivo afetado. Sem mudanças em RLS, hooks, query keys ou tipos.

### Canônicos respeitados
- `mem://standards/frontend-memoization-standard` — `React.memo` mantido em `MilestoneRow` e `MilestonesTable`.
- `mem://ui/portal-event-isolation-standard` — `stopPropagation` do DropdownMenu preservado.
- `mem://features/projects/milestone-permissions-row-aware` — gating row-aware (`canEditMilestone` / `canDeleteMilestone`) inalterado.
- `mem://standards/soft-delete-policy-v1` — filtro `!deleted_at` preservado.
- Sem `select('*')`, sem mudança de query keys, sem tocar em `client.ts` / `types.ts`.
