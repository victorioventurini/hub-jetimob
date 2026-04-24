## Correção: Toast de Erro Falso em useUpdateMilestone

### Diagnóstico
Em `src/modules/projects/hooks/useMilestoneMutations.ts`, o hook `useUpdateMilestone` tem dois bugs:
1. **Linha 78**: `toast.error('Erro ao atualizar milestone')` está dentro de `onSuccess`, exibindo erro mesmo em atualizações bem-sucedidas.
2. **Falta `onError`**: Não há handler para erros reais, divergindo do padrão de `useCreateMilestone` e `useSoftDeleteMilestone`.

### Conformidade Documental
- ✅ TCR / DEVELOPMENT_STANDARDS: padrão de feedback via `sonner` toasts mantido.
- ✅ Padrão de mutations do módulo Projects (`holistic-module-architecture-v2`): `onSuccess` invalida queries + toast de sucesso; `onError` loga + toast de erro.
- ✅ Sem mudanças em DB, RLS, tipos ou contratos.

### Mudança
**Arquivo:** `src/modules/projects/hooks/useMilestoneMutations.ts` (linhas 73-82)

```ts
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: projectsKeys.milestonesFor(data.project_id) });
  queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
  queryClient.invalidateQueries({ queryKey: projectsKeys.detailFor(data.project_id) });
  toast.success('Milestone atualizado');
},
onError: (error) => {
  console.error('Error updating milestone:', error);
  toast.error('Erro ao atualizar milestone');
},
```

### Validação Pós-Mudança
- Atualizar milestone em `/projects/:id` deve exibir toast verde "Milestone atualizado".
- Falhas reais (RLS, validação) devem exibir toast vermelho com log no console.

### Arquivos Modificados
- `src/modules/projects/hooks/useMilestoneMutations.ts`