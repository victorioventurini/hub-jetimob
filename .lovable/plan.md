

# Padronização Estrutural dos Ritos do Hub — Framework Unificado (Plano Final)

## Conformidade com docs canônicos

Pré-checklist obrigatório executado:

- ✅ **TCR**: rituais são `okr_wizard_sessions` com `wizard_type` (slug imutável) + `reflection_data` (JSONB livre). Snapshots imutáveis em MBR/QBR preservados.
- ✅ **IDENTITY_CONVENTION**: mutações continuam via `realProfileId` do `useIdentity` (mutation-identity-guard-pattern).
- ✅ **PERMISSIONS_AND_RBAC_MODEL**: nenhuma permission key alterada. Guards de rota (`BuAdminRoute`, `CLevelRitualRoute`, `ModuleRoute`) intactos.
- ✅ **DATA_MODEL_REGISTRY**: única alteração estrutural é coluna `structure_version` em `okr_wizard_sessions` + correção do CHECK constraint do `wizard_type` (bug latente — não inclui `mbr-pre`).
- ✅ **DEVELOPMENT_STANDARDS**: query keys via helpers existentes; sem `select('*')`; React.memo nos componentes de lista; URL state preservado.
- ✅ **Reuso máximo**: estende `wizards/shared/` (25+ componentes existentes) com nova subpasta `framework/`. SSOT `ritualLabels.ts` ganha `RITUAL_STEP_LABELS`.

## Princípios arquiteturais

1. **Slugs `WizardPersona` imutáveis** — só labels e composição de steps mudam.
2. **SSOT único de labels**: `ritualLabels.ts` se estende para incluir step labels (não criar novo arquivo).
3. **Componentes 100% agnósticos de `wizardType`** — toda variação via `config` prop.
4. **Versionamento por rito**: cada `WizardPersona` tem versão própria. Sessões antigas renderizam com sua versão original.
5. **Reutilização máxima**: novos componentes em `framework/` reutilizam `WizardStepScaffold`, `WizardStepHeader`, `InlineDecisionInput`, `KrContextCard`, `DecisionCard`, `AlertBanner`, `VicInsightCard`, `ProjectsSummary`.
6. **🆕 Decisão inline ubíqua**: **todos os steps de todos os ritos** suportam registro inline de decisão via `InlineDecisionInput`, além do step formal de **Decisões** que consolida novas decisões, compromissos cross-área e carry-over.

## Decisão inline ubíqua — especificação

**Regra estrutural vinculante** (aplicada a todos os componentes do `framework/`):

- Todo step renderizado pelo framework **deve** incluir `InlineDecisionInput` na região `bottomFixed` do `WizardStepScaffold` (padrão já estabelecido em `mem://ui/wizards/inline-decision-input-ux` e `mem://features/rituals/cross-step-decision-logging-standard`).
- O `sourceStep` do `TeamCheckinDecision` é populado automaticamente com o `stepId` corrente — sem hardcode nos componentes.
- O step formal de **Decisões** consolida visualmente:
  - **Novas decisões** (registradas durante o step de Decisões em si)
  - **Decisões inline de todos os steps anteriores** (agrupadas por `sourceStep`)
  - **Compromissos cross-área** (subseção)
  - **Carry-over** do rito anterior (subseção, quando aplicável)
- Componente `DecisionsStep` recebe `config: { includeCarryOver, includeCrossArea, groupInlineBySource }` para parametrizar essa consolidação.
- Implementação: helper `useDecisionsAggregator(decisions, currentStepId)` agrupa por `sourceStep` e expõe contagem por step para exibição visual no `DecisionsStep`.
- **Exceção**: `SummaryAndSubmitStep` e `ClosingStep` exibem decisões em modo read-only (consolidação final), sem `InlineDecisionInput` ativo.

## Vocabulário canônico

| Conceito | Nome | Exceções documentadas |
|---|---|---|
| 1º step preparatório | **Balanço** (semana/mês/ciclo) | — |
| 1º step decisório | **Abertura** (ou **Abertura Executiva** em MBR/QBR) | — |
| Indicadores | **KPIs** (ou **KPI Gate** quando há gate obrigatório) | QBR usa KPIs como subseção interna |
| Resultados | **KRs** (ou **OKRs** quando inclui objetivos) | — |
| Execução | **Projetos e Iniciativas** (config por rito) | — |
| Sinais | **Destaques e Riscos** (acelerou / travou / atenção) | Pré-QBR usa **Aprendizados e Riscos** |
| Deliberação | **Decisões** (consolida inline + carry-over como subseções) | Check-in Individual usa **Pendências e Decisões**; Pós-QBR usa **Decisões e Ajustes** |
| Final preparatório | **Resumo e Envio** | — |
| Final decisório | **Encerramento** (Ata/Carta/Feedback como blocos internos) | — |

## Ordem padrão do framework

`Abertura/Balanço → KPIs → KRs → Projetos+Iniciativas → Destaques e Riscos → Decisões → Encerramento/Resumo`

**Justificativa**: KPIs (presente, sistema nervoso) antes de KRs (futuro, aposta) — se algo está pegando fogo, decide-se primeiro se o plano original ainda vale.

## Estrutura final por rito

| Rito | Versão | Steps |
|---|---|---|
| **Check-in Individual** | v2 | Abertura → KPIs → KRs → Projetos+Iniciativas → Pendências e Decisões → Reflexão → Resumo e Envio |
| **Pré-Check-in do Time** | v2 | Balanço da Semana → KPIs do Time → KRs em Atenção → Projetos+Iniciativas → Destaques e Riscos → Preparação da Pauta → Resumo e Envio |
| **Check-in do Time** | v3 | Abertura → KPI Gate → KRs em Atenção → Projetos+Iniciativas → Destaques e Riscos → Decisões (carry-over) → Encerramento |
| **Pré-MBR** | v3 | Balanço do Mês → KPIs do Time → KRs → Projetos (sem iniciativas) → Destaques e Riscos → Próximos Passos → Resumo e Envio |
| **Pré-QBR** | v3 | Balanço do Ciclo → KPIs do Ciclo → KRs do Ciclo → Projetos do Ciclo → Aprendizados e Riscos → Proposta de OKRs → Resumo e Envio |
| **MBR** | v4 | Abertura Executiva → KPI Gate → Overview dos Times → Análise por Time → OKRs Organizacionais → Projetos Estratégicos (cross-team) → Decisões (absorve Follow-up QBR) → Encerramento |
| **QBR** | v4 | Abertura Executiva (KPIs como bloco) → Aprovação de OKRs → Decisões (absorve Compromissos) → Encerramento |
| **Pós-QBR** | v4 | Promoção de OKRs → Decisões e Ajustes → Compromissos e Follow-up → Encerramento (Ata como bloco) |

**Todos os steps acima** (exceto `Resumo e Envio` e `Encerramento`) carregam o `InlineDecisionInput` ativo.

## Detalhamento "Projetos e Iniciativas" por rito

| Rito | Projetos | Iniciativas | Escopo |
|---|---|---|---|
| Check-in Individual | ✅ | ✅ | do colaborador |
| Pré-Check-in do Time | ✅ | ✅ | do time |
| Check-in do Time | ✅ | ✅ | do time (em atenção) |
| Pré-MBR | ✅ | ❌ | do time |
| MBR (Projetos Estratégicos) | ✅ | ❌ | cross-team (≥2 times) |
| Pré-QBR | ✅ | ❌ | do time no ciclo |
| QBR / Pós-QBR | ❌ | ❌ | — |

## Fase 0 — Fundação (executada na Onda 1)

### Migration de banco
- `ALTER TABLE okr_wizard_sessions ADD COLUMN structure_version TEXT NOT NULL DEFAULT 'v1'`
- Recriar CHECK constraint de `wizard_type` para incluir `mbr-pre`, `mbr-first`, `mbr-pre-first`, `managers-checkin` (back-compat) — **bug latente corrigido**
- Index: `(wizard_type, structure_version)` para `RitualHistoryPage`
- Sem CHECK em `structure_version` (regra TCR — usar trigger se preciso no futuro)

### Nova estrutura de pastas
```
src/modules/okrs/components/wizards/shared/framework/
├── components/                     (genéricos, agnósticos de wizardType)
│   ├── BalanceStep.tsx             (parametrizado: weekly | monthly | cycle)
│   ├── KpiGateStep.tsx
│   ├── KrsStep.tsx                 (modes: all | attention-only | teams-overview)
│   ├── ProjectsAndInitiativesStep.tsx
│   ├── HighlightsAndRisksStep.tsx
│   ├── DecisionsStep.tsx           (consolida inline por sourceStep + carry-over + cross-área)
│   ├── ClosingStep.tsx             (blocos: checklist | feedback | minutes | ceo-letter)
│   ├── SummaryAndSubmitStep.tsx
│   └── ReflectionStep.tsx          (exceção: collaborator)
├── config/
│   ├── stepDefinitions.ts          (SSOT estrutural por wizardType+version)
│   ├── stepVisibilityRules.ts
│   ├── stepCompletionRules.ts      (gates declarativos)
│   ├── stepContentAdapters.ts
│   └── structureVersions.ts        (mapa wizardType → versão atual)
├── hooks/
│   └── useDecisionsAggregator.ts   (agrupa decisões por sourceStep)
└── lib/
    ├── completionEvaluator.ts      (puro, testável)
    └── visibilityEvaluator.ts      (puro, testável)
```

### Extensão do SSOT
`src/modules/okrs/constants/ritualLabels.ts` ganha:
- `RITUAL_STEP_LABELS: Record<WizardPersona, Record<StepId, { title: string; subtitle?: string }>>`
- `getStepLabel(persona, stepId, version)` helper

### RitualHistoryPage
- Lê `session.structure_version`
- `v1` → renderers atuais (`*Report.tsx`) intactos
- `v2+` → renderiza via `getStepDefinitions(wizardType, version)` + adapters

## Ondas de implementação

### Onda 1 — Baixo risco (entrega Fase 0 completa)
- **Ritos**: Check-in Individual (v2), Pré-Check-in do Time (v2)
- **Entrega adicional**: toda a infraestrutura `framework/` + migration + extensão do SSOT + `useDecisionsAggregator`
- **Validação**: 1 semana de uso real

### Onda 2 — Médio risco
- **Ritos**: Check-in do Time (v3), Pré-MBR (v3), Pré-QBR (v3)
- **Reusa** componentes da Onda 1, só compondo configurações novas

### Onda 3 — Alto risco (janela de transição de quarter)
- **Ritos**: MBR (v4), QBR (v4), Pós-QBR (v4)
- **Preserva 100%** dos snapshots imutáveis (`MbrKpiSnapshot`, `QbrPreSnapshot`, `QbrMeetingSnapshot`)
- **Apenas em virada de ciclo** — nunca no meio

## Exceções intencionais (vinculantes — não corrigir em rodadas futuras)

| Exceção | Rito | Justificativa |
|---|---|---|
| Step "Pendências e Decisões" | Check-in Individual | Pendências pessoais ≠ decisões formais |
| Step "Reflexão" dedicado | Check-in Individual | Espaço explícito para introspecção |
| Step "Próximos Passos" dedicado | Pré-MBR | Plano de ação mensal específico |
| Step "Aprendizados e Riscos" | Pré-QBR | Olhar retrospectivo `worked/didn't/debts` |
| Sem KPI Gate como step separado | QBR | Reunião aprovativa, não diagnóstica |
| Step "Decisões e Ajustes" | Pós-QBR | Formalização do aprovado + ajustes |
| `InlineDecisionInput` ausente em `SummaryAndSubmitStep`/`ClosingStep` | Todos | Steps de consolidação final são read-only para decisões |

## Conformidade TCR (checklist final)

- ✅ Slugs/rotas/personas/IDs imutáveis
- ✅ Sem `select('*')` em adapters
- ✅ Query keys via helpers existentes; chave de fetch de session ganha `structure_version`
- ✅ BU isolation (`currentBuId` síncrono em adapters)
- ✅ RLS intacta — nenhuma policy alterada
- ✅ Sem CHECK constraints novas
- ✅ React.memo em componentes de lista
- ✅ Identity guard via `realProfileId`
- ✅ `tryParseAiJson` em integrações VIC
- ✅ Histórico read-only — sessões `v1` preservam UI original
- ✅ Snapshots imutáveis MBR/QBR intocados
- ✅ Calendário operacional (`ritual_occurrences.session_id`) sem impacto
- ✅ Permissões e janelas temporais preservadas
- ✅ `useGenericWizardDraft` mantém padrão (draft-uniqueness-standard)
- ✅ `WizardStepScaffold` usado em todos os componentes novos (footer-visibility-fix)
- ✅ `InlineDecisionInput` ubíquo conforme `cross-step-decision-logging-standard` e `inline-decision-input-ux`

## Memória canônica

A cada onda concluída:
- Atualizar `mem://features/okrs/management-rituals-standard-v2` com versões estruturais
- Criar `mem://architecture/wizards/structure-versioning-standard`
- Criar `mem://features/rituals/inline-decision-ubiquity-standard` documentando regra ubíqua
- Adicionar entradas no `mem://index.md`

## Critérios de sucesso

1. `grep -r "wizardType ===" src/modules/okrs/components/wizards/shared/framework/components/` → **zero matches**
2. Componentes do `framework/` reutilizados por **≥3 ritos** via configuração
3. Sessões antigas (`structure_version='v1'`) abrem no `RitualHistoryPage` com layout original
4. Novas sessões gravam `structure_version` correto via `STRUCTURE_VERSION_BY_WIZARD_TYPE`
5. Ordem `KPIs → KRs → Projetos` aplicada com exceções documentadas
6. Base pronta para Weekly/Pré-Weekly futuros via composição (zero novo componente)
7. **Todos os steps ativos** (exceto consolidação final) renderizam `InlineDecisionInput` e o step de **Decisões** consolida agrupado por `sourceStep`


---

## Status final (executado em 2026-04-21)

### ✅ Onda 1 — completa (estratégia full-migration)
- **Check-in Individual (collaborator v2)**: framework consumido; componentes proprietários removidos.
- **Pré-Check-in do Time (leader-prep v2)**: migração full; `LeaderHighlightsStep`/`LeaderPrepStep` deletados; novos `LeaderInsightsStep` + `KrsStep mode='leader-actions'`.

### ✅ Onda 2 — completa (estratégia híbrida)
- **Check-in do Time (v3)**, **Pré-MBR (v3)**, **Pré-QBR (v3)**: páginas mantêm step components ricos; framework atua como SSOT estrutural + versionamento. `STRUCTURE_VERSION_BY_WIZARD_TYPE` aponta para `v3`.

### ⏸️ Onda 3 — pré-ativada (aguardando Q-end por TCR)
- Definições `mbrV4`, `qbrMeetingV4`, `qbrPostV4` prontas em `stepDefinitions.ts`.
- `STRUCTURE_VERSION_BY_WIZARD_TYPE` mantém `v1` para esses ritos por governança (não trocar estrutura no meio do trimestre vigente).
- Ativar trocando os 3 valores para `v4` após Q-end.

### ✅ Infraestrutura
- Migration `okr_wizard_sessions.structure_version` (DEFAULT 'v1').
- Index `(wizard_type, structure_version)`.
- `RITUAL_STEP_LABELS` em `ritualLabels.ts`.
- `useDecisionsAggregator` agrupando inline por `sourceStep`.
- `_InlineDecisionsSlot` ubíquo (exceto `SummaryAndSubmit`/`Closing`).
- `useRitualHistory`/`useRitualDetail` selecionam `structure_version`; `RitualHistoryItem.structureVersion` exposto.
- `SnapshotReportView` aceita `structureVersion` (props), preparado para roteamento futuro v2+ (shape compatível, transparente hoje).

### ✅ Testes
- `framework/lib/__tests__/completionEvaluator.test.ts` — 16 casos cobrindo todas as `CompletionRuleId`.
- `framework/lib/__tests__/visibilityEvaluator.test.ts` — 10 casos cobrindo todas as `VisibilityRuleId`.
- `framework/hooks/__tests__/useDecisionsAggregator.test.ts` — 4 casos cobrindo agrupamento, bucket `__unsourced__` e estabilidade de memo.
- `framework/config/__tests__/structureVersions.test.ts` — 8 casos garantindo SSOT do mapa por persona, status das Ondas 1/2/3 e fallback defensivo do helper.
- `framework/config/__tests__/stepDefinitions.test.ts` — 45 casos blindando integridade declarativa do SSOT estrutural: presença de definições, IDs únicos, ordem canônica `KPIs→KRs→Projetos` (com exceções: leader-prep/qbr-meeting/qbr-post), supressão de inline em consolidação, conformidade pontual de cada rito (collaborator/leader-prep/team-checkin/mbr-pre/qbr-pre/mbr/qbr-meeting/qbr-post).
- `framework/config/__tests__/stepContentAdapters.test.ts` — 6 casos blindando `groupDecisionsBySourceStep` (lib pura): vazio, multi-bucket, `__unsourced__`, ordem de inserção, shape `DecisionsBySourceStep`, distinção `''` vs `undefined`.
- `framework/config/__tests__/stepCompletionRules.test.ts` — 57 casos cruzando `COMPLETION_RULES` com `STEP_DEFINITIONS`: existência de `requiredSteps`/`optionalSteps`, disjunção, SLUGS reconhecidos, mensagens de erro com gates, gates canônicos TCR (team-checkin/mbr/qbr-post) e fallback. **Detectou drift real em `leader-prep@v2`** (gate referenciava `krs-attention`/`highlights-risks`, steps inexistentes; corrigido para `prep`/`leader-insights`).
- `framework/config/__tests__/stepVisibilityRules.test.ts` — 23 casos validando `VISIBILITY_RULES`: stepIds em `STEP_DEFINITIONS` (com pseudo `strategic-projects` autorizado), SLUGS reconhecidos, regras canônicas TCR e fallback fail-open de `getVisibilityRule`.
- `ritual-report/__tests__/SnapshotReportView.test.tsx` — 15 casos cobrindo roteamento de todos os 11 renderers, fallback amigável e compatibilidade transparente v1↔v2+.
- `constants/__tests__/ritualLabels.test.ts` — 14 casos blindando `getRitualLabel`/`getStepLabel` (incluindo fallback sentinel) e coerência cruzada `RITUAL_STEP_LABELS` ↔ `STEP_DEFINITIONS` para todas as personas ativas (≠ v1). Garante que nenhum stepId fica sem label.
- **Total: 184 testes verdes** (168 framework/labels + 15 dispatcher + 1 fix em qbr-post pré-existente).

### ✅ Documentação operacional
- `.lovable/onda-3-activation.md` — checklist determinístico de ativação Onda 3 (pré-requisitos, janela Q-end, smoke manual, rollback, pós-ativação D+7) com referências canônicas.

### Critérios de sucesso — auditoria final
| # | Status | Nota |
|---|--------|------|
| 1 | ✅ | `grep "wizardType ===" framework/components/` → 0 matches |
| 2 | ✅ | `KrsStep` (collaborator + leader-prep + team-checkin + mbr-pre + qbr-pre + mbr); `BalanceStep`, `KpiGateStep`, `DecisionsStep` reutilizados ≥4 ritos |
| 3 | ✅ | `useRitualHistory` lê `structure_version`; renderers v1 mantidos intactos; dispatcher recebe versão |
| 4 | ✅ | Hooks de wizard (`useGenericWizardDraft`, `useWizardDraft`, `useWizardSession`, `useQbrExecutiveReport`) gravam via `STRUCTURE_VERSION_BY_WIZARD_TYPE` |
| 5 | ✅ | Ordem `KPIs → KRs → Projetos` em todas as definições; exceções documentadas em código |
| 6 | ✅ | Composição via `STEP_DEFINITIONS` permite Weekly/Pré-Weekly sem novo componente |
| 7 | ✅ | `_InlineDecisionsSlot` em todos os steps ativos; `DecisionsStep` consolida via `useDecisionsAggregator` |

