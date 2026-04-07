

## Plano: Exibir relatório cacheado ao acessar a página

### Problema
O hook `useQbrExecutiveReport` já busca relatórios persistidos no banco (`okr_wizard_sessions`), mas enquanto a query carrega (`isLoading = true`), a página mostra o card "Gerar relatório" em vez de um loading spinner. Isso faz parecer que não existe cache.

### Solução
Adicionar tratamento do estado `isLoadingReport` na página para mostrar um loading enquanto a query busca o relatório cacheado.

### Arquivo a editar

**`src/modules/okrs/pages/QbrExecutiveReportPage.tsx`**

Na seção de renderização condicional (linha ~394), adicionar o estado `isLoadingReport` antes do check de `report`:

```
{isLoadingReport ? (
  <LoadingState />
) : isGenerating ? (
  <GeneratingState />
) : report ? (
  <ReportDisplay ... />
) : (
  /* Card "Gerar relatório" */
)}
```

Isso é a única mudança necessária — a infraestrutura de cache (query ao banco + staleTime de 5min) já existe e funciona.

