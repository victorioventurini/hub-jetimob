

## Plano: Adicionar seletor de time (HierarchyContextSwitcher) ao wizard QBR Pre

### Contexto

O `QbrPrePage` é o único wizard QBR que opera no nível de **time** (líder). Os demais (QBR Pre C-Level, QBR Meeting, QBR Post) são wizards estratégicos/org-level e não precisam de seleção de time.

Atualmente o `QbrPrePage` usa `(profile as any)?.team_id` fixo, sem permitir que admins da BU escolham outro time — diferente do padrão já implementado no `LeaderPrepPage`.

### O que será feito

Aplicar ao `QbrPrePage` o mesmo padrão do `LeaderPrepPage`:

1. **Ler `team` da URL** via `useSearchParams` em vez de `profile.team_id`
2. **Carregar lista de times** via `useHierarchicalTeamList`
3. **Passar `HierarchyContextSwitcher`** no prop `adminContextSwitcher` do `FullPageWizardShell`
4. **Handler de troca de time**: descartar rascunho atual + atualizar `searchParams`
5. **Fallback**: se nenhum `team` na URL, exibir `EmptyState` orientando o usuário a selecionar um time

### Detalhes técnicos

**Arquivo**: `src/modules/okrs/pages/QbrPrePage.tsx`

Mudanças específicas:
- Substituir `const userTeamId = (profile as any)?.team_id` por `const teamIdParam = searchParams.get('team')`
- Adicionar `useHierarchicalTeamList()` para resolver o objeto `selectedTeam`
- Todas as queries que usam `userTeamId` passam a usar `teamIdParam`
- Adicionar `handleTeamChange` que chama `discardDraft()` + `setSearchParams({ team: newTeamId })`
- Passar `adminContextSwitcher={<HierarchyContextSwitcher type="team" ... />}` ao `FullPageWizardShell`
- Guard de "time não selecionado" com `EmptyState` + botão "Voltar" para `/wizards`

Nenhum outro arquivo QBR precisa ser alterado.

