## Causa raiz

`andressaf@ferrigoloadvogados.com.br` tem:
- **1** `bu_user_memberships` (Jetimob) — perfil interno legado
- **3** `partner_contact_bu_associations` ativas (Jetimob, Victorio Venturini, Jet Experience)

Em `src/contexts/BuContext.tsx` (linhas 56–64), `userBus` é **mutuamente exclusivo**:

```ts
const userBus = useMemo(() => {
  if (internalBus.length > 0) return internalBus;   // ← descarta 3 externas
  return externalBus as ...;
}, [internalBus, externalBus]);
```

Resultado: `userBus.length = 1` → `hasMultipleBus = false` → `<BuSelector>` retorna `null` (linha 26 do componente).

Isso **viola o padrão canônico** documentado em `docs/guides/EXTERNAL_USER_IDENTITY_PATTERN.md` (referenciado no TCR §22), que prescreve:

> ```ts
> // Merge com prioridade para interno
> const userBus = mergeBuMemberships(internalBus, externalBus);
> ```

`BuSelector`, `Header`, `useExternalUserBus` e `applyBuSwitch` já estão corretos — não é problema de UI.

## Solução (cirúrgica, sem novos componentes)

Alinhar `BuContext` ao padrão canônico: **mesclar** internas + externas deduplicando por `bu_id`, com prioridade para a interna em colisão (carrega `role_in_bu` real).

### Mudança única — `src/contexts/BuContext.tsx`

```ts
const userBus = useMemo(() => {
  const seen = new Set<string>();
  const merged: UserBuMembership[] = [];
  for (const m of internalBus) {
    if (seen.has(m.bu_id)) continue;
    seen.add(m.bu_id);
    merged.push(m);
  }
  for (const m of externalBus as unknown as UserBuMembership[]) {
    if (seen.has(m.bu_id)) continue;
    seen.add(m.bu_id);
    merged.push(m);
  }
  return merged;
}, [internalBus, externalBus]);

// Mantém semântica: "puramente externo" só quando não há interna
const isExternalUser = internalBus.length === 0 && externalBus.length > 0;
```

`userRole` permanece inalterado: derivado de `currentMembership?.role_in_bu`, que será `"external"` quando a BU ativa vier de `externalBus` ou role interno real quando vier de `internalBus`.

## Por que não duplicar componentes

| Peça | Estado | Ação |
|---|---|---|
| `BuSelector` | já mostra dropdown quando `hasMultipleBus` | reaproveitado |
| `Header` | já consome `BuSelector` + `hasMultipleBus` | inalterado |
| `useExternalUserBus` | já entrega externas no formato `UserBuMembership` | inalterado |
| `applyBuSwitch` | atomic swap + cache clear | reaproveitado para troca entre interna ↔ externa |
| `useExternalUser` | PRE-BU, `globalClient` correto | inalterado |

## Validação

1. **Andressa** (1 interna + 3 externas) → header mostra dropdown com 3 BUs (Jetimob aparece uma vez, vinda da interna).
2. **Trocar de BU** entre Jetimob ↔ Victorio Venturini → `selectBu` → `applyBuSwitch` → queries refazem com novo `x-bu-id`.
3. **Usuário 100% interno** → `externalBus = []` → comportamento idêntico ao atual.
4. **Usuário 100% externo** → `internalBus = []` → comportamento idêntico ao atual; `isExternalUser = true` mantido.
5. **Usuário híbrido com mesma BU em ambos** (ex.: Jetimob nos dois) → BU listada uma vez, com role interno (prioridade correta para RBAC).

## Arquivos

- `src/contexts/BuContext.tsx` — apenas o `useMemo` de `userBus` (≈12 linhas).

Sem migrações, sem RLS, sem novos componentes, sem novas rotas, sem novos hooks.
