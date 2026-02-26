
# Ajuste do ROI Estimado e Filtragem por Escopo

## Problema Identificado

O contexto (`EventsContext`) expoe `opportunities` sem nenhuma filtragem por escopo (evento ou jornada). Todos os 45 registros mockados sao sempre exibidos, independentemente do filtro selecionado. Alem disso, o volume de oportunidades pode ser aumentado para refletir melhor o porte dos eventos.

## Calculo Atual

```text
Participantes totais (jornada): 881
Oportunidades mockadas:          45 (~5.1% dos participantes)
High Fit (fitScore >= 75):       ~25 (55% das 45)
ROI = 25 x R$ 150.000 x 0.18 = R$ 675.000
```

O valor de R$ 675k para uma jornada com 881 participantes e LTV de R$ 150k parece baixo porque a taxa de conversao (18%) desconta muito o pipeline.

## Solucao Proposta

### 1. Adicionar filtragem por escopo no contexto

Criar um campo derivado `filteredOpportunities` no `EventsContext` que filtra as oportunidades conforme o escopo selecionado:
- **Jornada**: retorna oportunidades dos eventos que pertencem a jornada selecionada
- **Evento**: retorna apenas oportunidades do evento selecionado

Todos os componentes do dashboard ja consomem `opportunities` do contexto, entao basta trocar para o array filtrado.

### 2. Aumentar volume de oportunidades mockadas

Ajustar a distribuicao para ~6.5% dos participantes (benchmark B2B):

```text
evt-sm-2026:       51 attendees ->   3 opps (mantido)
evt-pelotas-2026:  45 attendees ->   3 opps (mantido)
evt-capao-2026:    53 attendees ->   4 opps (mantido)
evt-poa-2026:      45 attendees ->   3 opps (mantido)
evt-je-2026:      687 attendees ->  45 opps (de 32 para 45)
Total:                              58 opps
```

### 3. Calculo revisado (apos ajustes)

Com a jornada completa selecionada:

```text
Oportunidades totais:   58
High Fit (55%):         ~32
ROI = 32 x R$ 150.000 x 0.18 = R$ 864.000
```

Com apenas o Jet Experience 2026 selecionado:

```text
Oportunidades totais:   45
High Fit (55%):         ~25
ROI = 25 x R$ 150.000 x 0.18 = R$ 675.000
```

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/modules/events/context/EventsContext.tsx` | Adicionar `filteredOpportunities` derivado dos filtros de escopo; expor no contexto |
| `src/modules/events/mocks/opportunities.ts` | Aumentar opps do evt-je-2026 de 32 para 45 (total: 58) |
| `src/modules/events/components/dashboard/KpiCards.tsx` | Consumir `filteredOpportunities` em vez de `opportunities` |
| `src/modules/events/components/dashboard/PipelineRoiChart.tsx` | Idem |
| `src/modules/events/components/dashboard/OpportunitiesVolumeChart.tsx` | Idem |
| `src/modules/events/components/dashboard/LeadQualificationFunnel.tsx` | Idem; ajustar totais de inscritos/participantes conforme escopo |
| `src/modules/events/components/dashboard/SegmentationCharts.tsx` | Idem (se aplicavel) |

## Detalhes Tecnicos

No `EventsContext`, a filtragem sera feita com `useMemo`:

```typescript
const filteredOpportunities = useMemo(() => {
  if (filters.scope === "event" && filters.selectedEventId) {
    return opportunities.filter(o => o.eventId === filters.selectedEventId);
  }
  if (filters.scope === "journey" && filters.selectedJourneyId) {
    const journey = JOURNEYS_MOCK.find(j => j.id === filters.selectedJourneyId);
    if (journey) {
      return opportunities.filter(o => journey.eventIds.includes(o.eventId));
    }
  }
  return opportunities;
}, [opportunities, filters]);
```

O campo `opportunities` original permanece para uso em telas que nao dependem do filtro (ex.: lista de oportunidades). O novo `filteredOpportunities` sera usado exclusivamente nos componentes do dashboard.
