## Contexto

No MBR Executivo (`/rituals/mbr?step=kpi-gate`) só existem hoje cards de "KPIs em atenção" (amarelo/vermelho). Falta um overview comparativo mês de referência vs mês anterior dos KPIs **globais (org)** e **de área**, agrupados por área/time — exatamente como o Pré-MBR já mostra em `MbrPreOpeningStep` ("Comparativo vs mês anterior").

A análise sempre considera o **mês fechado anterior** (já existe `draft.data.referenceMonth` em `MbrPage` + `ReferenceMonthPicker`); a semântica de bucket mensal de `useMbrPreTeamKpisMonthly` ignora distorções de parciais do mês corrente (TCR §Q.5).

## Princípios

- **Não duplicar**: extrair `KpiDeltaRow`, `computeKpiDeltas` e `formatKpiValue` (hoje internos a `MbrPreOpeningStep.tsx`) para `wizards/shared/`. Pré-MBR e MBR Executivo passam a consumir o mesmo componente.
- **BU isolation + sem `select('*')`** + `.is('deleted_at', null)` + `.neq('indicator_type','metric')` + `.in('lifecycle_status', ['active'])`.
- **Query keys** via `mbrKeys.*` (`src/lib/queryKeys/okrs.ts`).
- **Ancoragem mensal**: usar a mesma lógica de `useMbrPreTeamKpisMonthly` (último valor por KPI dentro de cada bucket mensal).
- **Sem mudanças** em backend, edge functions, migrations, draft schema, gate logic ou snapshots.

## Mudanças

### 1. Componente compartilhado de comparativo mensal

**Criar** `src/modules/okrs/components/wizards/shared/KpiMonthlyComparisonCard.tsx`:
- Props: `snapshots: MbrKpiSnapshot[]`, `title?: string`, `headerRight?: React.ReactNode`.
- Internamente: `KpiDeltaRow`, `computeKpiDeltas`, `formatKpiValue` (movidos de `MbrPreOpeningStep`).
- Renderiza o mesmo bloco "Maiores avanços / Maiores quedas / N sem dado anterior" — mesma UI da screenshot.
- Exportar em `wizards/shared/index.ts`.

`MbrPreOpeningStep` passa a importar e usar `KpiMonthlyComparisonCard` (regressão visual zero).

### 2. Hook de KPIs mensais por escopo (org/área)

**Criar** `src/modules/okrs/hooks/useMbrMonthlyKpisByScope.ts`:
- Assinatura: `useMbrMonthlyKpisByScope(referenceMonth, scopes: Array<'org'|'area'>)`.
- Mesma estrutura de `useMbrPreTeamKpisMonthly` (último valor em cada bucket mensal), mas:
  - Sem filtro por `responsible_team_id`.
  - `.in('scope', scopes)`, `.neq('indicator_type','metric')`, `.eq('lifecycle_status','active')`.
  - Joins para `area` e `team` (igual `useAllBuKpisForMbr`).
- Retorna `Array<MbrKpiSnapshot & { areaId, areaName, areaColor, teamId, teamName }>`.
- Query key: `mbrKeys.monthlyKpisByScope(currentBuId, refMonth, scopesKey)` (adicionar helper).
- Exportar via `hooks/index.ts`.

### 3. Overview prepend no `MbrKpiGateStep`

Estender `MbrKpiGateStep` (retrocompatível) com props opcionais:
- `referenceMonth?: string`
- `showMonthlyOverview?: boolean` (default `false`).

Quando `showMonthlyOverview && referenceMonth`:
1. Chama `useMbrMonthlyKpisByScope(referenceMonth, ['org','area'])`.
2. Acima dos cards atuais, renderiza dois blocos:
   - **"KPIs Globais"** (`scope='org'`) — agrupados por **Área → Time** (KPI sem área → "Sem área"; sem time → "Sem time").
   - **"KPIs de Área"** (`scope='area'`) — agrupados por **Time** (sem time → "Sem time").
3. Cada grupo renderiza um `KpiMonthlyComparisonCard` com o sub-header `"Área X · Time Y"` (ou só `"Time Y"` no segundo bloco).
4. Se um grupo não tem dados comparáveis: microcopy `"Sem dados comparáveis em <mês>."`.

### 4. Wire em `MbrPage.tsx`

No `case 'kpi-gate'`:
```tsx
<MbrKpiGateStep
  ...props atuais
  referenceMonth={draft.data.referenceMonth}
  showMonthlyOverview
/>
```

## Arquivos tocados

- **Criar** `src/modules/okrs/components/wizards/shared/KpiMonthlyComparisonCard.tsx`
- **Criar** `src/modules/okrs/hooks/useMbrMonthlyKpisByScope.ts`
- **Editar** `src/modules/okrs/components/wizards/shared/index.ts` (export)
- **Editar** `src/modules/okrs/hooks/index.ts` (export)
- **Editar** `src/lib/queryKeys/okrs.ts` (`mbrKeys.monthlyKpisByScope`)
- **Editar** `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx` (consome shared; remove duplicatas)
- **Editar** `src/modules/okrs/components/wizards/mbr/MbrKpiGateStep.tsx` (Overview + props novas)
- **Editar** `src/modules/okrs/pages/MbrPage.tsx` (passa `referenceMonth` + `showMonthlyOverview`)

## Validação

- `/rituals/mbr?step=kpi-gate`: dois blocos novos no topo (Globais → Área→Time; Área → Time), com a mesma UI do Pré-MBR.
- `/rituals/mbr-pre?step=opening`: card "Comparativo vs mês anterior" idêntico (regressão zero).
- Trocar mês no `ReferenceMonthPicker` do MBR atualiza os blocos.
- KPIs sem valor no mês anterior aparecem em "N sem dado anterior".
