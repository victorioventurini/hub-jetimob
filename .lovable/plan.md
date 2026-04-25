
# Plano — Bugfix: "Este objetivo não existe mais" no TeamKrCreationPage

## Contexto

URL relatada: `/okrs/objectives/1470f9f5-fed4-42db-b5fa-406ade6cef6d/krs/create?contributor_team_id=d3247da9...`

Verificado via DB: o objetivo **existe**, está na BU **Jetimob**, não está cancelado, é shared, e o time `d3247da9` (Tecnologia) consta como contribuidor autorizado. O usuário está logado e na BU Jetimob. Mesmo assim a UI mostra `ResourceNotFoundState`.

## Conformidade com TCR / Canônicos (re-verificada)

- **TCR §A.3 (Defense-in-Depth):** filtro defensivo `data.bu_id !== currentBuId` é **obrigatório** e **NÃO será removido**. A versão anterior do plano que sugeria remoção foi descartada por violar a regra inquebrável #1 ("Respeitar PRE-BU vs POST-BU").
- **DEVELOPMENT_STANDARDS:** `useOptionalBuClient` + gate `isReady` já é o padrão correto e está aplicado.
- **Query Keys SSOT:** `queryKeys.okrs.teamObjectiveDetail(id, currentBuId)` — BU já está na key, conforme `mem://standards/bu-scoped-detail-query-keys`.
- **Soft delete:** `.is('cancelled_at', null)` aplicado.

## Hipótese mais provável (após re-análise)

O guard da linha 98 retorna `null` em **race condition de hidratação**: a query é habilitada quando `isReady && !!supabase && !!objectiveId`, mas `currentBuId` lido do `useBu()` em outro render tick pode estar momentaneamente diferente do `buId` que o `getOptionalBuScopedClient` usou no header. Quando o objetivo (header BU correto) volta da rede, `currentBuId` no closure já mudou — `data.bu_id !== currentBuId` dispara → cache de `null` é fixado → UI mostra "não existe".

Hipóteses alternativas que o diagnóstico precisa distinguir:
- **H1** — Race de hidratação acima (mais provável).
- **H2** — RLS bloqueia esse usuário específico nesse objetivo (menos provável; usuário diz ter acesso).
- **H3** — `okr_team_objectives.cancelled_at` foi setado e o filtro `is null` exclui (verificável).

## Mudanças propostas (cirúrgicas, sem violar §A.3)

### 1. `src/modules/okrs/pages/TeamKrCreationPage.tsx`

**Mantém** o guard defensivo da linha 98 (TCR §A.3). **Adiciona**:

a) **Telemetria estruturada** quando o guard descarta:
```ts
if (data && currentBuId && data.bu_id !== currentBuId) {
  console.warn('[TeamKrCreationPage] BU mismatch discard', {
    objectiveId, currentBuId, dataBuId: data.bu_id,
    headerBuId: getBuScopedClientCurrentBuId?.(),
  });
  return null;
}
```

b) **Gate adicional**: só habilitar a query quando `currentBuId` está estável:
```ts
enabled: isReady && !!supabase && !!objectiveId && !!currentBuId,
```
Isso elimina o caso em que `currentBuId` ainda é `null` no primeiro render mas o header já foi setado.

c) **Diagnóstico secundário** (apenas para classificar o erro, **não substitui o guard**): quando `objectiveFetched && !objective`, dispara um segundo `useQuery` que busca `select id, bu_id, cancelled_at` com o **mesmo** cliente BU-scoped. Resultados possíveis:
- Retorna linha ativa → guard descartou por race → mostrar UI "Recarregando contexto..." com retry automático após `currentBuId` estabilizar.
- Retorna linha com `cancelled_at` → mostrar "objetivo foi cancelado".
- Retorna `null` → RLS/inexistente real → manter `ResourceNotFoundState` atual.

Este diagnóstico **não** consulta cross-BU (não usa cliente global) — respeita §A.3 integralmente.

### 2. `src/components/ui/resource-not-found-state.tsx`

Aceitar prop opcional `variant?: 'not_found' | 'cancelled' | 'context_loading'` para mensagens contextuais. Default mantém comportamento atual.

### 3. `mem://standards/bu-scoped-detail-diagnostic-pattern.md` (novo)

Padrão para páginas de detalhe BU-scoped:
- Sempre `enabled: isReady && !!supabase && !!entityId && !!currentBuId`.
- Sempre manter guard defensivo §A.3.
- Em caso de `null` após `isFetched`, classificar via segundo fetch BU-scoped.
- Logs estruturados com prefixo `[<PageName>] BU mismatch discard`.

### 4. `.lovable/memory/index.md`

Linkar o novo standard.

## Arquivos

**Editados:**
- `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- `src/components/ui/resource-not-found-state.tsx`
- `.lovable/memory/index.md`

**Criados:**
- `.lovable/memory/standards/bu-scoped-detail-diagnostic-pattern.md`

## Não-objetivos (explicitamente fora de escopo)

- ❌ Remover guard defensivo §A.3 (rejeitado por violar TCR).
- ❌ Cross-BU recovery / switch automático (usuário confirmou: OKRs só existem em Jetimob).
- ❌ Refactor dos hooks de KPIs/Teams citados em proposta anterior (escopo expandido sem necessidade).

## Validação pós-merge

1. Reproduzir URL do bug em https://hub.jetimob.com → carregar wizard sem `ResourceNotFoundState`.
2. Console deve mostrar `[TeamKrCreationPage] BU mismatch discard` zero vezes em fluxo normal.
3. Trocar de BU → voltar para Jetimob → reabrir URL: deve carregar.
4. `tsc --noEmit` sem regressões.
