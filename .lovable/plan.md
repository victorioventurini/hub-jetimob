

## Plano: Corrigir contagem de KRs no Scorecard do QBR C-Level

### Problema
No `TeamScorecardCard` dentro de `QbrCLevelQuarterBalanceStep`, dois estados de KR não são contabilizados nos contadores visíveis:
- **`not_started`**: incrementa `totalKrs` mas nenhum contador principal
- **`stagnant`**: incrementa apenas o campo `stagnant` (condicional), mas não entra no `if/else` dos 4 contadores principais

Resultado: a soma dos contadores visíveis é menor que `totalKrs`.

### Arquivo impactado

| Arquivo | Mudança |
|---------|---------|
| `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelQuarterBalanceStep.tsx` | Corrigir lógica de categorização + adicionar contador visual |

### Mudanças detalhadas

**1. Lógica de categorização (linhas 324-331)**

Adicionar `not_started` como categoria visível e tratar `stagnant` no else-chain para que conte em "Em risco" (pois inatividade é sinal de risco):

```typescript
const state = calculateKrState(buildKrStateParams(tkr));

if (state === 'achieved' || state === 'exceeded') entry.achieved++;
else if (state === 'healthy') entry.onTrack++;
else if (state === 'at_risk' || state === 'stagnant') entry.atRisk++;
else if (state === 'off_track' || state === 'not_achieved') entry.offTrack++;
else if (state === 'not_started') entry.notStarted++;

if (state === 'stagnant') entry.stagnant++;
```

**2. Interface `TeamScorecardData` (linha 182)**

Adicionar campo `notStarted: number`.

**3. UI do `TeamScorecardCard` (linhas 225-253)**

Adicionar linha "Não iniciadas" no grid quando `> 0`, usando ícone cinza (mesmo padrão dos outros contadores).

**4. Cálculo de health score**

Incluir `notStarted` no cálculo: KRs não iniciadas contribuem para o risco de saúde do time (similar a stagnant).

### Resultado esperado

No time "Comercial" (Total 3 KRs): Em risco 1, Não iniciadas 2 — soma bate com o total.

