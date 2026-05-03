## Contexto

Hoje os ritos `mbr-pre` e `mbr` usam `new Date()` como `referenceMonth`, então em maio analisam **maio em curso**, não abril. Os snapshots de KPI também ignoram o mês alvo (pegam "último valor" e "anterior" sem janela temporal). Precisamos:

1. Mudar o **mês alvo padrão** para o mês imediatamente anterior à data de execução.
2. Permitir que admins **escolham outro mês fechado** (seletor leve), para refazer/auditar análises passadas.
3. Garantir que o **snapshot de KPI** reflita o mês alvo (último valor com `reference_date` dentro do mês), para que a comparação "mês alvo vs mês anterior" seja honesta.

Premissa confirmada: pré-MBRs e MBR são executados **no início do mês seguinte** ao mês analisado. A janela de submissões agregadas no MBR continua sendo o mês de execução (corrente), pois é exatamente quando os pré-MBRs são feitos.

## Arquivos afetados

- `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx` — remover `currentReferenceMonth()` local e usar `referenceMonth` vindo do draft via prop.
- `src/modules/okrs/pages/MbrPrePage.tsx` — calcular `referenceMonth` default = mês anterior; passar para `MbrPreOpeningStep`; ancorar snapshot de KPIs no mês alvo.
- `src/modules/okrs/pages/MbrPage.tsx` — mudar `DEFAULT_DATA.referenceMonth` para mês anterior; expor seletor de mês alvo no header do wizard (admins).
- `src/modules/okrs/utils/mbr/referenceMonth.ts` (novo, pequeno) — helpers SSOT: `previousMonth()`, `currentReferenceMonth()`, `formatMonthLabel()`, `monthBoundsISO()`. Atualmente cada arquivo redefine. Centralizar evita drift.
- `src/modules/okrs/components/wizards/shared/ReferenceMonthPicker.tsx` (novo, opcional — só se reutilizável) — seletor compacto de mês (lista dos últimos 12 meses fechados). Reutiliza `Select` do design system; sem dependência nova.
- `src/modules/okrs/types/wizard/mbr.ts` — confirmar/expandir doc do campo `referenceMonth` (semântica: "mês analisado, sempre fechado"). Sem mudança estrutural.

**O que NÃO muda**:
- Edge function `mbr-pre-month-analysis/index.ts` — já recebe `referenceMonth` + `previousMonth` no body. O contrato está correto; só passa a receber o valor certo.
- `useMbrPreSubmissions` — continua filtrando por `completed_at` no mês corrente (mês de execução), que é quando os pré-MBRs são feitos. Mantemos a janela atual.
- Tipos em DB. Nenhuma migration.

## Mudanças, passo a passo

### 1. Helpers SSOT (`utils/mbr/referenceMonth.ts`)
- `previousMonthOf(yyyymm)`, `currentMonth()`, `defaultReferenceMonth()` (= `previousMonthOf(currentMonth())`).
- `formatMonthLabel(yyyymm)` em pt-BR.
- `lastNClosedMonths(n)` para alimentar o seletor.
- Exportar de `src/modules/okrs/utils/index.ts` (se já existir barrel) ou usar import direto.

### 2. `MbrPreOpeningStep.tsx`
- Receber `referenceMonth` por prop (já passado pelo MbrPrePage).
- Remover função local `currentReferenceMonth()` e `formatMonthLabel()` (importar do helper).
- O título "Resumo de {mês}" passa a refletir o mês alvo do draft.

### 3. `MbrPrePage.tsx`
- `DEFAULT_DATA.referenceMonth = defaultReferenceMonth()`. Hoje não existe esse campo no `DEFAULT_DATA` do MBR-Pre — adicionar.
- Passar `referenceMonth={draft.data.referenceMonth}` para `MbrPreOpeningStep`.
- **Snapshot de KPI ancorado no mês alvo**: na query de KPIs (linha ~288), além de buscar `kpi_values` ordenado por `reference_date desc`, aplicar `lte('reference_date', endOfMonth(refMonth))`. Para cada KPI:
  - `currentValue` = primeiro registro com `reference_date BETWEEN start(refMonth) AND end(refMonth)`. Se não houver, `null` + flag `noDataForMonth`.
  - `previousValue` = primeiro registro com `reference_date < start(refMonth)`.
  - `lastValueAt` = `reference_date` do `currentValue`.
- Reseed automático quando `referenceMonth` muda (adicionar `refMonth` no `lastSeededTeamRef` para forçar re-snapshot).
- Adicionar seletor `ReferenceMonthPicker` no header do wizard (apenas admins/líder do time, controlado por permission key existente). Usuários comuns veem o mês fixo.

### 4. `MbrPage.tsx`
- `DEFAULT_DATA.referenceMonth = defaultReferenceMonth()`.
- Adicionar seletor `ReferenceMonthPicker` no header (admins).
- `useMbrPreSubmissions` continua sendo invocado com `draft.data.referenceMonth`; ajustar a documentação interna do hook para deixar claro: "filtra `completed_at` por janela do mês de **execução** = `previousMonthOf(referenceMonth) + 1` na prática? Não — pré-MBRs feitos no início de maio analisam abril; ambos têm o **mesmo `referenceMonth = abril`**. Logo, o filtro continua por `referenceMonth` no draft do pré-MBR (campo dentro de `reflection_data`), não por `completed_at`."
  - **Mudança real**: refatorar `useMbrPreSubmissions` para filtrar por `reflection_data->>'referenceMonth' = refMonth` em vez de `completed_at` no mês corrente. Isso garante que MBR e pré-MBRs casem pelo mês analisado, não pela data civil de execução. Menos frágil a atrasos (pré-MBR feito dia 5/jun analisando maio continua aparecendo no MBR de maio).

### 5. Seletor de mês (`ReferenceMonthPicker`)
- Componente fino sobre `Select` do design system.
- Lista `lastNClosedMonths(12)` formatado em pt-BR.
- Visibilidade controlada por permission key já existente para abrir o rito (não criar nova).
- Quando o usuário troca o mês: chama `updateDraft({ referenceMonth: novoMes })`. Os efeitos de reseed cuidam do resto (KPIs re-buscados, análise IA invalidada — `monthAnalysis` zerado).

## Detalhes técnicos importantes

- **Timezone**: usar `date-fns` com fuso local do navegador (consistente com o resto do app — ver `cycles-and-rituals-master`). Funções de bound de mês: `startOfMonth` / `endOfMonth` convertidas para ISO.
- **Soft deletes**: `kpi_values` não tem soft delete documentado; manter query atual sem filtro.
- **Query keys**: incluir `refMonth` em todas as keys que dependem dele (`mbrKeys.preSubmissions(buId, refMonth)` já faz; `useMbrPreTeamProjects` não depende de mês — ok).
- **Análise IA invalidada ao trocar mês**: ao mudar `referenceMonth`, zerar `draft.data.monthAnalysis` para evitar exibir análise de outro mês.
- **Sem `select('*')`**: queries existentes já listam colunas; manter.
- **BU isolation**: já presente nas queries; nada novo.

## Critérios de aceite

1. Acessando o pré-MBR em 03/maio, o cabeçalho mostra "Resumo de abril de 2026" (e não maio).
2. KPIs exibidos têm `currentValue` = último registro com `reference_date` em abril; `previousValue` = último com `reference_date` em março.
3. Análise IA gerada cita "abril" como referência e "março" como comparativo.
4. Admin vê seletor de mês e consegue escolher fevereiro/março; ao trocar, snapshot e análise são re-disparados; usuários sem permissão veem o mês fixo.
5. MBR (consolidação) lista submissões pré-MBR pelo mês analisado (`referenceMonth`), não pela data de execução — pré-MBR feito em 06/maio analisando abril aparece no MBR de "abril".
6. Sem regressão: rito sem submissões/sem KPIs continua exibindo empty states (já implementado).
