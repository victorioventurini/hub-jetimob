## Diagnóstico

KR em questão no banco:
- `direction = down`, `unit = R$`
- `baseline = 0`, `target = 6.700`, `current = 6.389,23`

Fórmula canônica atual (`_shared/okr-progress.ts` e `progressCalculation.ts`), branch `down`:

```
progress = (baseline − current) / (baseline − target) × 100
        = (0 − 6389,23) / (0 − 6700) × 100 ≈ 95,36%  → arredonda p/ 95%
```

O número "bate" por coincidência aritmética, mas a semântica está invertida. Para uma KR de **redução real**, `baseline` precisa ser **maior** que `target` (parte-se de um valor alto e reduz-se até o teto). Quando `baseline ≤ target` (caso típico de KR-cap: "limitar a ≤ X"), a fórmula linear não faz sentido — o correto seria: se `current ≤ target`, a meta está sendo cumprida (100%); se ultrapassar, começa a cair.

Hoje o KR mostra 95% mesmo estando **abaixo** do teto (deveria ser ≥ 100%). Isso induz o time a agir como se estivesse perto de perder a meta, quando na verdade já está dentro.

## Escopo do ajuste

1. **Cálculo (SSOT duplo)** — tratar `direction = down` com `baseline ≤ target` como KR-cap:
   - `src/modules/okrs/utils/progressCalculation.ts` → função `calculateDirectionalProgress`
   - `supabase/functions/_shared/okr-progress.ts` → função `calcDirectionalProgress`

   Regra nova (aplicada só quando `direction === 'down'` e `baseline ≤ target`):
   - `current ≤ target` → `100`
   - `current > target` → `Math.max(0, (target / current) × 100)` (penalidade suave em função do estouro; converge a 0 conforme `current → ∞` e vale ~91% quando estoura 10%).

   Comportamento das KRs de redução legítimas (`baseline > target`) permanece idêntico.

2. **Testes** — cobrir o caso em `supabase/functions/_shared/__tests__/okr-progress.contract.test.ts` e no teste espelho do frontend (se existir). Cenários:
   - `down, baseline=0, target=6700, current=6389.23` → 100
   - `down, baseline=0, target=6700, current=6700` → 100
   - `down, baseline=0, target=6700, current=7370` (10% estouro) → ~91
   - `down, baseline=10000, target=6700, current=6389.23` (redução clássica) → mantém fórmula antiga (~109% sem clamp)

3. **Validação no wizard de KR** (defensiva, mas leve) — em `src/modules/okrs/**` no passo de KR com `direction = down`:
   - Se `baseline ≤ target`, exibir hint informativo: "KR interpretada como limite (cap). Progresso será 100% enquanto o valor estiver ≤ meta."
   - Não bloquear salvamento (não quebrar KRs legadas nem casos legítimos de cap).

4. **Documentação** — adicionar nota em `docs/canonical/modules/okrs.md` (ou no doc de progress canon já referenciado no cabeçalho do SSOT) descrevendo o modo cap e a regra `baseline ≤ target ⇒ cap`.

## Fora de escopo

- Nenhuma migration no banco. `baseline`, `target`, `current_value` permanecem como estão.
- Nada relacionado a KPI primário / effective_current_value.
- Nada no cálculo de `up` ou `maintain`.

## Detalhes técnicos

Trecho `down` proposto (idêntico nos dois arquivos, mudando só sintaxe TS):

```ts
// direction === "down"
if (baseline <= target) {
  // KR-cap: "manter/limitar a ≤ target"
  if (current <= target) return 100;
  return Math.max(0, (target / current) * 100);
}
if (baseline === target) return current <= target ? 100 : 0; // já coberto acima, mantido por clareza
return Math.max(0, ((baseline - current) / (baseline - target)) * 100);
```

## Verificação

- `bunx vitest run supabase/functions/_shared/__tests__/okr-progress.contract.test.ts`
- Recarregar a página da KR no preview e confirmar que passa a exibir 100% (com R$ 6.389,23 / R$ 6.700).
