# Corrigir erro "Failed to fetch dynamically imported module" no /okrs (e em todas as rotas)

## Diagnóstico

O erro reportado em `https://hub.jetimob.com/okrs`:

```
TypeError: Failed to fetch dynamically imported module:
https://hub.jetimob.com/assets/OkrDashboardPage-CxiG5yhg.js
```

**Não é** o incidente de `manualChunks` (TDZ) de 2026-04-22 — esse já está resolvido (`vite.config.ts` está sem `manualChunks`). É outro padrão clássico de SPA com code-splitting:

1. O usuário carregou o `index.html` antes de um novo deploy.
2. O Vite/Rollup gerou um novo build, com novos hashes (`OkrDashboardPage-<novoHash>.js`).
3. Ao navegar para `/okrs`, o `React.lazy` tenta importar o chunk **antigo** (`...-CxiG5yhg.js`), que já não existe no servidor → 404 → `TypeError: Failed to fetch dynamically imported module`.
4. Como a tela em branco/erro persiste sem reload manual, o usuário fica preso.

## Solução já existente no projeto (subutilizada)

O helper canônico `src/lib/lazyWithRetry.ts` já trata exatamente esse caso:
- Tenta o `import()` dinâmico.
- Se falhar, marca um flag em `sessionStorage` e dispara `window.location.reload()` uma única vez (evita loop).
- Após o reload, o navegador busca o `index.html` novo, com referências aos chunks corretos, e a página carrega normalmente.

**Problema:** em `src/routes/okrs.routes.tsx` o helper só foi adotado em **7 das 17** páginas. As 10 primeiras (incluindo `OkrDashboardPage`, `ExecutiveDashboardPage`, `OrgViewListPage`, `TeamContributionPage`, `CycleCheckinsPage`, `OkrCreationPage`, etc.) ainda usam `lazy` puro do React e ficam vulneráveis.

A mesma omissão existe em outros arquivos de rota (`teams.routes.tsx`, `tickets.routes.tsx`, `settings.routes.tsx`, `hub.routes.tsx`, `rituals.routes.tsx`, `analysis.routes.tsx`, `assets.routes.tsx`, `events.routes.tsx`, `projects.routes.tsx`, `core.routes.tsx`, `public.routes.tsx`).

## Plano de ação

### Etapa 1 — Padronizar `lazyWithRetry` em **todas** as rotas

Substituir, em cada arquivo de `src/routes/*.routes.tsx`:

- Import: remover `lazy` do `react` quando não for mais usado; importar `lazyWithRetry` de `@/lib/lazyWithRetry`.
- Cada `const X = lazy(() => import('...'))` vira `const X = lazyWithRetry(() => import('...'))`.

Arquivos a alterar (apenas `lazy` → `lazyWithRetry`, sem mudar lógica de rotas):

- `src/routes/okrs.routes.tsx` (10 páginas restantes)
- `src/routes/teams.routes.tsx`
- `src/routes/tickets.routes.tsx`
- `src/routes/settings.routes.tsx`
- `src/routes/hub.routes.tsx`
- `src/routes/rituals.routes.tsx`
- `src/routes/analysis.routes.tsx`
- `src/routes/assets.routes.tsx`
- `src/routes/events.routes.tsx`
- `src/routes/projects.routes.tsx`
- `src/routes/core.routes.tsx`
- `src/routes/public.routes.tsx`

### Etapa 2 — Adicionar lint guard (opcional, recomendado)

Criar regra simples (script de auditoria) que falha se aparecer `lazy(() => import(` em qualquer `src/routes/*.routes.tsx`, forçando o uso de `lazyWithRetry`. Pode reaproveitar o padrão dos scripts em `scripts/audit-*.ts`.

### Etapa 3 — Documentar como Standard

Adicionar memória nova `mem://standards/frontend-lazy-with-retry`:
- Regra: **toda** rota lazy-loaded em `src/routes/**` DEVE usar `lazyWithRetry`.
- Justificativa: evita "Failed to fetch dynamically imported module" pós-deploy.
- Referência: `src/lib/lazyWithRetry.ts` + teste em `src/lib/lazyWithRetry.test.ts`.

Atualizar `.lovable/memory/index.md` para incluir referência na seção **Standards & Patterns**.

## Pré-checklist (compliance)

- [x] Sem mudança em RLS, BU isolation, identity, query keys.
- [x] Sem mudança em `vite.config.ts` (proibido `manualChunks` — ver `mem://standards/bundling-no-manual-chunks`).
- [x] Mudança puramente de presentation/routing wrapper.
- [x] Helper canônico já existe e tem teste.

## Critério de validação

1. Build sem erros (harness automático).
2. Após próximo deploy, abas antigas que tentem navegar para qualquer rota recarregam automaticamente uma única vez e o app volta a funcionar — sem tela de erro.
3. Sessões novas continuam funcionando idênticas (helper só age em caso de falha de import).

## Fora de escopo

- Não tocar em `vite.config.ts` (manter sem `manualChunks`).
- Não alterar `App.tsx` nem fluxo do `Suspense`/`ErrorBoundary` global.
- Não mexer em estratégia de cache/Service Worker (não há SW no projeto).
