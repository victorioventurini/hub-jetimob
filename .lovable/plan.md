

# Corrigir bug residual de valor zero e adicionar testes de KPIs

## Problema

KPIs com valor `0` (ex: Turnover da Natalia) nao sao exibidos corretamente no contexto do agente Vic, pois o operador `||` em `KpiCard.tsx` trata `0` como falsy.

## 1. Correcao do bug (KpiCard.tsx)

**Arquivo:** `src/modules/kpis/components/KpiCard.tsx` (linhas 241-242)

Substituir `||` por `??`:

```typescript
// DE:
currentValue: kpi.current_value || undefined,
targetValue: kpi.target_value || undefined,
// PARA:
currentValue: kpi.current_value ?? undefined,
targetValue: kpi.target_value ?? undefined,
```

Isso preserva `0` como valor valido enquanto converte apenas `null` para `undefined`.

## 2. Testes automatizados

### 2.1 Teste unitario: `calculateRagStatus`

**Arquivo novo:** `src/modules/kpis/__tests__/calculateRagStatus.test.ts`

Casos:
- Retorna `'no_data'` quando `currentValue` e `null`
- Retorna `'no_data'` quando `targetValue` e `null`
- Retorna `'on_track'` com 90%+ da meta (direction up)
- Retorna `'at_risk'` com 70-90% da meta
- Retorna `'off_track'` abaixo de 70%
- Direction `'down'` inverte a logica (menor e melhor)
- Valor `0` com `targetValue > 0` retorna `'off_track'` (nao `no_data`)
- `targetValue = 0` com direction `'up'` — divisao por zero tratada

### 2.2 Teste unitario: mapeamento de valores (useKpiData)

**Arquivo novo:** `src/modules/kpis/hooks/__tests__/kpiValueMapping.test.ts`

Testa a logica pura (sem React) de mapeamento de valores:
- `current_value` e `0` quando primeiro valor e `0` (nao null)
- `trend` e `'stable'` quando `previousValue` e null
- Variacao calculada corretamente com valores positivos
- `previousValue = 0` nao causa divisao por zero
- RAG status com `current_value = 0` e `target_value > 0` retorna `off_track`

### 2.3 Teste de componente: KpiCard com valor zero

**Arquivo novo:** `src/modules/kpis/components/__tests__/KpiCard.test.tsx`

- Renderiza "0" corretamente quando `current_value` e `0` (nao "---")
- `formatValue(0)` retorna "0" para unidades genericas
- `formatValue(0)` retorna "0,0%" para unidade `%`
- Contexto Vic recebe `currentValue: 0` (nao `undefined`) apos fix com `??`

### 2.4 Teste de integracao: wizard save + invalidation

**Arquivo novo:** `src/modules/okrs/pages/__tests__/CollaboratorCheckinKpiSave.test.ts`

- Mutacao `addKpiValueSilent` chama insert com campos corretos
- `onSuccess` invalida `queryKeys.kpis.valuesPrefix()`, `all(null)`, `listPrefix()`, e `kpiWithHistory(kpiId)`
- Falha exibe toast warning (nao bloqueia wizard)
- Valor `0` e persistido corretamente

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/modules/kpis/components/KpiCard.tsx` | Fix: `\|\|` para `??` (2 linhas) |
| `src/modules/kpis/__tests__/calculateRagStatus.test.ts` | Novo |
| `src/modules/kpis/hooks/__tests__/kpiValueMapping.test.ts` | Novo |
| `src/modules/kpis/components/__tests__/KpiCard.test.tsx` | Novo |
| `src/modules/okrs/pages/__tests__/CollaboratorCheckinKpiSave.test.ts` | Novo |

