## Pré-checklist (consultado)

- `docs/canonical/core/INDEX.md` → tarefa de 1 módulo (BU Management) + cache de queries → carregar `modules/bu.md` e `mem://standards/bu-membership-cache-invalidation`.
- `mem://index` Core → regras de BU Isolation, Query Optimization, Soft Deletes.
- `mem://standards/bu-membership-cache-invalidation` → **regra canônica relevante**: toda mutação em `bu_user_memberships` DEVE invalidar `queryKeys.bu.userBusPrefix()`. Hoje `useAddBuAccess`/`useRemoveBuAccess` invalidam só `queryKeys.users.all()` — viola o padrão.
- `docs/canonical/modules/bu.md` → confirma que memberships são geridas via RPCs `add_user_bu_access` / `remove_user_bu_access` (security definer, platform admin).

## Diagnóstico

Em `/hub/users`, ao editar vínculos de BU o toast aparece e o DB grava corretamente (confirmado em `bu_user_memberships`: `updated_at` recente para `tania@jetxp.com.br`). São **dois bugs combinados**, ambos puramente client-side:

### Bug 1 — Sheet exibe snapshot velho do usuário

`GlobalUsersPage` guarda o usuário aberto em estado local:

```tsx
const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
<UserGlobalSheet user={selectedUser} ... />
```

`BuAccessManager` recebe `buAccesses={user.bu_accesses}` desse snapshot. As mutations invalidam `queryKeys.users.all()` e a lista refetcha — mas `selectedUser` continua referenciando o objeto antigo. Sheet nunca reflete o novo conjunto de BUs.

### Bug 2 — `BuContext.userBus` fica stale (violação de padrão canônico)

`useAddBuAccess` e `useRemoveBuAccess` em `src/modules/users-global/hooks/useUserGlobalActions.ts` só invalidam `queryKeys.users.all()`. Faltam:

- `queryKeys.bu.userBusPrefix()` — exigido por `mem://standards/bu-membership-cache-invalidation`. Sem isso, se o admin editar suas próprias BUs (ou as de qualquer user logado), o `BuSelector` fica stale até 5 min ou F5, e `selectBu` pode rejeitar silenciosamente uma BU recém-adicionada.

## Correção

### 1) `src/modules/users-global/hooks/useUserGlobalActions.ts`

Em `useAddBuAccess` e `useRemoveBuAccess`, adicionar invalidação canônica no `onSuccess`:

```ts
queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), refetchType: 'active' });
queryClient.invalidateQueries({ queryKey: queryKeys.bu.userBusPrefix(), refetchType: 'active' });
```

### 2) `src/modules/users-global/pages/GlobalUsersPage.tsx`

Trocar o estado `selectedUser: GlobalUser | null` por `selectedProfileId: string | null` e derivar o usuário vivo a partir da lista:

```tsx
const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
const liveSelectedUser = selectedProfileId
  ? users.find(u => u.profile_id === selectedProfileId) ?? null
  : null;
...
<UserGlobalSheet
  open={sheetOpen}
  onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedProfileId(null); }}
  user={liveSelectedUser}
/>
```

No clique da linha: `setSelectedProfileId(user.profile_id); setSheetOpen(true);`.

Assim, sempre que `useGlobalUsers` refetcha (disparado por #1), o sheet recebe o objeto atualizado automaticamente — sem fechar a sheet, sem F5.

## Fora de escopo

- RPCs `add_user_bu_access` / `remove_user_bu_access`, RLS, identidade.
- `BuAccessManager` em si (já re-renderiza quando a prop muda).
- `useUpdateGlobalRole` / `useReactivateUser` / `useResetOnboarding` (não tocam memberships).

## Validação

1. `/hub/users?q=@jetxp` → abrir Tania.
2. Adicionar uma BU → entrada aparece no painel sem fechar a sheet.
3. Remover uma BU → some imediatamente.
4. Definir nova default → estrela move.
5. Coluna "BUs com Acesso" na tabela reflete a mudança (já funcionava, mantém).
6. Se editar a própria conta: o `BuSelector` (sidebar) passa a listar a nova BU sem precisar de F5 nem de esperar 5 min.
