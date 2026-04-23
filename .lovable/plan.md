
## Diagnóstico definitivo

Auditei o banco em produção. **Nenhuma role está faltando**. Você está com:

- `user_roles.role = 'super_admin'` (registrado em 2025-12-31) ✅
- `bu_user_memberships.role_in_bu = 'admin'` na BU `a0000000-0000-0000-0000-000000000001` ✅
- `manager_user_id` do owner do projeto (Uriel Canfield) aponta para o seu `profile_id` ✅
- Avaliando a RLS direto no banco com seus IDs:
  - `is_platform_admin(seu user_id)` → `true`
  - `is_bu_admin(seu user_id, bu do projeto)` → `true`
  - `is_leader_of_project_owner(...)` → `true`

A RLS `projects_update` libera por **três caminhos independentes**, todos `true` para você. **O banco não está te negando.**

## Onde está o bug real

O hook `useSoftDeleteProject` (`src/modules/projects/hooks/useProjectMutations.ts:120-176`) faz:

```ts
.update({ deleted_at: ... }, { count: 'exact' })
.eq('id', projectId)
.eq('bu_id', currentBuId)        // ← BU do CONTEXTO, não do projeto
.is('deleted_at', null);

if (count === 0) {
  throw { code: '42501', message: 'sem permissão ou BU incorreta' };
}
```

Quando `currentBuId` (do `BuContext`) não coincide com `project.bu_id`, o filtro casa zero linhas, `count = 0`, e o hook **fabrica um erro `42501` falso** com a mensagem "sem permissão". O `onError` então mostra "Você não tem permissão para arquivar este projeto" — mensagem totalmente errada para o que aconteceu.

Isso pode acontecer em três cenários reais:

1. Você abriu o projeto via link direto (`/projects/<id>`) e o `BuContext` está com outra BU selecionada (ex.: `f3d2d8a5-...` em vez da `a0000000-...0001` do projeto).
2. A persistência da BU corrente no `localStorage` está dessincronizada do projeto sendo visto.
3. Mudança recente de header `x-bu-id` no `useBuScopedSupabase` ainda não propagou no momento do clique.

Adicionalmente, mesmo que a BU estivesse certa, o RLS do header `x-bu-id` (`is_current_bu`) compara com `current_bu_id()` derivado do header. Se o cliente buScoped envia uma BU diferente da do projeto, a policy retorna `false` no `is_current_bu(bu_id)` antes mesmo de avaliar os 3 caminhos de admin/owner/leader — exceto que `is_current_bu` já tem um shortcut para `is_platform_admin`, então isso não é o seu caso. O bloqueio real é o `count = 0` do filtro extra.

## Plano de correção

Atacar a causa-raiz no frontend. Sem migration, sem mexer em RLS (o banco está correto).

### 1. `useSoftDeleteProject` — usar `bu_id` do projeto, não do contexto

**Arquivo:** `src/modules/projects/hooks/useProjectMutations.ts`

Mudar a assinatura para aceitar o `bu_id` do registro e remover o filtro estrito por `currentBuId`:

```ts
type SoftDeleteInput = { id: string; bu_id: string };

return useMutation({
  mutationFn: async ({ id, bu_id }: SoftDeleteInput) => {
    if (!supabase) throw new Error('Client not ready');

    const { error, count } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id)
      .eq('bu_id', bu_id)            // BU do PROJETO
      .is('deleted_at', null);

    if (error) throw error;

    if (count === 0) {
      // count=0 sem error é AMBÍGUO. Não mais fingir 42501.
      // Pode ser: (a) RLS negou silenciosamente, (b) já estava arquivado,
      // (c) registro inexistente. Diferenciamos com SELECT diagnóstico.
      const { data: probe, error: probeErr } = await supabase
        .from('projects')
        .select('id, deleted_at, bu_id')
        .eq('id', id)
        .maybeSingle();

      if (probeErr) throw probeErr;
      if (!probe) {
        throw new Error('Projeto não encontrado.');
      }
      if (probe.deleted_at) {
        // Idempotência: já estava arquivado, tratar como sucesso.
        return;
      }
      // Existe, não está arquivado, mas update não afetou → RLS real
      const rlsErr = new Error('Sem permissão para arquivar este projeto.');
      (rlsErr as any).code = '42501';
      throw rlsErr;
    }
  },
  // ...resto igual
});
```

### 2. `useUpdateProject` — mesmo tratamento

Aplicar a mesma lógica: aceitar `bu_id` no input, remover dependência de `currentBuId` na cláusula, e usar probe `SELECT` antes de classificar erro.

### 3. `ProjectDetailPage` — passar `project.bu_id` na mutation

**Arquivo:** `src/modules/projects/pages/ProjectDetailPage.tsx`

```ts
deleteProject.mutate({ id: project.id, bu_id: project.bu_id });
```

E o mesmo no `updateProject.mutate(...)`.

### 4. Mensagens de erro mais honestas

No `onError` parar de fundir "BU divergente" com "RLS negou". Hoje a mensagem "Você não tem permissão" é exibida em qualquer `count === 0`, o que mascara bugs como este por dias.

### 5. Telemetria temporária

Manter o `console.info` que já existe, mas incluir:
- `project.bu_id` (do registro)
- `currentBuId` (do contexto)
- `permissionsResolved`, `hasFullAccess`, `userRole`

Para na próxima ocorrência cair direto na raiz sem auditoria de banco.

### 6. Teste de regressão

Adicionar caso em `src/modules/projects/hooks/__tests__/useProjectMutations.test.ts` (criar se não existir) que cobre:
- super_admin arquiva projeto de BU diferente da `currentBuId` → sucesso
- Projeto já arquivado → idempotente
- Projeto inexistente → erro distinto de RLS

## Riscos

- **Conformidade BU isolation** (regra inquebrável #1 e #3): a remoção do `.eq('bu_id', currentBuId)` parece relaxar o isolamento, mas **não relaxa** — quem garante o isolamento é a RLS do banco (`projects_update` exige `is_current_bu(bu_id) AND (...3 caminhos...)`). O filtro do frontend era cinto-e-suspensório que estava mascarando bugs. O `bu_id` do projeto continua sendo enviado na cláusula, garantindo target específico.
- **Compat de chamadores**: a mudança de assinatura de `mutate(projectId)` para `mutate({ id, bu_id })` é breaking. Auditar todos os usos antes de aplicar (provavelmente só `ProjectDetailPage` e talvez algum `ProjectsList`).

## O que NÃO vou fazer

- **Não vou inserir nada em `user_roles`**: você já está como super_admin lá.
- **Não vou alterar RLS**: ela está correta.
- **Não vou tocar `get_my_permissions`**: existe um gap conceitual ali (ela checa `bu_user_memberships.role_in_bu = 'super_admin'` em vez de `user_roles`), mas não afeta este bug porque `useProjectPermissionsV2` cobre via `userRole === 'admin'` e `isAdmin` do `useAuth`. Endereçar isso seria escopo separado.

## Resumo

O erro "sem permissão" é mentira do frontend. O banco te libera. O hook `useSoftDeleteProject` confunde "BU divergente" com "RLS negou" e exibe mensagem errada. Correção: receber `bu_id` do projeto, fazer probe de diagnóstico em vez de fabricar erro 42501, e ser honesto sobre o que falhou.
