## Contexto

No step "Atualizar Indicador" do rito Colaborador (`CollaboratorKpiStep.tsx`, linhas 298-319), o adorno do campo de valor mostra um delta solto como `−27,00`. É o **delta absoluto vs. o último valor registrado** (`currentValue − kpi.latest_value`).

Estado atual:
- `currentValue` é `undefined` enquanto o usuário não digita (ver linhas 94 e 113-116). Logo, o delta hoje **não aparece antes da digitação** — bom. Mas se o usuário digitar e apagar, `currentValue` volta a `undefined` e o delta some, o que é o comportamento desejado.
- Problema visual real: o número aparece **sem rótulo, sem unidade e com cor que ignora `direction`**. Para EBITDA (47% → 20%) vê-se só `↓ −27,00`.

## Mudança proposta (UI/apresentação, arquivo único)

Arquivo: `src/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep.tsx`

Reescrever apenas o bloco do `valueChange` dentro do `valueAdornmentSlot` (linhas 300-319). Sem mexer em schema, mutation, RAG, gating de notes, sparkline ou outros consumidores do `KpiValueEntryForm`.

### 1. Garantir o gate "só após o usuário digitar"
Manter a guarda atual `valueChange !== null` (que já depende de `currentValue !== undefined`) e adicionar explicitamente `kpi.latest_value !== null` para clareza.

### 2. Rótulo + unidade canônica
Trocar `+/− N.NN` por:

```
↑/↓  vs. último: +X,XX <unidade>
```

- Importar `formatValueWithUnit` de `@/shared/constants/units` (mesmo helper já usado pelo `KpiSparkline`).
- Para `kpi.unit === '%'`, exibir o sufixo **`p.p.`** (pontos percentuais), pois diferença entre percentuais não é percentual. Helper local pequeno:
  ```ts
  const formatDelta = (delta: number, unit: string) => {
    const sign = delta > 0 ? '+' : '';
    if (unit === '%') return `${sign}${delta.toFixed(2)} p.p.`;
    return `${sign}${formatValueWithUnit(delta, unit)}`;
  };
  ```
- Adicionar tooltip nativo `title={\`Último valor: ${formatValueWithUnit(kpi.latest_value, kpi.unit)}\`}` para dar contexto sem poluir.

### 3. Cor sensível a `kpi.direction`
- `direction === 'up'`: subida = `text-success`, queda = `text-destructive`.
- `direction === 'down'`: queda = `text-success`, subida = `text-destructive`.
- Sem mudança = `text-muted-foreground`.

```tsx
const isImprovement = kpi.direction === 'down' ? valueChange < 0 : valueChange > 0;
const isWorse       = kpi.direction === 'down' ? valueChange > 0 : valueChange < 0;
```

### JSX final (substitui linhas 300-319)

```tsx
{valueChange !== null && kpi.latest_value !== null && (
  <span
    className={cn(
      'flex items-center gap-1 text-sm font-medium',
      isImprovement ? 'text-success' : isWorse ? 'text-destructive' : 'text-muted-foreground',
    )}
    title={`Último valor: ${formatValueWithUnit(kpi.latest_value, kpi.unit)}`}
  >
    {isImprovement ? <TrendingUp className="h-4 w-4" />
      : isWorse ? <TrendingDown className="h-4 w-4" /> : null}
    <span className="text-muted-foreground font-normal">vs. último:</span>
    {formatDelta(valueChange, kpi.unit)}
  </span>
)}
```

## Resultado esperado

Cenário EBITDA (`direction='up'`, último=47%, meta=20%):

| Estado | O que aparece |
|---|---|
| Campo vazio (mount) | (nada) |
| Usuário digita `2` | `↓ vs. último: −45,00 p.p.` em vermelho, tooltip "Último valor: 47,00%" |
| Usuário digita `20` | `↓ vs. último: −27,00 p.p.` em vermelho |
| Usuário digita `50` | `↑ vs. último: +3,00 p.p.` em verde |
| Usuário apaga tudo | (nada) |

Cenário Turnover (`direction='down'`, último=12%, novo=8%):
- `↓ vs. último: −4,00 p.p.` em **verde** (queda é boa).

## Fora de escopo

- Cálculo de RAG, gating de notes, persistência, sparkline, badges de escopo (já feitos), validações.
- Outros wizards/ritos. Mudança contida ao `valueAdornmentSlot` deste step.
