

# Relatório Visual de Sessões de Rituais

## Contexto
O `RitualHistoryPage` exibe dados de `reflection_data` como JSON bruto. O objetivo é renderizar esses dados como relatórios formatados e legíveis, com seções específicas por tipo de wizard.

## Pré-checklist verificado
- TCR v3.20.0 consultado — snapshot imutável em `reflection_data` (JSONB) na `okr_wizard_sessions`
- Development Standards v1.27.0 — layout `max-w-5xl mx-auto` (já correto na página), componentes canônicos
- Identity Convention — não se aplica (leitura read-only de snapshots existentes)
- Data Model — `okr_wizard_sessions.reflection_data` é o campo-fonte; sem alterações no banco
- Componentes existentes — Card, Badge, Table, Progress, Collapsible do shadcn

## Estrutura de dados por wizard_type

| Wizard | Draft Type | Campos principais |
|---|---|---|
| collaborator | `CollaboratorDraftData` | results (KR check-ins), kpiResults, reflection, initiativesMarkedAtRisk |
| leader-prep | `LeaderPrepDraftData` | krActions, meetingNotes, kpisForDiscussion, kpisForFollowup |
| team-checkin | `TeamCheckinDraftData` | reviewedKrs, decisions, checklist |
| managers-checkin | `ManagersDraftData` | adjustments, resolvedDependencies, kpisMarkedForFollowup |
| clevel-checkin | `CLevelDraftData` | strategicDecisions, directives, reviewedOkrs |
| mbr | `MbrDraftData` | referenceMonth, kpiSnapshots, teamOkrSnapshots, orgOkrSnapshots, decisions, checklist, ritualFeedback, qbrFollowUpItems |
| qbr-pre | `QbrPreDraftData` | krFinalStates, kpiSnapshots, learnings, proposedOkrs, dependencies, decisions |
| qbr-pre-clevel | `QbrCLevelDraftData` | systemPatterns, strategicAnalysis, okrCalibrationFlags, directives, decisions |
| qbr-meeting | `QbrMeetingDraftData` | approvals, decisions, crossCommitments, governanceChecklist |
| qbr-post | `QbrPostDraftData` | promotedOkrIds, decisions, crossCommitments, executiveMinutes |

## Arquivos a criar

### 1. `src/modules/okrs/components/ritual-report/SnapshotReportView.tsx`
Dispatcher: recebe `wizardType: WizardPersona` + `data: Record<string, any>` e renderiza o renderer correto. Fallback: mensagem "Formato não suportado" + raw JSON.

### 2. Renderers em `src/modules/okrs/components/ritual-report/renderers/`
- **CollaboratorReport.tsx** — Tabela de KRs (objetivo, anterior→novo, confiança, comentário). Tabela de KPIs. Seção reflexão (impacto + ajuda). Lista de iniciativas em risco.
- **LeaderPrepReport.tsx** — Tabela ações por KR (tipo + notas). KPIs marcados para discussão/followup. Notas da reunião.
- **TeamCheckinReport.tsx** — Lista KRs revisados. Checklist (sabe no que focar? etc). Decisões já renderizadas pelo componente pai.
- **ManagersCheckinReport.tsx** — Ajustes. Dependências resolvidas. KPIs para followup.
- **CLevelCheckinReport.tsx** — Decisões estratégicas (text). Diretrizes (text). OKRs revisados.
- **MbrReport.tsx** — Mês referência. Tabela KPIs (nome, valor, meta, RAG badge). Cards times com progress. OKRs org. Checklist governança. QBR follow-up items.
- **QbrPreReport.tsx** — Estado final KRs. KPIs snapshot. Learnings (3 campos). OKRs propostos. Dependências.
- **QbrCLevelReport.tsx** — Padrões sistêmicos. Análise estratégica. Flags calibração. Diretrizes.
- **QbrMeetingReport.tsx** — Aprovações por time. Compromissos cross-team. Checklist governança.
- **QbrPostReport.tsx** — OKRs promovidos. Compromissos. Ata executiva. Cadência follow-up.

### 3. `src/modules/okrs/components/ritual-report/index.ts`
Barrel export de `SnapshotReportView`.

## Arquivo a editar

### `src/modules/okrs/pages/RitualHistoryPage.tsx`
- No `SnapshotSummary`, substituir o conteúdo principal por `<SnapshotReportView wizardType={ritual.wizardType} data={rd} />`.
- Manter JSON bruto como Collapsible "Ver dados brutos" abaixo (debug).
- Remover a lógica de `summaryParts` que ficará redundante.

## Detalhes técnicos
- Cada renderer recebe `data: Record<string, any>` (conteúdo de `reflection_data.data`).
- Renderização 100% defensiva: todo campo é optional com fallback "Sem dados registrados".
- Usa componentes canônicos: Card, Table, Badge, Progress — sem novos componentes UI.
- KPIs: tabela com nome, valor atual formatado, meta, badge RAG colorido.
- OKRs: progress bar + status badge.
- Sem `select('*')`, sem queries novas, sem alterações de banco — tudo vem do snapshot já carregado.
- Sem rota nova — integrado na página existente.

