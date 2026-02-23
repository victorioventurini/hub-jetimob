

## Problema

A KR "Aumentar taxa média de abertura JetNews" atingiu **156% da meta** (Base: 0, Atual: 28, Meta: 18), mas os wizards exibem **100%** porque o cálculo de progresso está limitado com `Math.min(100, ...)`.

O componente `OkrProgressBar` (usado no dashboard `/okrs`) já trata superação corretamente desde uma iteração anterior: exibe badge "Meta superada", texto verde, e percentual real (ex: 156%). Porém, **os wizards e outros cards não seguem o mesmo padrão**.

## Locais Afetados (13 arquivos)

### Grupo 1: Cálculo de progresso limitado a 100% (LÓGICA)

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `CollaboratorCheckinStep.tsx` | 160 | `Math.min(100, Math.max(0, ...))` no `newProgress` |
| `OrgObjectiveCard.tsx` | 64-67 | `Math.min(100, ...)` no `avgProgress` de cada KR |
| `TeamObjectiveCard.tsx` | 98-101 | Idem ao anterior |
| `KrHistoryDialog.tsx` | 82 | `Math.min(100, ...)` no cálculo de progresso |

### Grupo 2: Barra visual sem tratamento de superacao (UI)

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `TeamKrReviewStep.tsx` | 274 | `<Progress value={currentKr.progress}` sem cap visual mas sem indicador de superacao |
| `TeamOpeningStep.tsx` | 102 | `<Progress value={stats.avgProgress}` sem cap visual |
| `LeaderAlignmentStep.tsx` | 131, 160 | `<Progress value={teamProgress}` e `value={obj.progress}` sem cap |
| `KrContextCard.tsx` | 113, 166 | Ja tem `Math.min(100, progress)` na barra (correto) e mostra % real (correto) |

## Solucao

Aplicar o **mesmo padrao do `OkrProgressBar`** em todos os componentes dos wizards:

1. **Barra visual**: Sempre `Math.min(100, progress)` (a barra enche ate 100% no maximo)
2. **Label de percentual**: Mostrar o valor real (ex: 156%), com cor verde quando > 100%
3. **Badge "Meta superada"**: Exibir quando progress > 100%

### Detalhamento Tecnico

**Arquivo 1: `CollaboratorCheckinStep.tsx` (linha 160)**
- Remover `Math.min(100, ...)` do calculo `newProgress` para permitir valores > 100
- Na renderizacao da barra, usar `Math.min(100, newProgress)` 
- No label, exibir `newProgress` real com estilizacao verde se > 100%

**Arquivo 2: `OrgObjectiveCard.tsx` (linhas 64-67)**
- Remover `Math.min(100, ...)` do calculo individual de cada KR
- Usar `calculateProgress` da fonte de verdade (`src/modules/okrs/utils/progressCalculation.ts`) que ja nao limita a 100%
- Na barra visual, manter `Math.min(100, avgProgress)`

**Arquivo 3: `TeamObjectiveCard.tsx` (linhas 98-101)**
- Mesmo tratamento do `OrgObjectiveCard`

**Arquivo 4: `KrHistoryDialog.tsx` (linha 82)**
- Remover `Math.min(100, ...)` do calculo
- Usar `calculateProgress` util
- Na barra visual (linha 172), ja esta com `Math.min(100, progress)` (correto)
- Adicionar indicador visual de superacao no label

**Arquivo 5: `TeamKrReviewStep.tsx` (linhas 271-281)**
- Adicionar `Math.min(100, currentKr.progress)` na prop `value` da barra
- Estilizar o label `{Math.round(currentKr.progress)}%` com cor verde quando > 100%
- Adicionar badge "Meta superada" quando progress > 100%

**Arquivo 6: `TeamOpeningStep.tsx` (linhas 102, 133, 156)**
- Adicionar `Math.min(100, ...)` na barra (linha 102)
- Estilizar labels com cor verde quando > 100%

**Arquivo 7: `LeaderAlignmentStep.tsx` (linhas 131, 160)**
- Adicionar `Math.min(100, ...)` na barra
- Estilizar labels verde quando > 100%

### Padrao Visual Unificado (extraido do `OkrProgressBar`)

```text
Se progress > 100%:
  - Barra:  width = 100% (visual cap)
  - Label:  "156%" em cor text-status-green + font-medium
  - Badge:  [Rocket icon] "Meta superada" (bg-status-green/15, text-status-green)

Se progress <= 100%:
  - Comportamento normal (sem alteracoes)
```

### Atualizacao de Documentacao

- Atualizar `DEVELOPMENT_STANDARDS.md` com regra explicita: "Nunca limitar o CALCULO de progresso a 100%. Limitar apenas a BARRA VISUAL. O label deve exibir o valor real."
- Atualizar `TECHNICAL_CONTEXT_REGISTRY.md` com changelog da correcao

