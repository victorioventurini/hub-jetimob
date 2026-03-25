

# Descritivo Técnico Completo: Módulos KPIs, OKRs e Wizards

Este documento será gerado como um arquivo Markdown persistente em `/mnt/documents/` para que possa ser compartilhado com o Claude ou qualquer outro assistente de IA. Ele descreverá os três módulos em formato storytelling com referências exatas aos arquivos do repositório.

---

## Estrutura do Documento

O arquivo será organizado em três grandes seções narrativas:

### 1. Módulo KPIs — O Sistema Nervoso da Organização

**Narrativa:** KPIs são sinais contínuos de saúde organizacional. O módulo implementa um modelo de governança sofisticado que separa **Escopo** (impacto: Global/Área/Time) de **Responsabilidade Operacional** (quem cuida). KPIs não têm ciclo próprio — o tempo pertence à KR que os vincula.

**Cobertura técnica:**
- Modelo de dados: `kpi_metrics` + `kpi_values` (2 tabelas centrais)
- Tipos e enums: `KpiScope`, `KpiIndicatorType` (kpi vs metric), `KpiLifecycleStatus`, `KpiRagStatus`, `KpiFrequency`
- Governança: Scope vs Responsibility, com `responsible_area_id` e `responsible_team_id`
- Hierarquia de permissões: Owner → Contributor → Area Leader → Team Leader
- Integração com OKRs via `okr_kr_metrics` (primary + guardrail)
- Evolução visual: `KpiEvolutionChart`, `KpiValuesTable`, `KpiHistoryDialog`
- Contributor system: `kpi_data_contributors` para separar accountability de data entry
- RAG calculation: trigger automático `trg_kpi_value_validation`

**Arquivos-chave referenciados:**
- `src/modules/kpis/types.ts` — Todos os tipos TypeScript
- `src/modules/kpis/hooks/` — 14 hooks especializados
- `src/modules/kpis/components/` — 19 componentes
- `src/modules/kpis/pages/` — 2 páginas (Dashboard + Evolution)
- `docs/guides/PROGRESS_INTERPRETATION_CANON.md` — Governança de interpretação

### 2. Módulo OKRs — O Motor Estratégico

**Narrativa:** O módulo OKRs implementa uma hierarquia de dois níveis (Organizacional → Time) com ciclos trimestrais, limites rígidos (máx 3 objetivos/time, máx 3 KRs/objetivo), e um sistema de contribuições que conecta KRs de time a KRs organizacionais respeitando tipos (`contribution` pode, `foundational`/`enabler` não pode).

**Cobertura técnica:**
- Hierarquia: `okr_org_objectives` → `okr_org_key_results` / `okr_team_objectives` → `okr_team_key_results`
- Tipos de KR: `contribution`, `enabler`, `foundational` — cada um com regras de contribuição
- Cálculo de progresso: `calculateProgress(baseline, current, target, direction)`
- RAG Status: Green (≥70%), Yellow (40-70%), Red (<40%)
- Vínculo KR↔KPI: 1 primary (obrigatório) + N guardrails via `okr_kr_metrics`
- Check-ins: `okr_checkins` com confidence, blockers, menções
- Iniciativas: `okr_initiatives` vinculadas a KRs
- Dependências: `okr_dependencies` entre KRs/times
- Contribuições: `okr_contributions` (informativas, não afetam progresso)
- Ciclos: tabela `cycles` com validação de datas
- Dashboards: OKR Dashboard, Executive Dashboard, Org View, Team Contribution
- Análise: Quality, Construction Review, Health, Org Analysis

**Arquivos-chave referenciados:**
- `src/modules/okrs/types.ts` — Tipos core
- `src/modules/okrs/types/` — Tipos especializados
- `src/modules/okrs/hooks/` — 50+ hooks organizados por domínio
- `src/modules/okrs/utils/progressCalculation.ts` — Cálculo canônico
- `src/routes/okrs.routes.tsx` — 17 rotas

### 3. Módulo Wizards — Os Rituais de Gestão

**Narrativa:** Wizards são rituais de decisão, não formulários. Cada um guia reflexão estruturada, gera aprendizado organizacional e alimenta memória estratégica. A Regra de Ouro: todo wizard DEVE incluir insights contextuais — sem insights, são apenas termômetros.

**Cobertura de cada wizard:**

#### 3.1 Collaborator Check-in (Semanal, sextas)
- Rota: `/okrs/collaborator-checkin`
- 6 etapas: Context → KPI → Checkin → Initiatives → Reflection → Summary
- Filtra KRs por: owner, co-responsible, ou owner de iniciativa
- Dispara e-mail pós-conclusão com 2 agentes IA

#### 3.2 Leader Prep (Semanal, segundas)
- Rota: `/okrs/leader-prep`
- 5 etapas: Overview → KPI Alert → Prep → Highlights → Alignment
- Preparatório — NÃO dispara e-mail de resumo
- Gate: pelo menos 1 KR marcada para discussão

#### 3.3 Team Check-in (Semanal)
- Rota: `/okrs/team-checkin`
- 5 etapas: Opening → KR Review → Initiatives → Decisions → (closing)
- Gate: todos KRs revisados antes de avançar para Iniciativas
- Dispara e-mail com 4 agentes IA

#### 3.4 Managers Check-in (Quinzenal/Mensal)
- Rota: `/okrs/managers-checkin`
- 4 etapas: Panorama → Systemic KPIs → Cross Issues → Adjustments
- Alinhamento cross-time para gestores de área

#### 3.5 C-Level Check-in (Mensal)
- Rota: `/okrs/clevel-checkin`
- 5 etapas: Insights → Company OKRs → Directives → Decisions → (closing)
- Dispara e-mail com 3 agentes IA

#### 3.6 MBR — Monthly Business Review (Mensal, BU Admin)
- Rota: `/okrs/mbr`
- 7 etapas: Panorama Executivo → KPI Gate → Overview Times → Análise Detalhada → OKRs Org → Decisões Estratégicas → Encerramento
- Gate: KPI Gate exige decisões para cada KPI em alerta
- Gate: Todos os times devem ser revisados antes de avançar
- Auto-seeding imutável de KPIs e OKRs (snapshot histórico)
- Dispara e-mail com 3 agentes IA

#### 3.7 Team OKR Creation (Sob demanda)
- Rota: `/okrs/create`
- 11 etapas de criação guiada com alinhamento estratégico

#### 3.8 Team KR Creation (Sob demanda)
- Rota: `/okrs/objectives/:objectiveId/krs/create`
- 8 etapas para adicionar KRs a objetivos existentes

**Infraestrutura compartilhada:**
- `FullPageWizardShell` — Layout full-page com interceptação de back button
- `WizardStepper`, `WizardStepHeader`, `WizardStepFooter` — Navegação
- `WizardStepScaffold` — Estabilidade de scroll
- `useGenericWizardDraft` — Persistência + criação automática de sessão
- `DecisionCard` — Registro incremental de decisões
- `KrStateInsightCard`, `VicInsightCard` — Insights contextuais
- `ReflectionQuestions` — Reflexão guiada
- Histórico: `/okrs/ritual-history` com deep-linking por sessão

---

## Formato de Entrega

Um documento Markdown único (~4000 linhas estimadas) em `/mnt/documents/HUB_TECHNICAL_DEEP_DIVE.md`, com:
- Paths relativos ao repositório (ex: `src/modules/kpis/types.ts`)
- Links no formato GitHub genérico: `blob/main/<path>`
- Diagramas ASCII para hierarquias
- Tabelas de referência rápida por módulo
- Seção de "Como Explorar" para orientar o Claude sobre quais arquivos ler primeiro

