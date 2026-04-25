---
name: BU-scoped detail query keys
description: Query keys de detalhe de entidades BU-scoped DEVEM incluir buId para evitar cache stale (`null`) entre BUs e travamentos em loading
type: preference
---

# BU-scoped detail query keys

## Regra
Toda query key de **detalhe** que carrega uma entidade BU-scoped (ex: objetivo
de time, KR, ticket, ativo) DEVE incluir `currentBuId` na própria key, **mesmo
que a RLS já filtre** por BU.

```ts
// ❌ ERRADO — cache compartilhado entre BUs
queryKey: queryKeys.okrs.teamObjectiveDetail(objectiveId)

// ✅ CORRETO — cache isolado por BU
queryKey: queryKeys.okrs.teamObjectiveDetail(objectiveId, currentBuId)
```

## Por quê
Sem o `buId` na key, o React Query reaproveita o resultado de uma BU em outra.
Quando o resultado de uma BU é `null` (ex: objetivo não pertence a ela), a tela
fica presa no estado de "carregando..." porque o componente tipicamente trata
`!data` como loading. Em produção isso vira **loading infinito** sem qualquer
erro no console.

## Como filtrar no frontend (defesa em profundidade)
Mesmo com a key correta, validar o `bu_id` retornado contra `currentBuId` —
conforme `DEVELOPMENT_STANDARDS §A.3` (BU Scope Enforcement):

```ts
const { data, error } = await supabase.from('okr_team_objectives')
  .select('id, title, bu_id, ...')
  .eq('id', objectiveId)
  .maybeSingle();

if (data && currentBuId && data.bu_id !== currentBuId) return null;
return data;
```

## Tratamento de loading vs not-found
**Nunca** colapsar loading e "recurso ausente" na mesma condição. Sempre:

1. `!isReady || isLoading || !isFetched || canManageLoading` → `<LoadingState />`
2. `!data` (já fetched) → `<ResourceNotFoundState />`
3. caso restante → render normal

Colapsar tudo em um único `if` (ex: `isLoading || !data || canManageLoading`)
mascara recursos ausentes como loading eterno.

## Invalidação
Usar prefix helpers para invalidar todas as variações de BU:

```ts
queryKeys.okrs.teamObjectiveDetailPrefix(objectiveId)
```

## Casos conhecidos
- `src/modules/okrs/pages/TeamKrCreationPage.tsx` (corrigido em 2026-04-25):
  loading infinito ao abrir `/okrs/objectives/:id/krs/create` com cache stale
  ou objetivo em outra BU — agora separa loading de not-found e usa
  `teamObjectiveDetail(id, currentBuId)`.
- `src/modules/okrs/components/TeamKrFormDialog.tsx`: passa `buId` na key.
