# Pré-Weekly v2.1 — Team Switcher no header

## Pré-checklist confirmado
- ✅ TCR + `hierarchy-context-switcher-standard` (mem) — padrão canônico aplicado em LeaderPrep, TeamCheckin, MbrPre, QbrPre.
- ✅ `FullPageWizardShell` já expõe o slot `adminContextSwitcher` (linha 92/236).
- ✅ `HierarchyContextSwitcher` já implementa as 3 regras de visibilidade exigidas (admin sempre, líder com 2+ times, líder único oculto) — sem necessidade de lógica nova.
- ✅ `useGenericWizardDraft` aceita `teamId` para segregar drafts por time (gating com `enabled`).
- ✅ `off-cycle-accessibility-standard` mantido (`cycleId: null` continua válido).

## Mudanças (1 arquivo)

**`src/modules/okrs/pages/PreWeeklyPage.tsx`**

1. **Imports adicionais**
   - `useSearchParams` de `react-router-dom`
   - `HierarchyContextSwitcher` de `shared/HierarchyContextSwitcher`
   - `useHierarchicalTeamList` de `@/modules/teams/hooks`
   - `LoadingState` / `EmptyState` para estados de gating
   - `usePermissions` para distinguir admin × líder
   - `useManageableTeamsFlat` para fallback de líder com 1 time (auto-seleção)

2. **State da URL (regra inquebrável #7)**
   ```ts
   const [searchParams, setSearchParams] = useSearchParams();
   const teamIdParam = searchParams.get('team');
   ```

3. **Resolver time selecionado + auto-seleção para líder com 1 time**
   - `useHierarchicalTeamList()` para resolver nome do time selecionado.
   - Se não-admin e `manageableTeams.length === 1` e sem `?team=`, redirecionar URL para `?team=<id>` (UX seamless, idêntico ao LeaderPrep).

4. **Draft segregado por time**
   ```ts
   useGenericWizardDraft({
     wizardType: 'pre-weekly',
     teamId: teamIdParam,        // antes: null
     cycleId: null,
     defaultStep: 'sources',
     defaultData: DEFAULT_DATA,
     enabled: !!teamIdParam,     // gating
   });
   ```

5. **`handleTeamChange`** — descarta draft atual e troca o `?team=` (mesma assinatura do LeaderPrep).

6. **Empty state** quando admin abre sem `?team=`:
   - `EmptyState` com CTA "Selecionar time" abrindo o switcher (ou texto "use o seletor no header").

7. **Slot `adminContextSwitcher` no `FullPageWizardShell`**
   ```tsx
   adminContextSwitcher={
     <HierarchyContextSwitcher
       type="team"
       currentLabel={selectedTeam?.name || 'Selecionar time'}
       selectedId={teamIdParam}
       onSelect={handleTeamChange}
       isLoading={isLoadingTeams}
     />
   }
   ```

## Regras de visibilidade (já garantidas pelo componente)
| Perfil | Comportamento |
|---|---|
| Super-admin / BU-admin | Switcher sempre visível; precisa selecionar time para começar |
| Líder de 2+ times | Switcher visível, restrito aos times que gerencia |
| Líder de 1 time | Switcher oculto + auto-seleção via URL |
| Colaborador sem times | Empty state ("você não lidera nenhum time") |

## Documentação
- Atualizar `mem://ui/rituals/hierarchy-context-switcher-standard` para incluir `pre-weekly` na lista canônica de rituais que adotam o padrão.
- Atualizar `mem://features/rituals/pre-weekly-v2-standard` com a nota de v2.1 (team-scoped + switcher).

## Não-objetivos
- Não mexe em `useWeeklyPreWeeklyAggregation` (já é BU-scoped, não precisa de teamId).
- Não cria nova RPC, tabela, ou permission key.
- Não altera os 4 steps do wizard.
- Não toca em `okr_wizard_sessions` (a coluna `team_id` já existe e é usada pelo `useGenericWizardDraft`).

## Testes manuais
1. Admin abre `/rituals/pre-weekly` → vê switcher, sem time selecionado, empty state.
2. Admin seleciona time A → wizard carrega; preenche e troca para time B → draft de A é descartado, time B começa do zero.
3. Líder de 2 times → vê switcher restrito aos seus times.
4. Líder de 1 time → URL auto-popula `?team=<id>`, switcher oculto, fluxo idêntico ao atual.
5. Refresh com `?team=<id>` → estado preservado.
