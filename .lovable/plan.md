# Plano: Corrigir falso negativo em `/okrs/objectives/:id/krs/create`

## Diagnóstico confirmado

- Objetivo `1470f9f5-fed4-42db-b5fa-406ade6cef6d` existe, está ativo (`deleted_at`/`cancelled_at` null, status válido), `is_shared=true`, e pertence à BU **Jetimob**.
- Time contribuidor `d3247da9-3e07-4fa8-9d0a-2527fdf6548f` pertence à BU **Jetimob** e está registrado em `okr_team_objective_contributors` para esse objetivo.
- O usuário está, ao clicar, com a BU **Jetimob** ativa no `BuContext`.
- Apesar disso, a query principal em `TeamKrCreationPage.tsx` retorna `null` e cai no branch `not_found`.

**Causa raiz**: dessincronia entre `currentBuId` (estado React do `BuContext`) e o header `x-current-bu-id` injetado pelo singleton em `buScopedClient.ts` no momento do `queryFn`. Isso acontece quando há transição/hidratação recente de BU e o cache do cliente BU-scoped ainda carrega o header anterior, fazendo a RLS filtrar o objetivo. O diagnóstico secundário roda no MESMO cliente desincronizado e também volta `null`, classificando incorretamente como `not_found`.

## Mudanças

### 1. `src/modules/okrs/pages/TeamKrCreationPage.tsx`
- No `queryFn` da query principal e da diagnóstica:
  - Comparar `getBuScopedClientCurrentBuId()` com `currentBuId` do contexto.
  - Se divergir: chamar `clearBuClientCache(currentBuId)` (swap atômico) e lançar `Error('BU_HEADER_DESYNC_RETRY')`.
- Configurar `retry: (count, err) => count < 1 && err?.message === 'BU_HEADER_DESYNC_RETRY'` em ambas queries.
- Gate adicional: `enabled` só dispara quando `identity.isReady && !isSwitchingBu && !!currentBuId`.
- Diagnóstico tiered (3 tiers, todos BU-scoped com `.eq('bu_id', currentBuId)`):
  1. Existência + soft-delete (`id, bu_id, cancelled_at, deleted_at, status`)
  2. Relação de contribuição (`okr_team_objective_contributors` por `objective_id` + `team_id`)
  3. Permissão (verificação via `usePermissions`)
- Manter guard §A.3 obrigatório.
- Telemetria estruturada com `console.warn('[TeamKrCreationPage]', { stage, currentBuId, headerBuId, ... })`.

### 2. `src/components/ui/resource-not-found-state.tsx`
- Adicionar variante `permission_denied` ao type `ResourceNotFoundVariant`.
- Adicionar entradas em `headingByVariant` e `defaultMessageByVariant` para `permission_denied` (heading: "Você não tem permissão para acessar este {resourceType}").

### 3. `.lovable/memory/standards/bu-scoped-detail-diagnostic-pattern.md`
- Adicionar regra 8: **Verificação defensiva de header sync** no `queryFn` antes de qualquer query BU-scoped em página de detalhe; com retry one-shot ao detectar dessync.
- Adicionar regra 9: **Diagnóstico tiered** (existência → relação → permissão) para classificar o erro corretamente.
- Atualizar exemplos de implementação apontando para `TeamKrCreationPage.tsx`.

## Não-objetivos
- ❌ Não vamos implementar troca automática de BU (TCR §A.3 inquebrável).
- ❌ Não vamos remover o guard §A.3.
- ❌ Não vamos usar cliente global em nenhuma das queries.

## Validação pós-implementação
1. Acessar o link do erro com BU Jetimob ativa → deve carregar o wizard de criação de KR sem erro.
2. Verificar console: se houve dessync, deve aparecer log `BU_HEADER_DESYNC_RETRY` seguido de query bem-sucedida.
3. Tentar acessar com BU diferente ativa → deve mostrar `not_found` claro (não `permission_denied` nem `cancelled`).
4. Testar com objetivo cancelado → variante `cancelled`.
5. Testar com usuário sem permissão `okrs.kr.create` no time → variante `permission_denied`.
