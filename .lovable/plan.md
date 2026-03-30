

## Diagnóstico

O erro `TypeError: s.map is not a function` ocorre em `QbrPrePage` porque `draft.data.proposedOkrs` é passado diretamente para `QbrOkrProposalStep` (linha 439) **sem chamar `normalizeProposedOkrs`**. 

Quando um rascunho antigo (formato single-objective, objeto ao invés de array) é carregado do banco, `.map()` falha pois o valor não é um array. As páginas `QbrPreCLevelPage` e `QbrPostPage` já usam `normalizeProposedOkrs` corretamente — o `QbrPrePage` ficou sem.

## Correção

**Arquivo:** `src/modules/okrs/pages/QbrPrePage.tsx`

1. Adicionar `normalizeProposedOkrs` ao import existente de `@/modules/okrs/types/wizard`
2. Na linha 439, trocar:
   ```tsx
   proposedOkrs={draft.data.proposedOkrs}
   ```
   por:
   ```tsx
   proposedOkrs={normalizeProposedOkrs(draft.data.proposedOkrs)}
   ```
3. Aplicar a mesma normalização na passagem de `draftData` para `QbrPreSummary` (se `proposedOkrs` é lido lá também), garantindo que o summary também não quebre.

Correção pontual, uma linha de import + uma chamada de função. Sem risco de regressão.

