## Causa raiz do 17706%

KR `Gerar um incremento de R$ 400 mil em MRR`: `target=400`, `unit="R$ mil"`, `current_value=70822` (digitado em R$ cru). Fórmula inline `(70822-0)/(400-0)*100 = 17.705%`.

O canon `progressCalculation.ts` já normaliza isso (heurística `normalizeProgressInputs`: se progresso direto > 1000% e o escalado por unidade ≤ 1000%, usa o escalado → 17,7%). O problema é que **vários componentes/hooks ignoram o canon** e calculam progresso inline.

## Cobertura completa (varredura de `src/` + `supabase/functions/`)

### Frontend — fórmula inline a substituir por `calculateProgress(baseline, current, target, direction, { unit })`

1. `src/modules/okrs/components/OrgObjectiveCard.tsx` (l.60-71)
2. `src/modules/okrs/components/TeamObjectiveCard.tsx` (l.95-105)
3. `src/modules/okrs/components/KrHistoryDialog.tsx` (l.82)
4. `src/modules/okrs/components/cycle-checkins/CycleCheckinsEvolution.tsx` (l.180, l.256)
5. `src/modules/okrs/hooks/useManagersPanorama.ts` (l.145)
6. `src/modules/okrs/hooks/useUserKrsForWizard.ts` (l.152)
7. `src/modules/okrs/hooks/useTeamPreviousCycleAnalysis.ts` (l.138, l.146)
8. `src/modules/okrs/hooks/useTeamPendingKrs.ts` (l.171)
9. `src/modules/okrs/hooks/useOrgOkrsForContext.ts` (l.99)

Garantir em cada hook acima que `unit` está no `select` (proibido `select *`); adicionar coluna se faltar.

### Edge — única fórmula inline remanescente fora do canon

10. `supabase/functions/mbr-executive-report/extractors.ts` (l.52) — substituir pela função do `_shared/okr-progress.ts` (já importada em outros pontos do mesmo arquivo; resquício de refactor anterior).

### Já no canon (não tocar)
`_shared/okr-progress.ts`, `_shared/hub-tools.ts`, `qbr-executive-report/extractors.ts`, `progressCalculation.ts` e os consumidores via `calculateProgress` / `calculateAggregatedProgress`.

## Guard-rails para prevenir recorrência

### a) Lint rule custom (ESLint local)
Criar `eslint-rules/no-inline-kr-progress.js` e registrar em `eslint.config.js`. Regra:
- Bloqueia o padrão AST `BinaryExpression` que combina identificadores `current(_value)?`, `baseline`, `target` em divisão `* 100`.
- Permite apenas dentro de:
  - `src/modules/okrs/utils/progressCalculation.ts`
  - `supabase/functions/_shared/okr-progress.ts`
- Mensagem: *"Cálculo de progresso de KR inline é proibido. Use `calculateProgress()` (frontend) ou `_shared/okr-progress.ts` (edge). Ver mem://features/okrs/okrs-master-standard."*

### b) Teste de contrato canônico
`src/modules/okrs/utils/__tests__/progressCalculation.contract.test.ts` com casos de regressão:
- `unit="R$ mil"`, target=400, current=70822 → resultado < 1000% (regressão direta do bug atual)
- `direction="maintain"` → binário 0/100
- Over-achievement sem clamp (target=100, current=163 → 163)
- `target === baseline` → binário
Espelhar o mesmo arquivo em `supabase/functions/_shared/__tests__/okr-progress.contract.test.ts` para o canon edge.

### c) Memória de projeto
Atualizar `mem://features/okrs/okrs-master-standard` adicionando seção **"Progresso de KR — Canon obrigatório"** com:
- Frontend: `calculateProgress` de `@/modules/okrs/utils/progressCalculation`
- Edge: `calculateProgress` de `_shared/okr-progress.ts`
- Sempre passar `{ unit: kr.unit }` no contexto
- Sem clamp em 100 (over-achievement permitido)
- Proibido cálculo inline (enforcement: lint + teste)

Adicionar linha ao **Core** de `mem://index.md`:
> **Progresso de KR:** SEMPRE via canon (`calculateProgress`). Inline proibido — barrado por lint.

## Validação

- `/okrs/?cycle=8fd8d5fa-…`: KR "R$ 400 mil em MRR" deixa de exibir 17706% (passa a ~17,7%); demais KRs preservam seus % (incl. over-achievement como 163%).
- `npm run lint` falha se alguém reintroduzir a fórmula inline em qualquer arquivo fora dos 2 permitidos.
- `vitest run progressCalculation.contract` verde no CI.
- MBR/QBR Executive Report continuam alinhados com `/okrs/` (após item 10).

## Fora do escopo
- Sanear dados existentes (`current_value` digitado em escala errada). Heurística do canon cobre enquanto a UI de input não força a unidade.
- Refatorar `useCompanyOkrs`, regras de RAG, ou base de cálculo de KPI primária.
