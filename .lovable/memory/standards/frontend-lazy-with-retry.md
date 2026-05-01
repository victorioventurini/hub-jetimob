---
name: Frontend — lazyWithRetry obrigatório em rotas
description: Toda rota lazy-loaded em src/routes/**/*.routes.tsx DEVE usar lazyWithRetry para evitar "Failed to fetch dynamically imported module" pós-deploy
type: preference
---

## Regra

Em qualquer arquivo `src/routes/*.routes.tsx`, **proibido** usar `lazy` puro de `react` para rotas. Use SEMPRE `lazyWithRetry` de `@/lib/lazyWithRetry`.

```tsx
// ❌ Errado
import { lazy } from 'react';
const OkrDashboardPage = lazy(() => import('@/modules/okrs/pages/OkrDashboardPage'));

// ✅ Correto
import { lazyWithRetry } from '@/lib/lazyWithRetry';
const OkrDashboardPage = lazyWithRetry(() => import('@/modules/okrs/pages/OkrDashboardPage'));
```

## Why

SPAs com code-splitting + hashed filenames sofrem do problema do "stale chunk":
1. Usuário carrega `index.html` antes de um deploy.
2. Novo deploy gera novos hashes (`OkrDashboardPage-<hash>.js`).
3. Ao navegar, `import()` tenta o chunk antigo → 404 → `TypeError: Failed to fetch dynamically imported module` → tela de erro.

`lazyWithRetry` recupera automaticamente: na 1ª falha, faz `window.location.reload()` (com flag em sessionStorage para evitar loop), buscando o `index.html` novo com referências válidas.

## How to apply

- Edits em `src/routes/*.routes.tsx`: usar exclusivamente `lazyWithRetry`.
- Novo arquivo de rota: importar de `@/lib/lazyWithRetry` desde a primeira linha.
- Páginas internas (não-rota) que usem `React.lazy` em outros pontos do app também devem migrar quando criadas.

## Referências

- Helper: `src/lib/lazyWithRetry.ts`
- Teste: `src/lib/lazyWithRetry.test.ts`
- Relacionado: `mem://standards/bundling-no-manual-chunks` (incidente de TDZ é diferente — ambos são guardas de bundling/chunks).
