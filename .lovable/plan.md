## Objetivo

Adicionar uma página `/analysis/export` no módulo Análise Estratégica que gera um arquivo Excel (`.xlsx`) multi-abas com todos os dados de performance da BU ativa (Jetimob quando selecionada) para o ano corrente (2026 YTD: Q1 + Q2), pronto para upload no Claude.

## UX

Nova rota `/analysis/export` (protegida por `ModuleRoute moduleSlug="analysis"`, admin-only), acessível também via botão na `AnalysisHomePage`.

Layout:
- Header: "Exportar Performance da BU"
- Cards de configuração (read-only nesta v1, mostrando o que será exportado):
  - BU: `currentBu.name` (badge)
  - Período: "2026 YTD — Q1 + Q2" (badge)
  - Abas incluídas: Overview, KPIs, OKRs, Projetos
- Botão principal `Gerar planilha (.xlsx)` com loading state
- Ao finalizar: preview do sumário (nº de KPIs, OKRs, projetos exportados) + download automático
- Toast de sucesso/erro

## Estrutura das abas

**1. Overview** — 1 linha por seção
- BU, período, data de geração, gerado por
- Totais: # KPIs, # KPIs on-track/at-risk/off-track, # OKRs, % progresso médio OKRs, # projetos, # projetos por saúde

**2. KPIs — Definições** (1 linha por KPI)
- id, nome, descrição, área, time, responsável, unidade, frequência, direção (higher/lower better), tipo de input, meta anual, gates (base/target/stretch), primary_kpi (bool), created_at

**3. KPIs — Inputs** (1 linha por input mês/semana)
- kpi_id, kpi_nome, período (date), valor real, meta do período, gate atingido, confidence, observação, autor, created_at

**4. OKRs — Objetivos** (1 linha por objetivo)
- id, ciclo, nome, descrição, owner, área, time, status, progresso %, created_at

**5. OKRs — Key Results** (1 linha por KR)
- kr_id, objetivo, nome, unidade, baseline, meta, atual, progresso % (via `calculateProgress`), status, primary_kpi_id (se houver)

**6. OKRs — Check-ins** (1 linha por check-in)
- kr_id, kr_nome, data, valor, progresso, confidence, comentário, autor

**7. Projetos — Projetos** (1 linha por projeto)
- id, nome, descrição, status, saúde, prioridade, owner, área, time, data início/fim, % progresso, created_at

**8. Projetos — Milestones** (1 linha por milestone)
- project_id, project_nome, milestone, status, due_date, completed_at, owner

## Implementação técnica

**Dependência nova**
- `bun add exceljs` (gera XLSX no browser, sem servidor)

**Arquivos novos**
- `src/modules/analysis/pages/AnalysisExportPage.tsx` — página + botão
- `src/modules/analysis/hooks/useAnalysisExport.ts` — orquestra fetches, respeitando `currentBuId` (regra Core: BU Isolation) e filtro `.is("deleted_at", null)`
- `src/modules/analysis/services/analysisExport.ts` — queries por seção (uma função por aba) usando o cliente BU-scoped; SEM `select("*")` (regra Core)
- `src/modules/analysis/services/analysisExportWorkbook.ts` — monta o `ExcelJS.Workbook`, aplica cabeçalhos com bold/freeze, autoWidth, formatação de datas/percentuais, e dispara o download via Blob

**Rota**
- Registrar em `src/routes/analysis.routes.tsx`: `<Route path="/analysis/export" element={<AnalysisRoute requiresBuAdmin><AnalysisExportPage/></AnalysisRoute>} />`

**Fontes de dados (tabelas já existentes)**
- KPIs: `kpi_definitions`, `kpi_inputs` (filtrar por `bu_id`, `date` entre 2026-01-01 e hoje)
- OKRs: `cycles` (tipo `quarter`, ano 2026), `okr_objectives`, `okr_key_results`, `okr_check_ins`, joins por `cycle_id in (...)`
- Projetos: `projects`, `project_milestones` (filtro `bu_id`, `deleted_at is null`, atividade em 2026)
- Nomes/áreas/times: joins com `profiles`, `areas`, `teams`

**Regras respeitadas**
- BU Isolation via `currentBuId` sincrono (Core)
- Soft-deletes: `deleted_at is null` (e `cancelled_at is null` onde aplicável, exceto `okr_initiatives`/`project_milestones` que usam só `deleted_at`)
- Colunas explícitas (sem `select("*")`)
- Progresso de KR via `calculateProgress` (Core: OKR Progress Canon)
- Query keys via `src/lib/queryKeys/*.ts`
- Nenhuma mudança em Edge Functions / backend

**Nome do arquivo**
`jetimob-performance-2026-YTD-YYYYMMDD.xlsx` (slug do nome da BU)

## Fora do escopo desta v1

- Filtros customizados de período/BU na UI (fixo em BU ativa + 2026 YTD conforme confirmado)
- Agendamento/e-mail
- Exportar iniciativas, addendums, rituais, decisões, scorecards

Confirme para implementar.