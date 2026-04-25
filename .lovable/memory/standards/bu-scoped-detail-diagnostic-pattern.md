---
name: BU-Scoped Detail Diagnostic Pattern
description: Padrão para páginas de detalhe BU-scoped — gate de currentBuId, guard §A.3, filtro explícito por bu_id, sync defensivo de header BU com retry one-shot, e diagnóstico tiered (existência → relação → permissão)
type: standard
---

# BU-Scoped Detail Diagnostic Pattern

Páginas de detalhe que carregam uma entidade BU-scoped (objetivo, KR, ticket, ativo, projeto, etc.) DEVEM seguir este padrão para evitar falsos "não existe mais" e falsos "carregando contexto".

## Regras

1. **Gate de query**: `enabled: isReady && !!supabase && !!entityId && !!currentBuId`. Sem `currentBuId`, NÃO disparar fetch.

2. **Loading gate inclui `currentBuId`**:
   ```ts
   if (!isReady || !currentBuId || isLoading || !isFetched) return <Loading/>;
   ```

3. **Filtro explícito por BU em TODAS as queries (principal e diagnóstico)**:
   ```ts
   .eq('id', entityId)
   .eq('bu_id', currentBuId)
   ```
   A RLS de várias tabelas operacionais (ex: `okr_team_objectives`) é baseada em **membership**, não em `current_bu_id()`. Sem `.eq('bu_id', currentBuId)` o admin/super_admin enxerga linhas de outras BUs e as classifica erroneamente.

4. **Guard defensivo §A.3 obrigatório** (TCR regra inquebrável #1):
   ```ts
   if (data && currentBuId && data.bu_id !== currentBuId) {
     console.warn('[<PageName>] BU mismatch discard', {
       entityId, currentBuId, dataBuId: data.bu_id,
       headerBuId: getBuScopedClientCurrentBuId(),
     });
     return null;
   }
   ```
   **Nunca remover.** Mesmo com filtro explícito, mantém defesa em profundidade.

5. **Diagnóstico secundário** quando `isFetched && !data`:
   - Roda no MESMO cliente BU-scoped, com `.eq('bu_id', currentBuId)`.
   - Select mínimo: `id, bu_id, cancelled_at` (ou colunas de soft-delete equivalentes).
   - Classifica em duas variantes para `ResourceNotFoundState`:
     - `cancelled` → row retornada com `cancelled_at != null`
     - `not_found` → row null (não pertence à BU atual, foi removida, ou RLS nega acesso)

6. **NÃO usar `context_loading` no branch de erro**: a query principal já é gated por `currentBuId`. Se chegou em `!data && isFetched`, não há race de hidratação a aguardar — o problema é estrutural (BU errada, RLS, soft-delete). Mostrar estado factual em vez de prometer recuperação automática.

7. **Query keys**: incluir `currentBuId` na key principal; key do diagnóstico = `[...principalKey, 'diagnostic']`.

8. **Verificação defensiva de header sync (queryFn-side)**: dentro do `queryFn` da principal e da diagnóstica, comparar `getBuScopedClientCurrentBuId()` com o `currentBuId` do `BuContext`. Se divergir (transição/HMR/race de hidratação do singleton), chamar `clearBuClientCache(currentBuId)` (swap atômico) e lançar `Error('BU_HEADER_DESYNC_RETRY')`. A query deve ter `retry: (count, err) => count < 1 && err?.message === 'BU_HEADER_DESYNC_RETRY'` e `retryDelay: 50`. Isso evita falsos `not_found` quando o BU foi recém-trocado mas o header ainda carrega o BU anterior. NÃO faz cross-BU recovery — apenas garante que a request use o BU que o usuário realmente selecionou.

9. **Diagnóstico tiered (3 tiers)** — classifica corretamente o motivo do `null`:
   - **Tier 1 — existência + soft-delete** (`id, bu_id, cancelled_at, deleted_at, status`): se `null` → `not_found` (BU errada / removido / RLS nega). Se `cancelled_at` → `cancelled`. Se `deleted_at` → `not_found`.
   - **Tier 2 — relação de contribuição** (quando há `contributor_team_id` na URL): consultar `okr_team_objective_contributors` por `objective_id` + `team_id`. Se row ausente → `permission_denied`.
   - **Tier 3 — permissão de domínio** (opcional): usar hooks como `useCanManageTeamOkr`. Falha aqui → `permission_denied`.
   Variants disponíveis em `ResourceNotFoundState`: `not_found`, `cancelled`, `permission_denied`, `context_loading`.

## Implementação de referência

`src/modules/okrs/pages/TeamKrCreationPage.tsx` — query principal e diagnóstico tiered ambos com `.eq('bu_id', currentBuId)` + `ensureBuHeaderSync()` no `queryFn` + `retry` one-shot; branch `!objective` classifica `cancelled` / `permission_denied` / `not_found`.

## Helper exportado

`getBuScopedClientCurrentBuId()` em `src/integrations/supabase/buScopedClient.ts` retorna o BU id atualmente injetado no header. Use APENAS para telemetria — nunca para business logic.

## Não-objetivos

- ❌ Cross-BU recovery automático (viola TCR §A.3).
- ❌ Remover guard §A.3 "porque RLS já filtra" (defesa em profundidade é mandatória).
- ❌ Usar cliente global para o diagnóstico (vazaria entre BUs).
- ❌ Classificar como `context_loading` qualquer `!data` quando a query já está gated por `currentBuId`.
