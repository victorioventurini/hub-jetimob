## Objetivo
Revisar a UI do step `kpi-analysis` do Pré-MBR (`/rituals/mbr-pre?step=kpi-analysis`) para que **toda a informação relevante do KPI** apareça por página E o **campo de justificativa + plano de ação** sempre fique visível para os KPIs que exigem ação.

---

## Análise (TCR + canônicos)

- **Componente atual**: `QbrKpiAnalysisStep` em modo `paginated` (consumido pelo `MbrPrePage` no `case 'kpi-analysis'`). Por página, renderiza apenas o `KpiAnalysisCard`, que é uma versão **enxuta** (nome + RAG + meta + valor + sparkline pequena de 64px). Faltam: **descrição**, **valor anterior**, **variação vs anterior**, **owner**, **frequência de update/consolidação**, **fonte**, **gráfico completo**, **histórico** e **KRs vinculados**.
- **Componente canônico já existente** (sem precisar criar nada novo): **`KpiDetailContent`** (`src/modules/kpis/components/KpiDetailContent.tsx`). É o **mesmo** componente usado no `KpiSidePanel` e na página dedicada de KPI. Mostra: descrição, sparkline grande, evolução com `recharts`, valores históricos, KRs vinculados, frequência, owner, fonte, escopo, badges. Carrega tudo internamente via `useKpiDetail(kpiId)`.
- **Campo de justificativa**: o `JustificationField` já existe e é renderizado pelo `KpiAnalysisCard` quando `mode === 'justify' | 'explain-no-data'` ou ainda `update-value` (form de valor). Hoje esse campo está visível apenas em RAG `red`/`yellow` ou `no_data`/`overdue`. Para um KPI verde + em dia o bucket é `view` e nada aparece — comportamento correto, mas **a página atual mostra um único bloco compacto**, dando a sensação visual de que “falta o campo”.
- **TCR §KPI Frequency Split v3.0.0** + `KPIs Master`: input via `KpiValueEntryForm` quando `update-value`. Snapshot canônico em `MbrKpiSnapshot` já tem `consolidationFrequency`, `updateFrequency`, `latestInputType`. Não precisa estender o snapshot.
- **Wizard Master**: Pré-MBR é reflexivo — não muda persistência além de `kpiOutdatedUpdates`/`kpiNoDataReasons`/`kpiJustifications` que já existem. Não há mudança de modelo.

---

## O que muda

### 1. `KpiAnalysisCard` (em `QbrKpiAnalysisStep.tsx`) — extensão, sem duplicação

Adicionar prop opcional `detailed?: boolean`. Quando `true`:

- **Substituir** o bloco compacto (header + sparkline 64px) por **`<KpiDetailContent kpiId={kpi.kpiId} />`**, que já entrega todas as informações canônicas do KPI.
- **Manter** os badges de bucket (`Desatualizado`, `Sem dados`, `Atualizado nesta sessão`) acima do `KpiDetailContent`.
- **Manter** o bloco de ação obrigatória (`JustificationField` / `KpiValueEntryForm`) **abaixo** do detalhe — separado por divisor, com destaque visual de "Ação obrigatória do líder".

Quando `detailed` é falso (default), comportamento atual permanece — preserva uso pelo QBR-Pré em modo lista.

### 2. `QbrKpiAnalysisStep` — passar `detailed` apenas no modo paginado

Na renderização do `KpiAnalysisCard` dentro do bloco `if (paginated) { ... }` (linha 500): adicionar `detailed`. Modo lista (QBR-Pré) fica intocado.

### 3. Sempre exibir bloco de ação no modo paginado

Para KPIs cujo bucket caiu em `'view'` (verde + em dia) **e ainda assim a página exige interação** — o usuário deveria poder registrar uma observação opcional. Entretanto: pelo plano original, KPIs `view` **não entram** em `actionableKpis` (são listados apenas no bloco-resumo final). Confirmar esse comportamento na implementação atual e:

- Se o usuário caiu em uma página sem campo, **provavelmente é um KPI no bucket `update-value` ou `explain-no-data`** que está mostrando o form de valor / explicação corretamente — mas hoje **o form fica embaixo do mini-card de 64px**, e o usuário pode não ter percebido.
- A ativação do `detailed` resolve a percepção: o KPI aparece em sua dimensão completa, e a ação obrigatória ganha destaque visual com header "Plano de ação" em vez de só "Justifique o desvio do KPI".

### 4. Microajustes visuais no `JustificationField` exibido pelo card

- Renomear o `label` no contexto do Pré-MBR de "Justifique o desvio do KPI" para **"Justificativa e plano de ação"**, com `hint` mais explícito ("Explique o motivo + descreva as próximas ações").
- Aplicar somente quando `detailed=true` (não afeta QBR-Pré).
- Mesmo tratamento para `'explain-no-data'`: label "Por que está sem dados? Plano para destravar".

---

## Arquivos afetados

- `src/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep.tsx`
  - Adicionar prop `detailed?: boolean` em `KpiAnalysisCardProps`.
  - Renderizar `KpiDetailContent` quando `detailed=true`, mantendo a área de ação (`JustificationField` / `KpiValueEntryForm`) abaixo, com label/hint reforçados.
  - Passar `detailed` no consumo dentro do bloco paginado.

Sem mudanças em `MbrPrePage.tsx`, no schema do snapshot, ou nas hooks de KPI. Sem novo componente — extensão do canônico já existente.

---

## Detalhes técnicos

```tsx
// KpiAnalysisCardProps
interface KpiAnalysisCardProps {
  // ... existentes
  /** Renderiza o detalhe canônico completo do KPI (KpiDetailContent) e
   *  destaca a ação do líder em um bloco separado. Usado pelo Pré-MBR. */
  detailed?: boolean;
}

// Render condicional
{detailed ? (
  <>
    <KpiDetailContent kpiId={kpi.kpiId} />
    {effectiveMode !== 'view' && (
      <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-warning-foreground">
          Plano de ação do líder
        </h4>
        {/* JustificationField / KpiValueEntryForm — labels reforçados */}
      </div>
    )}
  </>
) : (
  // mini-card atual (preserva uso pelo QBR-Pré)
)}
```

Não há regressão para QBR-Pré: `detailed` permanece `undefined` lá.