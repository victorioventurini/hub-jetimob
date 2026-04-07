
# Plano revisado: Desacoplar análise cross-team do sidebar

## Diagnóstico honesto

O plano anterior foi criado **sem consultar o TCR e os docs canônicos primeiro** — violação do pré-checklist. Após revisão completa, confirmo que:

1. O plano anterior está **correto na essência** mas precisa de um ajuste
2. A edge function `okr-construction-review` no modo `team-analysis` **já aceita dados brutos** (objetivos + KRs + orgObjectives) — não depende de scores individuais
3. O bloqueio real está em **duas barreiras**:
   - `evaluateCrossTeam` tem `const allDone = ... if (!allDone) return;` na linha 324-325
   - O `useEffect` trigger (linha 410-419) também verifica `allDone`

## O que muda no plano

Apenas **1 arquivo** precisa de alteração: `useFullConstructionReview.ts`

### Mudança 1: Remover guard `allDone` de dentro de `evaluateCrossTeam`

Linhas 324-325 — remover a checagem `allDone`. A função já recebe `rawObjectives` diretamente (dados brutos), não precisa dos assessments individuais.

### Mudança 2: Trocar trigger do useEffect

Linhas 410-419 — substituir a lógica `allDone` por um timer de 5 segundos após `rawObjectives` e `orgObjectives` estarem disponíveis:

```ts
useEffect(() => {
  if (crossAnalysisTriggered.current) return;
  if (!rawObjectives?.length || !orgObjectives) return;
  
  crossAnalysisTriggered.current = true;
  const timer = setTimeout(() => evaluateCrossTeam(), 5000);
  return () => clearTimeout(timer);
}, [rawObjectives, orgObjectives, evaluateCrossTeam]);
```

### Mudança 3: Limpar dependência de `aiAssessments` no useCallback

Remover `aiAssessments` e `aiErrors` do array de dependências de `evaluateCrossTeam`, já que não são mais usados dentro da função.

## O que NÃO muda

- Edge function (já funciona com dados brutos)
- `ConstructionScoreCard` (já consome `teamAnalysis` e mostra loading)
- `OkrFullConstructionReviewPage` (já passa props corretas)
- Avaliações individuais (continuam em paralelo, independentes)
- RLS, rotas, permissões

## Conformidade com TCR/Standards

- ✅ Query keys via `src/lib/queryKeys` (já implementado)
- ✅ `useBuScopedSupabase()` (já implementado)
- ✅ Edge function usa `withMiddleware` e valida JWT/BU
- ✅ URL state via `useUrlState` (já implementado)
- ✅ Sem `select('*')` — campos explícitos
- ✅ Navegação com `<Link>` (já implementado)
