## Objetivo

Tornar o item **Decisões** do menu visível e a página `/decisions` acessível para qualquer usuário autenticado com BU ativa, independentemente do módulo `okrs` estar habilitado na BU.

## Diagnóstico (validado contra TCR + canônicos)

- **Sidebar (desktop e mobile):** `Decisões` está em `conditionalItems` filtrado por `hasModuleAccess('okrs')` → some quando a BU não tem `okrs` ativo.
- **Rota:** `/decisions` (e alias `/rituals/decisions`) usa `RitualRoute`, que internamente envolve em `ModuleRoute moduleSlug="okrs"` → 403/redireciona quando o módulo está desativado.
- **Backend / RLS:** já é universal — `useDecisionsScopeContext` sempre concede `self` a qualquer usuário com BU; RPC `rpc_decisions_inbox` é `SECURITY INVOKER` com RLS própria. Nenhuma mudança de banco, RLS, RPC ou edge function é necessária.
- **RBAC:** não há permission key específica; o único gate hoje é o de módulo. Sem hardcode novo de role.
- **Reuso:** estendemos `RitualRoute` com flag `skipModule` e movemos o item de `conditionalItems` para uma lista renderizada incondicionalmente quando há BU. Nenhum componente novo.

## Mudanças (apenas frontend)

### 1. `src/routes/rituals.routes.tsx`
- Adicionar prop `skipModule?: boolean` em `RitualRoute`. Quando `true`, não envolve filhos em `ModuleRoute` (mantém `ProtectedRoute` + `BuRequiredRoute` e demais guards opcionais).
- Aplicar `skipModule` apenas nas rotas `/decisions` e `/rituals/decisions`. Todas as demais rotas seguem com gate de `okrs`.

### 2. `src/components/layout/DynamicSidebar.tsx`
- Remover `Decisões` de `conditionalItems`.
- Criar/usar uma lista de itens fixos exibidos quando há BU ativa (sem `requiresModule`) e renderizar `Decisões` ali, na mesma posição visual atual (logo após Rituais).
- `Rituais` permanece em `conditionalItems` (gate `okrs` mantido).

### 3. `src/components/layout/MobileSidebar.tsx`
- Mesma alteração equivalente para o menu mobile.

## Fora de escopo

- Mudanças em RLS, RPCs, edge functions, schema, permission keys.
- Visual/UX da página `/decisions`.
- Gate do módulo `okrs` em qualquer outro item (Rituais continua restrito).

## Critério de aceite

- Em BU sem módulo `okrs` ativo, usuário autenticado vê o item **Decisões** no sidebar (desktop e mobile) e consegue abrir `/decisions` sem 403/redirect.
- Em BU com `okrs` ativo, comportamento permanece idêntico ao atual.
- Usuário sem BU ativa continua sendo barrado por `BuRequiredRoute`.
- Nenhum outro item de menu ou rota muda.
