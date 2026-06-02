# Adicionar preset "Todo o ano" em Período (Análise)

## Mudança
Em `src/modules/analysis/components/composer/PeriodPills.tsx`, adicionar um novo preset ao array `presets`:

- key: `this_year`
- label: `Todo o ano`
- build: `startOfYear(new Date())` → `endOfYear(new Date())` (importar de `date-fns`)

Sem outras mudanças (UI, tipos e edge function já suportam qualquer intervalo `start`/`end`).
