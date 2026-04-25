---
name: URL state preservation
description: setSearchParams DEVE usar functional update para preservar params existentes em rotas multi-param (step + filtros + ids contextuais)
type: preference
---

# URL State Preservation Standard

## Regra
Quando uma rota usa `useSearchParams` e a URL pode conter **múltiplos parâmetros independentes** (ex: `?step=...&contributor_team_id=...`), as chamadas a `setSearchParams` DEVEM usar a forma **functional update** para preservar os params existentes.

## Por quê
`setSearchParams({ step })` substitui **toda** a query string. Isso apaga silenciosamente outros params (filtros, contexto, ids), causando bugs como:
- Wizard de KR perde `contributor_team_id` ao trocar de step → cria KR no time errado ou erra RLS no submit.
- Tabs perdem filtros de busca/data ao alternar.
- Modais perdem parâmetro de retorno (`from=...`).

## Padrão correto
```ts
setSearchParams(prev => {
  const next = new URLSearchParams(prev);
  next.set('step', step);
  return next;
}, { replace: true });
```

## Quando o overwrite é OK
Apenas quando **explicitamente** se quer resetar TODA a query string (ex: clicar em "Limpar todos os filtros"). Nesses casos, deixe um comentário explicando.

## Casos conhecidos
- `src/modules/okrs/pages/TeamKrCreationPage.tsx` (corrigido) — preservar `contributor_team_id` durante navegação entre steps.
