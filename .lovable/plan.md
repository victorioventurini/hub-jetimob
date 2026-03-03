
# Plano: Adicionar MbrWizardCard ao Executive Dashboard

## Contexto

Os wizard cards seguem um padrao de distribuicao por audiencia:
- **Home/LeaderDashboard**: cards operacionais (Collaborator, Leader Prep, Team Check-in, OKR Creation)
- **Executive Dashboard** (`/okrs/executive`): cards estrategicos (Managers, C-Level)
- **MBR**: nao esta renderizado em nenhuma pagina

O MBR e um rito estrategico com `requiresBuAdmin`, mesma audiencia do Executive Dashboard. Portanto, o local correto e o **Executive Dashboard**.

## Alteracao

**Arquivo:** `src/modules/okrs/pages/ExecutiveDashboardPage.tsx`

1. Importar `MbrWizardCard` e `useLastCompletedSession`
2. Chamar `useLastCompletedSession('mbr')` para obter a data do ultimo MBR
3. Adicionar o card ao grid de wizard entry points (linha 78), expandindo para 3 colunas
4. Passar `lastMbrDate` e `isLoading`

```text
Grid atual (2 colunas):
+---------------------------+---------------------------+
| ManagersCheckinWizardCard | CLevelCheckinWizardCard   |
+---------------------------+---------------------------+

Grid atualizado (3 colunas):
+------------------+------------------+------------------+
| ManagersCheckin  | CLevelCheckin    | MbrWizardCard    |
+------------------+------------------+------------------+
```

## Detalhes Tecnicos

- Grid muda de `md:grid-cols-2` para `md:grid-cols-3`
- `useLastCompletedSession('mbr')` ja existe e busca o ultimo `okr_wizard_sessions` com `wizard_type='mbr'` e `status='completed'`
- Nenhuma nova dependencia, migracao ou rota necessaria
- Estimativa: ~10 linhas alteradas em 1 arquivo
