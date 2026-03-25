# Hub da Jet — Deep Dive Técnico: KPIs, OKRs e Wizards

> **Documento de referência para assistentes de IA.**  
> Gerado em: 2026-03-25  
> Repositório: GitHub (paths relativos a `blob/main/`)

---

## Como Usar Este Documento

Este descritivo técnico foi criado no formato *storytelling* para que qualquer assistente de IA consiga entender a arquitetura do Hub da Jet rapidamente. Cada módulo é descrito em três camadas:

1. **Narrativa** — O "porquê" e a filosofia
2. **Arquitetura** — Modelo de dados, hooks, componentes
3. **Referências** — Links exatos para os arquivos-chave

### Prioridade de Leitura por Módulo

| Módulo | Comece por | Depois leia | Para detalhes |
|--------|-----------|-------------|---------------|
| KPIs | `src/modules/kpis/types.ts` | `hooks/useKpiData.ts` | `components/KpiDashboardTable.tsx` |
| OKRs | `src/modules/okrs/types.ts` | `utils/progressCalculation.ts` | `hooks/useKrStateInsights.ts` |
| Wizards | `src/modules/okrs/types/wizard.ts` | `hooks/useGenericWizardDraft.ts` | Componentes de cada wizard |

---

# PARTE I — MÓDULO KPIs: O Sistema Nervoso da Organização

## 1.1 Filosofia

KPIs no Hub da Jet não são métricas soltas num dashboard. São **sinais contínuos de saúde organizacional** — um sistema nervoso que pulsa independentemente de ciclos de OKR. A distinção fundamental que guia toda a arquitetura é:

> **KPIs existem no tempo contínuo. KRs existem em ciclos.**

Um KPI não "pertence" a um trimestre. Ele pode ser vinculado a uma Key Result como fonte primária de progresso, mas sua existência é autônoma. Quando o ciclo de OKR acaba, o KPI continua medindo.

## 1.2 Modelo de Governança: Scope vs. Responsibility

O modelo de governança é o aspecto mais sofisticado do módulo. Ele separa dois conceitos que frequentemente são confundidos:

```
┌─────────────────────────────────────────────────────────┐
│                    GOVERNANÇA DE KPIs                     │
│                                                           │
│  ESCOPO (impacto)          RESPONSABILIDADE (operacional) │
│  ├── org (Global)          ├── responsible_area_id        │
│  ├── area (Área)           └── responsible_team_id        │
│  └── team (Time)                                          │
│                                                           │
│  "QUEM É IMPACTADO"       "QUEM CUIDA NO DIA-A-DIA"     │
└─────────────────────────────────────────────────────────┘
```

**Regras rígidas (enforced por trigger `kpi_metrics_governance_validate`):**

- KPIs `org` (Global): **proibidos** de ter `area_id` ou `team_id` hierárquico, mas **obrigados** a ter `responsible_area_id` (alguém tem que cuidar)
- KPIs `area`: pertencem a uma `area_id`, podem delegar para um `responsible_team_id`
- KPIs `team`: pertencem a um `team_id` diretamente

### 1.2.1 Hierarquia de Permissões

```
Owner (owner_user_id)
  └── Pode editar tudo, inclusive meta e escopo
Contributor (kpi_data_contributors)
  └── Pode inserir valores, mas NÃO editar o KPI
Area Leader (líder da area_id ou responsible_area_id)
  └── Pode ver e administrar KPIs da sua área
Team Leader (líder do team_id ou responsible_team_id)
  └── Pode ver KPIs do seu time
```

## 1.3 Modelo de Dados

### Tabelas Centrais

| Tabela | Propósito | Arquivo de referência |
|--------|-----------|----------------------|
| `kpi_metrics` | Definição do indicador (nome, meta, escopo, governança) | `src/integrations/supabase/types.ts` |
| `kpi_values` | Série temporal de valores registrados | `src/integrations/supabase/types.ts` |
| `kpi_data_contributors` | Separação accountability ↔ data entry | `src/integrations/supabase/types.ts` |
| `okr_kr_metrics` | Vínculo KPI↔KR (primary + guardrail) | `src/integrations/supabase/types.ts` |

### Tipos TypeScript

📁 **`src/modules/kpis/types.ts`** — Fonte de verdade para todos os tipos do módulo KPI.

**Tipos Core:**
```
KpiScope         = 'team' | 'area' | 'org'
KpiIndicatorType = 'kpi' | 'metric'
KpiLifecycleStatus = 'proposed' | 'active' | 'observing' | 'deprecated'
KpiRagStatus     = 'on_track' | 'at_risk' | 'off_track' | 'no_data'
KpiDirection     = 'up' | 'down'
KpiFrequency     = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'manual'
KpiConfidenceLevel = 'high' | 'medium' | 'low'
KpiComparisonRule  = 'higher_is_better' | 'lower_is_better' | 'equal_to_target'
KpiValueSource   = 'manual' | 'api' | 'webhook' | 'spreadsheet' | 'database' | 'integration' | 'calculation'
```

**Interfaces Chave:**
- `KpiMetric` — Definição completa do indicador com governança (scope, area_id, responsible_area_id, responsible_team_id)
- `KpiValue` — Valor pontual com `period_start`, `period_end`, `period_label`, `confidence`, `rag_status`
- `KpiWithValues` — KPI + valores + métricas derivadas (current_value, previous_value, variation, trend, rag_status)
- `KpiContributor` — Usuário contribuidor com role (`data_entry` | `reviewer`)
- `KpiForWizardV2` — KPI classificado por role do usuário para contexto de wizard

### Cálculo de RAG Status

```typescript
// src/modules/kpis/types.ts — calculateRagStatus()
percentage = direction === 'up' 
  ? (currentValue / targetValue) * 100
  : (targetValue / currentValue) * 100;

≥90% → on_track (verde)
≥70% → at_risk (amarelo)
<70% → off_track (vermelho)
null → no_data (cinza)
```

## 1.4 Integração KPI ↔ OKR

O vínculo entre KPIs e Key Results é o elo entre o sistema nervoso (KPIs) e o motor estratégico (OKRs):

```
┌──────────────┐       okr_kr_metrics        ┌──────────────┐
│  kpi_metrics │◄────────────────────────────►│ okr_team_krs │
│              │   role: 'primary'            │              │
│              │   role: 'guardrail'          │              │
└──────────────┘                              └──────────────┘
```

**Regras:**
- **1 KPI primário por KR** (enforced por trigger) — é a fonte exclusiva de verdade para progresso
- **N guardrails por KR** — monitoramento lateral (ex: "receita sobe mas churn não pode explodir")
- Quando um KPI primário é vinculado, `target` e `unit` da KR ficam somente-leitura (sincronizados do KPI)
- O badge `KrPrimaryKpiBadge` indica visualmente esse vínculo

## 1.5 Hooks

📁 **`src/modules/kpis/hooks/`** — 15 hooks especializados

| Hook | Propósito |
|------|-----------|
| `useKpiData.ts` | Fetch principal com filtros (scope, area, team, status, lifecycle) |
| `useKpiMutations.ts` | CRUD (create, update, delete, addValue) |
| `useKpiEvolutionList.ts` | Lista para página de evolução com série temporal |
| `useKpiWithHistory.ts` | KPI individual com histórico completo |
| `useKpiContributors.ts` | CRUD de contribuidores |
| `useKpiKrLinks.ts` | Vínculos KPI↔KR |
| `useKpiLinkedKrs.ts` | KRs vinculadas a um KPI específico |
| `useKpiTargetHistory.ts` | Histórico de alterações de meta |
| `useKpisForWizard.ts` | KPIs para contexto de wizard (V1 - legado) |
| `useKpisForWizardV2.ts` | KPIs classificados por role para wizards V2 |
| `useCanEditKpi.ts` | Permissão granular de edição |
| `useCanChangeKpiScope.ts` | Validação de mudança de escopo |
| `useTeamArea.ts` | Resolve área de um time |

## 1.6 Componentes

📁 **`src/modules/kpis/components/`** — 20 componentes

| Componente | Propósito |
|------------|-----------|
| `KpiDashboardTable.tsx` | Tabela principal do dashboard com filtros e ações |
| `KpiDashboardFilters.tsx` | Filtros por scope, area, team, lifecycle, KR link |
| `KpiCard.tsx` | Card individual do KPI (dashboard) |
| `KpiStatusSummary.tsx` | Cards de resumo (total, on_track, at_risk, off_track) |
| `KpiSidePanel.tsx` | Painel lateral de detalhes do KPI |
| `KpiDetailDialog.tsx` | Dialog de detalhes completos |
| `CreateKpiDialog.tsx` | Dialog de criação com governança |
| `EditKpiDialog.tsx` | Dialog de edição |
| `AddKpiValueDialog.tsx` | Dialog para registrar novo valor |
| `KpiHistoryDialog.tsx` | Dialog com histórico de valores |
| `KpiEvolutionChart.tsx` | Gráfico de evolução temporal (Recharts) |
| `KpiValuesTable.tsx` | Tabela de valores históricos |
| `KpiContextSection.tsx` | Seção de contexto no dialog de criação/edição |
| `KpiAreaSection.tsx` | Seção de governança (scope, área, responsabilidade) |
| `KpiContributorsManager.tsx` | Gerenciamento de contribuidores |
| `KpiTargetHistorySection.tsx` | Histórico de alterações de meta |
| `LinkedKrsSection.tsx` | Seção de KRs vinculadas a um KPI |
| `KpiActionsMenu.tsx` | Menu de ações contextual |
| `KpiViewToggle.tsx` | Toggle cards/tabela |

## 1.7 Páginas

📁 **`src/modules/kpis/pages/`**

| Página | Rota | Descrição |
|--------|------|-----------|
| `KpiDashboardPage.tsx` | `/kpis` | Dashboard principal com tabela, filtros e resumo |
| `KpiEvolutionPage.tsx` | `/kpis/evolution` | Evolução temporal com gráficos comparativos |

## 1.8 Documentação Canônica

| Documento | Path |
|-----------|------|
| Interpretação de progresso | `docs/guides/PROGRESS_INTERPRETATION_CANON.md` |
| Data Model Registry | `docs/engineering/DATA_MODEL_REGISTRY.md` |
| Governança Scope vs Responsibility | Memory `features/kpis/governance-scope-vs-responsibility` |
| Integração KPI↔KR | Memory `features/okrs/kpi-kr-integration-standard-v1` |

---

# PARTE II — MÓDULO OKRs: O Motor Estratégico

## 2.1 Filosofia

O módulo OKRs é o motor que traduz ambição em execução medida. A arquitetura implementa uma hierarquia de dois níveis com limites rígidos que forçam foco:

> **Máximo 3 objetivos por time. Máximo 3 KRs por objetivo.**

Isso não é um soft limit do UI — é enforced por validação. A filosofia: poucos OKRs bem executados > muitos OKRs abandonados.

## 2.2 Hierarquia de Dados

```
                    ┌─────────────────────┐
                    │ okr_org_objectives   │  ← Objetivos estratégicos (anuais)
                    │ (1 por BU, por ano)  │
                    └──────────┬──────────┘
                               │ 1:N
                    ┌──────────▼──────────┐
                    │ okr_org_key_results  │  ← KRs organizacionais
                    └──────────┬──────────┘
                               │ contribuição (informativa)
                               │ via okr_contributions
                    ┌──────────▼──────────┐
                    │ okr_team_objectives  │  ← Objetivos de time (por ciclo)
                    │ (max 3 por time)     │
                    └──────────┬──────────┘
                               │ 1:N (max 3)
                    ┌──────────▼──────────┐
                    │ okr_team_key_results │  ← KRs de time
                    └──────────┬──────────┘
                          ┌────┴────┐
                          │         │
                   ┌──────▼───┐ ┌──▼──────────┐
                   │ checkins  │ │ initiatives │
                   └───────────┘ └─────────────┘
```

### Entidades Complementares

| Tabela | Propósito |
|--------|-----------|
| `cycles` | Ciclos trimestrais com datas, type, year |
| `okr_checkins` | Check-ins semanais com valor, confiança, blockers |
| `okr_initiatives` | Ações concretas vinculadas a KRs |
| `okr_dependencies` | Dependências entre KRs/times |
| `okr_contributions` | Relações informativas KR↔KR org (não afetam progresso) |
| `okr_kr_metrics` | Vínculo KR↔KPI (primary + guardrail) |
| `okr_wizard_sessions` | Sessões de rituais/wizards |
| `okr_wizard_session_drafts` | Rascunhos de wizards |

## 2.3 Tipos de KR

O sistema reconhece 3 tipos de Key Results, cada um com regras específicas de contribuição:

```
┌────────────────┬───────────────────────────────┬─────────────────────────┐
│ Tipo           │ Descrição                      │ Pode contribuir p/ Org? │
├────────────────┼───────────────────────────────┼─────────────────────────┤
│ contribution   │ Contribui para KR org          │ ✅ SIM                 │
│ enabler        │ Habilita outras KRs            │ ❌ NÃO                 │
│ foundational   │ Fundação (ex: infra, cultura)  │ ❌ NÃO                 │
└────────────────┴───────────────────────────────┴─────────────────────────┘
```

Essa separação é validada no wizard de criação e na lógica de linking.

📁 **`src/modules/okrs/utils/linkingRules.ts`** — Regras canônicas de vinculação

## 2.4 Cálculo de Progresso (Fonte de Verdade)

📁 **`src/modules/okrs/utils/progressCalculation.ts`**

### Fórmula Central

```
Progresso = (Resultado atual − Baseline) / (Meta − Baseline) × 100
```

**Variações:**
- **Direção `up`:** Fórmula padrão
- **Direção `down`:** `(Baseline − Resultado) / (Baseline − Meta) × 100`
- **Direção `maintain`:** Binário — `current >= target ? 100 : 0`
- **Baseline = Meta (manutenção implícita):** Binário — mesma lógica
- **Nunca limita a 100%** — superação de metas é exibida (ex: 120%)

### Análise de Ritmo (Pace)

O sistema vai além do progresso bruto. Avalia o ritmo em relação ao tempo transcorrido do ciclo:

```typescript
analyzePace({
  actualProgress: 25,
  cycle: { startDate, endDate, type: 'quarter' },
})
// Se 50% do ciclo transcorreu e progresso é 25%:
// → status: 'below_pace'
// → interpretation: 'Abaixo do ritmo esperado'
```

**Classificações de ritmo:**
| Status | Condição | Descrição |
|--------|----------|-----------|
| `above_pace` | Gap ≥ +10% | Acima do ritmo esperado |
| `on_pace` | Gap entre -10% e +10% | Dentro do ritmo |
| `below_pace` | Gap ≤ -10% | Abaixo do ritmo |
| `completed` | Progress ≥ 100% | Meta atingida |
| `not_started` | Progress = 0, ciclo > 10% | Não iniciado |

### RAG Status de OKRs

```
Green (on_track):  progress ≥ 70%
Yellow (at_risk):  progress ≥ 40% e < 70%
Red (off_track):   progress < 40%
not_started:       progress = 0
```

## 2.5 Estados de KR (8 estados reconhecidos)

📁 **`src/modules/okrs/hooks/useKrStateInsights.ts`**

O sistema de insights classifica cada KR em um de 8 estados, cada um com semântica visual, guiding question e prompt de IA:

| Estado | Condição | Severidade | Guiding Question |
|--------|----------|------------|------------------|
| `not_started` | progress = 0 | info | "O foco está claro?" |
| `healthy` | Progresso conforme esperado | info | "Manter execução." |
| `stagnant` | 14+ dias sem check-in | warning | "O que está travando?" |
| `at_risk` | RAG yellow OU gap > 15% | warning | "Decisão necessária?" |
| `off_track` | RAG red | critical | "Replanejar?" |
| `achieved` | progress = 100% | info | "Algum aprendizado?" |
| `exceeded` | progress > 100% | info | "O que aprendemos para calibrar?" |
| `not_achieved` | Ciclo encerrado + < 100% | warning | "Meta, plano ou execução?" |

**Funções utilitárias:**
- `calculateKrState(params)` — Calcula estado
- `getKrStateConfig(state)` — Config visual/textual
- `groupKrStatesBySeverity(items)` — Agrupa por severidade
- `filterKrsRequiringAttention(items)` — Filtra KRs que precisam de atenção
- `filterKrsForCelebration(items)` — Filtra KRs para celebração
- `sortByStatePriority(items)` — Ordena por prioridade (critical → warning → info)

## 2.6 Hooks

📁 **`src/modules/okrs/hooks/`** — 50+ hooks organizados por domínio

### CRUD e Dados
| Hook | Propósito |
|------|-----------|
| `useOkrMutations.ts` | CRUD de objetivos e KRs |
| `useTeamKeyResult.ts` | KR individual com detalhes |
| `useCompanyOkrs.ts` | OKRs organizacionais |
| `useInitiatives.ts` | CRUD de iniciativas |
| `useOkrContributions.ts` | Contribuições KR→KR org |
| `useOkrKrMetrics.ts` | Vínculos KR↔KPI |
| `useCycleData.ts` | Dados do ciclo ativo |
| `useCreateCheckin.ts` | Criação de check-in |

### Wizards
| Hook | Propósito |
|------|-----------|
| `useGenericWizardDraft.ts` | Persistência genérica de rascunhos |
| `useWizardDraft.ts` | Draft legado |
| `useKrWizardDraft.ts` | Draft de criação de KR |
| `useWizardSession.ts` | Sessão de wizard |
| `useWizardOrchestrator.ts` | Orquestração de passos |
| `useWizardAI.ts` | Integração com agentes IA |
| `useUserKrsForWizard.ts` | KRs do usuário para wizard |
| `useTeamPendingKrs.ts` | KRs pendentes de check-in |
| `useLastCompletedSession.ts` | Última sessão concluída |
| `useRitualHistory.ts` | Histórico de rituais |

### Bundles de Criação
| Hook | Propósito |
|------|-----------|
| `useCreateTeamOkrBundle.ts` | Criação atômica: objetivo + KRs + dependências + iniciativas |
| `useCreateTeamKrBundle.ts` | Criação atômica: KRs + dependências + iniciativas |

### Análise e Qualidade
| Hook | Propósito |
|------|-----------|
| `useKrStateInsights.ts` | 8 estados de KR com semântica |
| `useKrEffectiveValues.ts` | Valores efetivos (com KPI primário) |
| `useKrPrimaryKpiBatch.ts` | Batch fetch de KPIs primários |
| `usePrimaryKpiForKr.ts` | KPI primário de uma KR |
| `useOkrHealth.ts` | Health score de OKRs |
| `useTeamOkrQuality.ts` | Qualidade dos OKRs do time |
| `useConstructionReview.ts` | Revisão de construção de KRs |
| `useOrgConstructionReview.ts` | Revisão de construção organizacional |
| `useOrgHealthReview.ts` | Saúde organizacional |
| `useOrgOkrAnalysis.ts` | Análise organizacional |
| `useTeamOverviewMetrics.ts` | Métricas de overview do time |
| `useTeamContributionView.ts` | Visão de contribuição do time |
| `useTeamPreviousCycleAnalysis.ts` | Análise do ciclo anterior |

### Permissões
| Hook | Propósito |
|------|-----------|
| `useCanEditKr.ts` | Pode editar KR? |
| `useCanEditTeamObjective.ts` | Pode editar objetivo? |
| `useCanEditInitiative.ts` | Pode editar iniciativa? |
| `useCanManageTeamOkr.ts` | Pode gerenciar OKRs do time? |
| `useManageableTeams.ts` | Times que o usuário pode gerenciar |

## 2.7 Utils

📁 **`src/modules/okrs/utils/`**

| Util | Propósito |
|------|-----------|
| `progressCalculation.ts` | Fórmula canônica + pace analysis |
| `linkingRules.ts` | Regras de vinculação KR↔KR org |
| `krValidation.ts` | Validação de KRs (limites, tipos) |
| `healthScore.ts` | Cálculo de health score |
| `effectiveStatus.ts` | Status efetivo combinando RAG + progresso |

## 2.8 Páginas

📁 **`src/modules/okrs/pages/`** — 22 páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| `OkrDashboardPage.tsx` | `/okrs` | Dashboard principal do líder |
| `ExecutiveDashboardPage.tsx` | `/okrs/executive` | Dashboard executivo |
| `OkrsPage.tsx` | `/okrs/manage` | Gestão de OKRs |
| `OrgViewListPage.tsx` | `/okrs/org-view` | Visão organizacional |
| `OrgObjectiveViewPage.tsx` | `/okrs/org-view/:id` | Detalhe de objetivo org |
| `TeamContributionPage.tsx` | `/okrs/team-contribution/:teamId` | Visão de contribuição |
| `OkrCreationPage.tsx` | `/okrs/create` | Wizard de criação de OKR |
| `TeamKrCreationPage.tsx` | `/okrs/objectives/:id/krs/create` | Wizard de criação de KR |
| `CollaboratorCheckinPage.tsx` | `/okrs/collaborator-checkin` | Wizard check-in colaborador |
| `LeaderPrepPage.tsx` | `/okrs/leader-prep` | Wizard prep do líder |
| `TeamCheckinPage.tsx` | `/okrs/team-checkin` | Wizard check-in do time |
| `ManagersCheckinPage.tsx` | `/okrs/managers-checkin` | Wizard check-in gestores |
| `CLevelCheckinPage.tsx` | `/okrs/clevel-checkin` | Wizard check-in C-Level |
| `MbrPage.tsx` | `/okrs/mbr` | Monthly Business Review |
| `RitualHistoryPage.tsx` | `/okrs/ritual-history` | Histórico de rituais |
| `CycleCheckinsPage.tsx` | `/okrs/checkins` | Check-ins do ciclo |
| `OkrQualityPage.tsx` | `/okrs/quality` | Qualidade dos OKRs |
| `OkrConstructionReviewPage.tsx` | `/okrs/construction-review` | Revisão de construção |
| `OrgConstructionReviewPage.tsx` | `/okrs/org-construction-review` | Revisão org (BU admin) |
| `OrgAnalysisPage.tsx` | `/okrs/analysis` | Análise org (BU admin) |
| `OkrHealthPage.tsx` | `/okrs/health` | Saúde dos OKRs (BU admin) |
| `OkrsSettingsPage.tsx` | — | Configurações de OKRs |

## 2.9 Rotas

📁 **`src/routes/okrs.routes.tsx`** — 21 rotas

Todas as rotas OKR são wrapped por:
```
ProtectedRoute → BuRequiredRoute → ModuleRoute('okrs')
```

Rotas administrativas (MBR, org-construction-review, analysis, health) adicionam `BuAdminRoute`.

---

# PARTE III — MÓDULO WIZARDS: Os Rituais de Gestão

## 3.1 Filosofia

> **Wizards são rituais de decisão, não formulários.**

Cada wizard guia reflexão estruturada, gera aprendizado organizacional e alimenta memória estratégica. A **Regra de Ouro:**

> Todo wizard DEVE incluir insights contextuais. Wizards sem insights são "termômetros" — não agregam inteligência.

### Princípios Culturais

| SEMPRE | NUNCA |
|--------|-------|
| Foco em aprendizado | Comparação entre pessoas |
| Insights acionáveis | Rankings individuais |
| Contexto específico | Tom punitivo |
| Tom positivo | Insights genéricos |

## 3.2 Tipos de Wizard (Personas)

📁 **`src/modules/okrs/types/wizard.ts`** — `WizardPersona`

```typescript
type WizardPersona = 
  | 'collaborator'       // Check-in individual (sexta-feira)
  | 'leader-prep'        // Preparação do líder (segunda-feira)
  | 'team-checkin'       // Check-in coletivo do time
  | 'managers-checkin'   // Alinhamento cross-time
  | 'clevel-checkin'     // Direção estratégica
  | 'team-okr-creation'  // Criação de OKRs
  | 'team-kr-creation'   // Criação de KRs
  | 'mbr';               // Monthly Business Review
```

## 3.3 Infraestrutura Compartilhada

📁 **`src/modules/okrs/components/wizards/shared/`** — 18 componentes

### Shell e Navegação

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| `FullPageWizardShell` | `FullPageWizardShell.tsx` | Layout full-page com interceptação de back button, progresso, e header |
| `WizardStepper` | `WizardStepper.tsx` | Navegação entre passos com estados visuais |
| `WizardStepHeader` | `WizardStepHeader.tsx` | Cabeçalho padronizado por passo (ícone, título, descrição) |
| `WizardStepFooter` | `WizardStepFooter.tsx` | Botões de navegação (anterior, próximo, concluir) |
| `WizardStepScaffold` | `WizardStepScaffold.tsx` | Container que estabiliza scroll entre transições de passo |

### Insights e Reflexão

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| `VicInsightCard` | `VicInsightCard.tsx` | Card de insight gerado por IA (Vic) |
| `KrStateInsightCard` | `../insights/KrStateInsightCard.tsx` | Insight baseado no estado da KR |
| `ReflectionQuestions` | `ReflectionQuestions.tsx` | Perguntas de reflexão guiada contextuais |
| `WizardTooltips` | `WizardTooltips.tsx` | Tooltips educativos |

### Decisões e Contexto

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| `DecisionCard` | `DecisionCard.tsx` | Registro incremental de decisões (texto, categoria, dono, prazo) |
| `InlineDecisionInput` | `InlineDecisionInput.tsx` | Input inline para decisões rápidas |
| `KrContextCard` | `KrContextCard.tsx` | Card de contexto de KR com estado, progresso, evolução |
| `LastCheckinBadge` | `LastCheckinBadge.tsx` | Badge de último check-in (dias atrás) |
| `LatestCheckinSummary` | `LatestCheckinSummary.tsx` | Resumo do último check-in |
| `InitiativesSummary` | `InitiativesSummary.tsx` | Resumo de iniciativas vinculadas |
| `AlertBanner` | `AlertBanner.tsx` | Banner de alerta contextual |
| `AdminContextSwitcher` | `AdminContextSwitcher.tsx` | Switcher de contexto para admins |
| `HierarchyContextSwitcher` | `HierarchyContextSwitcher.tsx` | Switcher de hierarquia (time/área) |

### Persistência de Rascunho

📁 **`src/modules/okrs/hooks/useGenericWizardDraft.ts`** — 501 linhas

O sistema de persistência funciona em duas camadas:

```
┌─────────────────┐     ┌──────────────────────────┐
│  localStorage    │────►│ okr_wizard_session_drafts │
│  (offline-first) │     │ (sync explícito)          │
└─────────────────┘     └──────────────────────────┘
         │
         ▼  ao concluir
┌──────────────────────┐
│ okr_wizard_sessions   │  ← status: 'completed'
│ (registro imutável)   │     reflection_data: snapshot
└──────────────────────┘
```

**Comportamento chave:**
- 1 rascunho global por usuário por tipo de wizard
- `clearDraft()` retorna `sessionId` para gatilhos pós-conclusão (e-mails)
- Cria automaticamente registro `completed` em `okr_wizard_sessions` ao concluir
- Step sync via `window.history.replaceState` (evita transições React Router)

## 3.4 Wizard: Collaborator Check-in

> **Persona:** Colaborador individual  
> **Frequência:** Semanal (sextas-feiras)  
> **Rota:** `/okrs/collaborator-checkin`  
> **Dispara e-mail:** ✅ Sim (2 agentes IA)

📁 **`src/modules/okrs/pages/CollaboratorCheckinPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/collaborator/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | context | `CollaboratorContextStep.tsx` | Contexto da semana — reflexão livre |
| 2 | checkin | `CollaboratorCheckinStep.tsx` | Atualização de KRs (valor, confiança, bloqueios) |
| 3 | kpis | `CollaboratorKpiStep.tsx` | Atualização de KPIs (opcional, fail-safe) |
| 4 | initiatives | `CollaboratorInitiativesStep.tsx` | Revisão de iniciativas |
| 5 | reflection | `CollaboratorReflectionStep.tsx` | Reflexão final (impacto, ajuda necessária) |
| — | summary | `CollaboratorSummary.tsx` | Resumo + envio |

### Lógica de Filtragem

Filtra KRs onde o usuário é:
- Owner (`owner_user_id`)
- Co-responsável (`co_responsibles` array)
- Owner de iniciativa vinculada

### Pós-conclusão

📁 **`supabase/functions/collaborator-checkin-summary/`**

E-mail enviado para:
- O próprio colaborador
- Seu líder direto

Agentes IA: `coach-okrs`, `analista-kpis`

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface CollaboratorWizardState {
  krs: WizardKr[];
  results: CollaboratorCheckinResult[];
  kpiResults: KpiCheckinResult[];
  reflection: CollaboratorReflection;
  initiativesMarkedAtRisk: string[];
}
```

## 3.5 Wizard: Leader Prep

> **Persona:** Líder de time  
> **Frequência:** Semanal (segundas-feiras, pré-reunião)  
> **Rota:** `/okrs/leader-prep`  
> **Dispara e-mail:** ❌ Não (preparatório)

📁 **`src/modules/okrs/pages/LeaderPrepPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/leader-prep/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | overview | `LeaderOverviewStep.tsx` | Visão geral do time (métricas agregadas) |
| 2 | highlights | `LeaderHighlightsStep.tsx` | Destaques automáticos (stagnant, blocked, help_requested) |
| 3 | kpi-alert | `LeaderKpiAlertStep.tsx` | KPIs em alerta que precisam de atenção |
| 4 | preparation | `LeaderPrepStep.tsx` | Preparação da pauta (marcar KRs para discussão) |
| 5 | alignment | `LeaderAlignmentStep.tsx` | Alinhamento com área |

### Gate de Navegação

**Gate para avanço para "Alinhamento":** pelo menos 1 KR deve estar marcada para discussão (em grupo ou 1:1).

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface LeaderPrepWizardState {
  metrics: LeaderOverviewMetrics | null;
  highlights: LeaderHighlight[];
  krActions: KrAction[];
  meetingNotes: string;
}
```

## 3.6 Wizard: Team Check-in

> **Persona:** Time inteiro (conduzido pelo líder)  
> **Frequência:** Semanal  
> **Rota:** `/okrs/team-checkin`  
> **Dispara e-mail:** ✅ Sim (4 agentes IA)

📁 **`src/modules/okrs/pages/TeamCheckinPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/team-checkin/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | opening | `TeamOpeningStep.tsx` | Abertura — contexto e expectativas |
| 2 | kr-review | `TeamKrReviewStep.tsx` | Revisão individual de cada KR com insights |
| 3 | initiatives | `TeamInitiativesStep.tsx` | Revisão de iniciativas relevantes |
| 4 | decisions | `TeamDecisionsStep.tsx` | Decisões e próximos passos |

### Componentes Especializados

- `KrLinkedKpiCard.tsx` — Exibe KPIs vinculados à KR em revisão

### Gate de Navegação

**Gate para avanço para "Iniciativas":** Todos os KRs devem ter sido revisados (navegar pelas setas laterais marca como "revisado").

### Pós-conclusão

📁 **`supabase/functions/team-checkin-summary/`**

E-mail enviado para:
- Membros do time
- Líder do time
- Membros de sub-times sem OKRs

Agentes IA: `coach-okrs`, `analista-kpis`, `facilitador-decisoes`, `cultura`

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface TeamCheckinWizardState {
  krsToReview: WizardKr[];
  decisions: TeamCheckinDecision[];
  checklist: TeamCheckinChecklist;
}

interface TeamCheckinDecision {
  id: string;
  text: string;
  category: 'decision' | 'focus_adjustment' | 'next_step';
  sourceStep?: string;
  owner?: { id: string; name: string };
  deadline?: string | null;
}
```

## 3.7 Wizard: Managers Check-in

> **Persona:** Gestores de área  
> **Frequência:** Quinzenal/Mensal  
> **Rota:** `/okrs/managers-checkin`  
> **Dispara e-mail:** ❌ Não

📁 **`src/modules/okrs/pages/ManagersCheckinPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/managers-checkin/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | panorama | `ManagersPanoramaStep.tsx` | Panorama geral cross-time |
| 2 | systemic-kpis | `ManagersSystemicKpisStep.tsx` | KPIs sistêmicos em alerta |
| 3 | cross-issues | `ManagersCrossIssuesStep.tsx` | Pontos de atenção cruzados entre times |
| 4 | adjustments | `ManagersAdjustmentsStep.tsx` | Ajustes de foco e prioridades |

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface ManagersWizardState {
  areaSummaries: AreaOkrSummary[];
  crossDependencies: CrossDependency[];
  adjustments: string[];
}
```

## 3.8 Wizard: C-Level Check-in

> **Persona:** Diretoria / C-Suite  
> **Frequência:** Mensal  
> **Rota:** `/okrs/clevel-checkin`  
> **Dispara e-mail:** ✅ Sim (3 agentes IA)

📁 **`src/modules/okrs/pages/CLevelCheckinPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/clevel-checkin/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | company-okrs | `CLevelCompanyOkrsStep.tsx` | Revisão de OKRs organizacionais |
| 2 | insights | `CLevelInsightsStep.tsx` | Leitura do sistema (sinais estratégicos) |
| 3 | decisions | `CLevelDecisionsStep.tsx` | Decisões estratégicas |
| 4 | directives | `CLevelDirectivesStep.tsx` | Direcionamentos para áreas/times |

### Pós-conclusão

📁 **`supabase/functions/clevel-checkin-summary/`**

E-mail enviado para:
- CEO
- Líderes de área (Revenue, Produto/Tecnologia, Operações)
- Admins da BU

Agentes IA: `alinhamento-estrategico`, `analista-kpis`, `facilitador-decisoes`

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface CLevelWizardState {
  companyOkrs: CompanyOkrSummary[];
  strategicDecisions: string[];
  directives: StrategicDirective[];
}
```

## 3.9 Wizard: MBR (Monthly Business Review)

> **Persona:** BU Admin  
> **Frequência:** Mensal  
> **Rota:** `/okrs/mbr` (requer `BuAdminRoute`)  
> **Dispara e-mail:** ✅ Sim (3 agentes IA)

📁 **`src/modules/okrs/pages/MbrPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/mbr/`**

O MBR é o rito mais complexo do sistema. Ele funciona como um "tribunal de saúde" do negócio, com snapshots imutáveis e gates que forçam rigor metodológico.

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | panorama | `MbrPanoramaStep.tsx` | Panorama executivo com timestamps relativos |
| 2 | kpi-gate | `MbrKpiGateStep.tsx` | **Gate:** decisão para cada KPI em alerta |
| 3 | team-okrs-overview | `MbrTeamOkrsOverviewStep.tsx` | Visão geral dos OKRs de todos os times |
| 4 | team-okrs-detail | `MbrTeamOkrsDetailStep.tsx` | **Gate:** análise 1-a-1 de cada time |
| 5 | org-okrs | `MbrOrgOkrsStep.tsx` | Revisão de OKRs organizacionais com KRs |
| 6 | decisions | `MbrDecisionsStep.tsx` | Decisões estratégicas com responsável e prazo |
| 7 | closing | `MbrClosingStep.tsx` | Checklist de governança + feedback de estrelas |

### Gates de Navegação

1. **KPI Gate (Passo 2):** Não avança até que todas as decisões estejam registradas para KPIs que exigem ação estratégica. Valida: `decisionsCount >= kpisRequiringDecision`

2. **Team Detail Gate (Passo 4):** Não avança até que todos os times com OKRs sejam marcados como "Revisado". Navegação individual (1 de N) com setas laterais. Times sem OKRs são automaticamente ocultados.

### Snapshots Imutáveis

O MBR congela dados no momento de início — snapshots não mudam durante o rito:

```typescript
// src/modules/okrs/types/wizard.ts
interface MbrKpiSnapshot {
  kpiId: string;
  name: string;
  currentValue: number | null;
  previousValue: number | null;
  target: number | null;
  ragStatus: string;
  variationVsLastMonth: number | null;
  variationVsTarget: number | null;
  requiresStrategicDecision: boolean;
  unit?: string;
  scope?: 'org' | 'area' | 'team';
  // ...
}

interface MbrTeamOkrSnapshot {
  teamId: string;
  teamName: string;
  objectives: MbrTeamOkrObjectiveSnapshot[];
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'risk';
  reviewed: boolean;
}
```

### Checklist de Governança

```typescript
interface MbrGovernanceChecklist {
  strategicFocusClear: boolean;      // Foco estratégico claro?
  nextStepsHaveOwners: boolean;      // Próximos passos têm donos?
  nonPrioritiesClear: boolean;       // Não-prioridades claras?
  communicateInAllHands: boolean;    // Comunicar no all-hands?
}
```

### Feedback do Rito

```typescript
interface RitualImprovementFeedback {
  id: string;
  rating: number;        // 1-5 estrelas
  text: string;          // Sugestão de melhoria
  status: 'pending' | 'implement' | 'evaluated' | 'discarded';
}
```

### Pós-conclusão

📁 **`supabase/functions/mbr-summary/`**

E-mail enviado para:
- Líderes de times diretos
- Líderes de área
- Admins da BU
- BCC: `hub@jetimob.com`

Agentes IA: `analista-kpis`, `alinhamento-estrategico`, `facilitador-decisoes`

## 3.10 Wizard: Team OKR Creation

> **Persona:** Líder de time  
> **Frequência:** Sob demanda (início de ciclo)  
> **Rota:** `/okrs/create`  
> **Dispara e-mail:** ❌ Não

📁 **`src/modules/okrs/pages/OkrCreationPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/team-okr-creation/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | intro | `TeamOkrIntroStep.tsx` | Alinhamento inicial — regras e limites |
| 2 | context | `TeamOkrContextStep.tsx` | Contexto organizacional (OKRs org) |
| 3 | retrospective | `TeamOkrRetrospectiveStep.tsx` | Aprendizados do ciclo anterior |
| 4 | objective | `TeamOkrObjectiveStep.tsx` | Definição do objetivo com validação |
| 5 | sharing | `TeamOkrSharingStep.tsx` | Modelo de responsabilidade (compartilhado?) |
| 6 | kr-type | `TeamOkrKrTypeStep.tsx` | Escolha de tipos de KR (distribution) |
| 7 | kr-detail | `TeamOkrKrDetailStep.tsx` | Detalhamento: título, baseline, meta, direção, unidade |
| 8 | kr-metrics | `TeamOkrKrMetricsStep.tsx` | Vínculo KR↔KPI (primary + guardrail) |
| 9 | dependencies | `TeamOkrDependenciesStep.tsx` | Dependências entre times/KRs (opcional) |
| 10 | initiatives | `TeamOkrInitiativesStep.tsx` | Iniciativas vinculadas (opcional) |
| 11 | share | `TeamOkrShareStep.tsx` | Compartilhar resumo |

### Componentes Especializados

- `ObjectiveInputWithValidation.tsx` — Input de objetivo com validação em tempo real

### Criação Atômica

📁 **`src/modules/okrs/hooks/useCreateTeamOkrBundle.ts`**

Cria atomicamente: objetivo + KRs + links KPI + dependências + iniciativas em transação.

### Tipos

```typescript
// src/modules/okrs/types/wizard.ts
interface TeamOkrCreationWizardState {
  impactReflection: string;
  acknowledgedPastLearnings: boolean;
  objective: { title, description, org_objective_id, cycle_id };
  sharing: TeamOkrSharingConfig;
  krPlan: { foundational, contribution, enabler };
  draftKrs: DraftTeamKr[];
  draftKrMetricLinks: DraftKrMetricLink[];
  dependencies: DraftTeamDependency[];
  initiatives: DraftTeamInitiative[];
  generatedSummary: string | null;
  reflectionQuestions: string[];
}
```

## 3.11 Wizard: Team KR Creation

> **Persona:** Líder de time  
> **Frequência:** Sob demanda  
> **Rota:** `/okrs/objectives/:objectiveId/krs/create`  
> **Dispara e-mail:** ❌ Não

📁 **`src/modules/okrs/pages/TeamKrCreationPage.tsx`**  
📁 **`src/modules/okrs/components/wizards/team-kr-creation/`**

### Passos

| # | Step | Componente | Descrição |
|---|------|-----------|-----------|
| 1 | kr-context | `KrContextStep.tsx` | Contexto do objetivo existente |
| 2 | kr-alignment | `KrAlignmentStep.tsx` | Alinhamento com OKRs organizacionais |
| 3 | kr-type | `KrTypeStep.tsx` | Escolha de tipos de KR |
| 4 | kr-detail | `KrDetailStep.tsx` | Detalhamento (re-export de `TeamOkrKrDetailStep`) |
| 5 | kr-shared-check | `KrSharedCheckStep.tsx` | Validação de consistência (opcional) |
| 6 | kr-dependencies | `KrDependenciesStep.tsx` | Dependências (opcional) |
| 7 | kr-initiatives | `KrInitiativesStep.tsx` | Iniciativas (opcional) |
| 8 | kr-review | `KrReviewStep.tsx` | Revisão final e submissão |

### Reutilização

O `KrDetailStep` é um re-export direto do `TeamOkrKrDetailStep`, garantindo que o formulário de detalhamento de KRs seja idêntico em ambos os wizards.

## 3.12 Histórico de Rituais

> **Rota:** `/okrs/ritual-history`  
> **Permissão:** `okrs.view:bu` (inclui super_admins)

📁 **`src/modules/okrs/pages/RitualHistoryPage.tsx`**  
📁 **`src/modules/okrs/hooks/useRitualHistory.ts`**

Centraliza a consulta de todas as sessões concluídas. Features:

- **Filtros:** Tipo de ritual, time, intervalo de datas
- **Deep-linking:** `?session={id}` destaca e expande automaticamente
- **Snapshot read-only:** Exibe `reflection_data` imutável
- **Follow-up:** Gerenciar status de decisões (`concluído`/`pendente`)
- **Feedback:** Média de estrelas + lista de sugestões
- **RLS:** Admins veem todas as sessões da BU; membros veem do seu time

## 3.13 Sistema de Notificações Pós-Wizard

📁 **`supabase/functions/`** — Edge Functions de resumo

| Edge Function | Wizard | Agentes IA |
|---------------|--------|------------|
| `collaborator-checkin-summary/` | Collaborator | `coach-okrs`, `analista-kpis` |
| `team-checkin-summary/` | Team Check-in | `coach-okrs`, `analista-kpis`, `facilitador-decisoes`, `cultura` |
| `clevel-checkin-summary/` | C-Level | `alinhamento-estrategico`, `analista-kpis`, `facilitador-decisoes` |
| `mbr-summary/` | MBR | `analista-kpis`, `alinhamento-estrategico`, `facilitador-decisoes` |

**Modelo de IA:** `google/gemini-3-flash-preview`

**Padrão de orquestração:**
1. Wizard conclui → `clearDraft()` retorna `sessionId`
2. Page invoca Edge Function com `sessionId`
3. Edge Function busca `reflection_data` do snapshot
4. Agentes IA processam em paralelo
5. E-mail montado e enviado com links profundos (`/okrs/ritual-history?session={id}`)
6. Idempotência via `summary_sent_at` na sessão

**Destinatários por ritual:**

| Ritual | Destinatários |
|--------|---------------|
| Collaborator | Colaborador + líder direto |
| Team Check-in | Membros do time + líder + subtimes sem OKRs |
| C-Level | CEO + líderes de área + admins BU |
| MBR | Líderes de times + líderes de área + admins BU |

Todos incluem BCC para `hub@jetimob.com`.

## 3.14 Integração com IA (Vic)

📁 **`src/modules/okrs/types/wizard.ts`** — `WizardVicContext`

Cada wizard alimenta agentes IA com contexto estruturado:

```typescript
interface WizardVicContext extends VicContext {
  type: 'wizard-collaborator' | 'wizard-leader-prep' | ...;
  wizardStep?: string;
  krContext?: {
    krId, krTitle, objectiveTitle,
    progress, status, daysSinceCheckin,
    linkedInitiativesCount
  };
  teamContext?: {
    teamId, teamName, memberCount,
    krsTotal, krsAtRisk
  };
}
```

**Action Contexts:**

| Persona | VicActionContext |
|---------|----------------|
| collaborator | `okr-check-alignment` |
| leader-prep | `okr-review-quality` |
| team-checkin | `okr-review-quality` |
| managers-checkin | `okr-check-alignment` |
| clevel-checkin | `okr-check-alignment` |
| team-okr-creation | `okr-check-alignment` |
| team-kr-creation | `okr-check-alignment` |
| mbr | `okr-check-alignment` |

---

# PARTE IV — Referências Completas

## 4.1 Arquivos por Módulo

### KPIs
```
src/modules/kpis/
├── types.ts                          # Tipos TypeScript (426 linhas)
├── hooks/
│   ├── useKpiData.ts                 # Fetch principal
│   ├── useKpiMutations.ts            # CRUD
│   ├── useKpiEvolutionList.ts        # Evolução temporal
│   ├── useKpiWithHistory.ts          # KPI + histórico
│   ├── useKpiContributors.ts         # Contribuidores
│   ├── useKpiKrLinks.ts             # Vínculos KPI↔KR
│   ├── useKpiLinkedKrs.ts           # KRs vinculadas
│   ├── useKpiTargetHistory.ts       # Histórico de metas
│   ├── useKpisForWizard.ts          # KPIs para wizard V1
│   ├── useKpisForWizardV2.ts        # KPIs para wizard V2
│   ├── useCanEditKpi.ts             # Permissão de edição
│   ├── useCanChangeKpiScope.ts      # Mudança de escopo
│   └── useTeamArea.ts               # Área de um time
├── components/
│   ├── KpiDashboardTable.tsx         # Tabela principal
│   ├── KpiDashboardFilters.tsx       # Filtros
│   ├── KpiCard.tsx                   # Card individual
│   ├── KpiStatusSummary.tsx          # Resumo RAG
│   ├── KpiSidePanel.tsx              # Painel lateral
│   ├── KpiDetailDialog.tsx           # Detalhes
│   ├── CreateKpiDialog.tsx           # Criação
│   ├── EditKpiDialog.tsx             # Edição
│   ├── AddKpiValueDialog.tsx         # Novo valor
│   ├── KpiHistoryDialog.tsx          # Histórico
│   ├── KpiEvolutionChart.tsx         # Gráfico
│   ├── KpiValuesTable.tsx            # Tabela de valores
│   ├── KpiContextSection.tsx         # Contexto
│   ├── KpiAreaSection.tsx            # Governança
│   ├── KpiContributorsManager.tsx    # Contribuidores
│   ├── KpiTargetHistorySection.tsx   # Histórico de metas
│   ├── LinkedKrsSection.tsx          # KRs vinculadas
│   ├── KpiActionsMenu.tsx            # Menu de ações
│   └── KpiViewToggle.tsx             # Toggle view
└── pages/
    ├── KpiDashboardPage.tsx          # /kpis
    └── KpiEvolutionPage.tsx          # /kpis/evolution
```

### OKRs
```
src/modules/okrs/
├── types.ts                          # Tipos core (335 linhas)
├── types/
│   ├── wizard.ts                     # Tipos de wizard (642 linhas)
│   ├── initiative.ts                 # Tipos de iniciativa
│   ├── construction-review.ts        # Tipos de revisão
│   ├── health.ts                     # Tipos de saúde
│   └── org-health-review.ts          # Tipos de saúde org
├── utils/
│   ├── progressCalculation.ts        # FONTE DE VERDADE: cálculo de progresso
│   ├── linkingRules.ts               # Regras de vinculação KR↔KR org
│   ├── krValidation.ts              # Validação de KRs
│   ├── healthScore.ts               # Health score
│   └── effectiveStatus.ts           # Status efetivo
├── hooks/                            # 50+ hooks (ver seção 2.6)
├── components/
│   ├── wizards/
│   │   ├── shared/                   # 18 componentes compartilhados
│   │   ├── collaborator/             # 7 componentes
│   │   ├── leader-prep/              # 6 componentes
│   │   ├── team-checkin/             # 5 componentes
│   │   ├── managers-checkin/         # 5 componentes
│   │   ├── clevel-checkin/           # 5 componentes
│   │   ├── mbr/                      # 9 componentes
│   │   ├── team-okr-creation/        # 13 componentes
│   │   └── team-kr-creation/         # 8 componentes (alguns re-exports)
│   ├── dashboard/                    # Dashboard components
│   ├── insights/                     # KrStateInsightCard
│   ├── checkin/                      # Check-in components
│   ├── initiatives/                  # Initiative components
│   ├── analysis/                     # Analysis components
│   ├── construction/                 # Construction review
│   ├── health/                       # Health components
│   ├── quality/                      # Quality components
│   ├── org-view/                     # Org view components
│   ├── team-contribution/            # Team contribution
│   └── shared/                       # Shared OKR components
├── pages/                            # 22 páginas (ver seção 2.8)
└── routes → src/routes/okrs.routes.tsx  # 21 rotas
```

### Edge Functions (Pós-Wizard)
```
supabase/functions/
├── collaborator-checkin-summary/     # E-mail pós check-in colaborador
├── team-checkin-summary/             # E-mail pós check-in time
├── clevel-checkin-summary/           # E-mail pós check-in C-Level
├── mbr-summary/                      # E-mail pós MBR
├── invoke-vic/                       # Invocação genérica de agente IA
├── culture-message/                  # Mensagem cultural
└── _shared/                          # Utilitários compartilhados
```

## 4.2 Documentação Canônica

| Documento | Path |
|-----------|------|
| Technical Context Registry | `TECHNICAL_CONTEXT_REGISTRY.md` |
| Development Standards | `docs/engineering/DEVELOPMENT_STANDARDS.md` |
| Data Model Registry | `docs/engineering/DATA_MODEL_REGISTRY.md` |
| Identity Convention | `docs/engineering/IDENTITY_CONVENTION.md` |
| Permissions & RBAC | `docs/engineering/PERMISSIONS_AND_RBAC_MODEL.md` |
| Progress Interpretation Canon | `docs/guides/PROGRESS_INTERPRETATION_CANON.md` |
| Wizard Development Guide | `docs/guides/WIZARD_DEVELOPMENT_GUIDE.md` |

## 4.3 Diagrama de Dependências entre Módulos

```
┌──────────┐     okr_kr_metrics     ┌──────────┐
│   KPIs   │◄──────────────────────►│   OKRs   │
│          │  primary + guardrail   │          │
└──────────┘                        └─────┬────┘
                                          │
                                    ┌─────▼────┐
                                    │ Wizards  │
                                    │          │
                                    │ 8 rituais│
                                    │ + drafts │
                                    │ + emails │
                                    └──────────┘
                                          │
                                    ┌─────▼────┐
                                    │ Vic (IA) │
                                    │ Agentes  │
                                    └──────────┘
```

---

*Documento gerado automaticamente a partir do codebase do Hub da Jet.*  
*Para contribuir, consulte `docs/engineering/DEVELOPMENT_STANDARDS.md`.*
