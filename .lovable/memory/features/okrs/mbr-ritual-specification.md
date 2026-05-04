# Memory: features/okrs/mbr-ritual-specification
Updated: 2026-05-04

O rito de MBR (Monthly Business Review) é um processo decisório estratégico em sete etapas: 1) Panorama Executivo (agrupa KPIs ativos por escopo: Global/Área/Time, exibe valor atual e meta com `formatValueWithUnit` canônico, mostra `LastCheckinBadge` com data humanizada do último valor via `lastValueAt`, exclui métricas, ordenados por RAG, com título dinâmico 'KPIs Globais da [Nome da BU]'); 2) KPI Gate (análise de indicadores em risco); 3) Overview de OKRs dos Times (layout de cards com pontuação de saúde, filtrando apenas times com OKRs ativas no ciclo atual); 4) Análise Detalhada por Time (UI simplificada: grid Base/Atual/Meta com `formatValueWithUnit`, sem progress bars internas; gate: todos devem ser revisados); 5) OKRs Organizacionais; 6) Decisões Estratégicas (inclui pendências do mês anterior); 7) Encerramento e Governança (checklist + feedback anônimo). O `MbrKpiSnapshot` inclui `unit` (unidade de medida) e `lastValueAt` (ISO date do último valor). O wizard utiliza auto-seeding imutável de KPIs e OKRs para integridade do snapshot histórico, operando no dashboard executivo sob permissão `requiresBuAdmin`. Rota: `/okrs/mbr`.

## Pré-MBR — persistência completa para reaproveitamento no MBR (v3.31.1)

Todos os dados preenchidos no Pré-MBR são gravados em `okr_wizard_sessions.reflection_data.data` (snapshot do `MbrPreDraftData` no submit via `useGenericWizardDraft.completeSession()`) e re-derivados no MBR via `useMbrPreSubmissions` → `mbrPreByTeam[teamId]`.

**Campos persistidos e onde aparecem no MBR:**
| Campo | Escrito por | Consumidor MBR |
|-------|-------------|----------------|
| `kpiSnapshots[].impactAssessment` (plano de ação) | `MbrPreKpiGateStep` | `MbrTeamOkrsDetailStep` |
| `kpiNoDataReasons` (causa de ausência) | `MbrPreKpiGateStep` (via `splitNoDataReason: true`) | `MbrTeamOkrsDetailStep` + Panorama |
| `krFinalStates` / `krJustifications` | `MbrPreKrAnalysisStep` | `MbrTeamOkrsDetailStep` |
| `projectJustifications` | `MbrPreProjectsStep` | `MbrTeamOkrsDetailStep` |
| `highlights` / `nextSteps` | `MbrPreHighlightsStep` / `MbrPreNextStepsStep` | `MbrTeamOkrsDetailStep` |
| `decisions` (com `sourceStep`) | inline em qualquer step (DecisionsAggregator) | `MbrDecisionsStep` |
| `agendaSuggestions` | `MbrPreNextStepsStep` + Summary | `MbrDecisionsStep` |
| `monthAnalysis` (IA + manual) | `MbrPreOpeningStep` | `MbrTeamOkrsDetailStep` |

**Resumo do Pré-MBR (`MbrPreSummary`)** exibe TODOS os blocos antes do submit: KPIs+plano, KPIs sem dados, Análise do mês, KRs, Projetos/Marcos, Destaques, Próximos passos, Sugestões de pauta, Decisões registradas. Garante auditabilidade ao líder.

## Decisões canônicas (2026-05-04)

1. **`KpiGateStep` permanece agnóstico** (TCR §4.8.1). O comportamento "razão separada do plano" é ligado pelo flag `config.splitNoDataReason`. Props `noDataReasons` + `onNoDataReasonChange` só são lidas quando o flag está ativo.
2. **`kpiOutdatedUpdates` está deprecated** (`@deprecated` em `MbrPreDraftData` e `MbrPreTeamSubmission`). O Pré-MBR não captura mais update inline de valor de KPI durante o rito. O fluxo SSOT continua sendo `KpiValueEntryForm` (`mem://features/kpis/kpi-value-entry-ssot`) em `/kpis` ou no Check-in Individual.
3. **Update inline de valor de KPI no Pré-MBR** (caso seja desejado no futuro) deve ser feito via novo flag `allowInlineValueEntry` no `KpiGateStep`, **reutilizando** `KpiValueEntryForm`. JAMAIS duplicar formulário em `okrs/wizards`.
