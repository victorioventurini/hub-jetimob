

## Corrigir RLS no soft-delete de Projetos — `WITH CHECK` falha porque header BU não bate

### Pré-checklist (executado)
- ✅ TCR §3.3.1 (Projetos v1.4) e `mem://features/projects/holistic-module-architecture-v2`
- ✅ `mem://standards/bu-isolation-master` — header `x-current-bu-id` síncrono via `useBuScopedSupabase`
- ✅ `mem://auth/identity-rbac-master` — `my_profile_id()` + `is_bu_admin` para checagem de ownership/role
- ✅ `mem://standards/soft-delete-policy-v1` — soft-delete preserva `bu_id`, só seta `deleted_at`
- ✅ Lidas as policies das 7 tabelas de Projetos no DB (`projects`, `project_milestones`, `project_teams`, `project_krs`, `project_comments`, `project_milestone_dependencies`, `project_comment_attachments`)

### Causa raiz (confirmada via DB)

A política `projects_update` tem:
```
USING:      is_current_bu(bu_id) AND (owner_id = my_profile_id() OR is_bu_admin(...) OR is_leader_of_project_owner(...))
WITH CHECK: is_current_bu(bu_id)
```

O hook `useSoftDeleteProject` faz:
```ts
supabase.from('projects').update({ deleted_at: now() }).eq('id', projectId)
```

Não filtra por `bu_id` no `eq()`. PostgREST envia o UPDATE; PostgreSQL avalia:
1. **USING** (linha antiga): passa para owner/admin/líder + header BU correto.
2. **WITH CHECK** (linha nova): `is_current_bu(NEW.bu_id)`. Como `NEW.bu_id == OLD.bu_id`, deveria passar.

**Erro "new row violates RLS"** acontece **apenas** quando `is_current_bu(NEW.bu_id) = false`. Investigando `is_current_bu`:
- Para `auth.uid()` autenticado, lê o header `x-current-bu-id`.
- Se header **não bate** com `bu_id` da row, retorna `false`.

**Cenário real**: o usuário entra em `/projects/98074a55-...` (BU `a0...001`), mas no momento do clique em Arquivar o `useBuScopedSupabase` está com **outro** `currentBuId` cached (singleton em `globalThis.__hubJet_currentBuId`). Pode acontecer quando:
- Usuário troca de BU em outra aba e a `BU_STORAGE_KEY` é atualizada — `getCurrentBuId()` lê localStorage como fallback e devolve a BU nova (errada para este projeto).
- Race condition: o componente renderiza com `currentBuId` antigo, o `BuContext` muda durante o handler.
- Singleton stale após HMR/recarga parcial.

Resultado: header enviado é da BU "atual" do usuário, **diferente** da BU do projeto → `is_current_bu(NEW.bu_id) = false` → erro RLS exato relatado.

Há também um **bug latente** que vale corrigir junto: ao fazer `update().eq('id', projectId)` sem filtro de `bu_id`, o cliente confia 100% na RLS para barrar cross-BU. Funciona, mas o erro fica obscuro. Adicionar `.eq('bu_id', currentBuId)` explicitamente:
1. Faz o UPDATE afetar **0 linhas** (em vez de erro RLS) quando há mismatch — mais seguro e diagnosticável.
2. Garante que mesmo com header stale, só a BU correta seja afetada.

### Correção (mínima, 1 arquivo)

**`src/modules/projects/hooks/useProjectMutations.ts`** — `useSoftDeleteProject`:

1. Importar `useCurrentBuId` (helper canônico já existente em `src/hooks/useBuScope.ts`).
2. Recuperar `buId` do projeto antes de arquivar (refetch leve via `select('bu_id').eq('id', projectId).single()`) **OU** receber `buId` como segundo parâmetro do mutate.
3. Validar que `buId` do projeto é igual ao `currentBuId` do contexto. Se diferente → toast claro ("Este projeto pertence a outra BU. Troque para a BU correta antes de arquivar.") e abortar.
4. Adicionar `.eq('bu_id', buId)` ao UPDATE (defesa em profundidade).
5. Verificar `count` retornado: se 0, lançar erro "Sem permissão para arquivar este projeto".

Abordagem mais simples e zero-fricção (mantém assinatura atual de `mutate(projectId)`):

```ts
export function useSoftDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!supabase || !currentBuId) throw new Error('Client/BU não pronto');

      // Defense in depth: filtra explicitamente por bu_id corrente.
      // Evita erro RLS obscuro quando header está stale + garante isolamento.
      const { error, count } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
        .eq('id', projectId)
        .eq('bu_id', currentBuId)
        .is('deleted_at', null);

      if (error) throw error;
      if (count === 0) {
        throw new Error('Projeto não pôde ser arquivado (sem permissão ou BU incorreta).');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.listPrefix() });
      toast.success('Projeto arquivado');
    },
    onError: (error: any) => {
      console.error('[useSoftDeleteProject]', error);
      const detail = error?.message || error?.details || error?.hint || 'Erro desconhecido';
      toast.error(`Erro ao arquivar projeto: ${detail}`);
    },
  });
}
```

### Por que não mexer no banco
- A política `projects_update` está **correta semanticamente** (BU isolation + ownership/admin/leader).
- O erro é de comportamento do cliente (BU header stale) + falta de defesa em profundidade no mutate.
- Mudar RLS ampliaria superfície de risco sem corrigir a raiz.

### Centralização preservada
- Continua usando `useBuScopedSupabase` (SSOT de cliente BU-scoped).
- Continua usando `useBu` para `currentBuId` (SSOT de contexto BU).
- Padrão já adotado em outros mutations do módulo (`useUpdateProject` etc.) — apenas estende `useSoftDeleteProject` para ficar consistente.
- Zero novo componente, zero novo hook.

### Validação pós-correção

1. **Caso feliz** (admin de BU 001 arquivando projeto da BU 001): toast "Projeto arquivado", redireciona para `/projects`.
2. **Caso BU stale** (usuário trocou de BU em outra aba): toast claro "sem permissão ou BU incorreta", sem erro RLS críptico.
3. **Caso colaborador comum sem permissão na BU correta**: count = 0 (USING falha), toast claro.
4. **Sanity check**: arquivar e desarquivar (via outro fluxo) continua funcional. Lista de projetos atualiza.
5. **Sem regressão**: `useUpdateProject`, `useCreateProject`, milestones e comments continuam intactos.

### Arquivos afetados
- `src/modules/projects/hooks/useProjectMutations.ts` — `useSoftDeleteProject` (defesa em profundidade + mensagem de erro acionável).

### Documentação canônica
- Nota no changelog do TCR §3.3.1: "hotfix soft-delete projetos — mutate filtra explicitamente por `bu_id` corrente + valida `count`. Elimina erro RLS obscuro em cenários de header BU stale; mantém RLS server-side intacta."
- Reforça `mem://standards/bu-isolation-master`: mutates BU-sensíveis devem aplicar `.eq('bu_id', currentBuId)` como defesa em profundidade, não apenas confiar em RLS.

### Princípios respeitados
- BU Isolation (defesa em profundidade — filtro explícito + RLS)
- Sem `select('*')` (apenas `update + count`, sem leitura)
- Sem CHECK constraint, sem mudança de schema/RLS
- Soft-delete preservado (apenas `deleted_at`)
- Componentes/hooks centralizados — zero duplicação

