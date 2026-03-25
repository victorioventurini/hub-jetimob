

# Plano de Implementação: Rito QBR (Quarterly Business Review)

## Resumo

O QBR é um ritual trimestral composto por 4 wizards conectados em cascata. O plano do Claude é sólido e altamente alinhado com a arquitetura existente. Abaixo, apresento o plano validado com ajustes baseados no conhecimento real do codebase.

---

## Correções ao plano do Claude

### 1. `TeamOkrCreationFlow` não existe
O Claude propõe um componente `TeamOkrCreationFlow` com `mode="draft"`. Esse componente **não existe** no codebase. O wizard de criação de OKRs é implementado diretamente em `OkrCreationPage.tsx`, que orquestra 11 step components individuais. A abordagem correta para o passo 4 do `qbr-pre` é **compor os mesmos step components** (`TeamOkrObjectiveStep`, `TeamOkrKrTypeStep`, `TeamOkrKrDetailStep`, etc.) dentro do `QbrPrePage`, usando o mesmo `useWizardDraft` adaptado — não invocar um "sub-flow" inexistente.

### 2. `TeamCheckinDecision.category` precisa de extensão cuidadosa
Hoje aceita `'decision' | 'focus_adjustment' | 'next_step'`. Adicionar `'strategic_proposal'` impacta `InlineDecisionInput` (que tem `CATEGORY_CONFIG` hardcoded) e `DecisionCard`. Ambos precisam de atualização.

### 3. `useWizardDraft` vs `useGenericWizardDraft`
O wizard de criação de OKRs usa `useWizardDraft` (específico, com campos flat). Os demais (MBR, check-ins) usam `useGenericWizardDraft` (genérico, com `data: TData`). Os 4 wizards QBR devem usar `useGenericWizardDraft`, como o MBR.

### 4. `qbr_status` em `cycles` — validação de transições
O Claude define transições mas não propõe trigger de validação. Recomendo uma trigger `trg_validate_qbr_status_transition` para enforcar a máquina de estados.

---

## Fases de Implementação

### Fase 1 — Schema e tipos (fundação)

**Migração SQL:**
- `cycles.qbr_status` com CHECK constraint e default `'closed'`
- `okr_team_objectives`: campos `qbr_origin_session_id`, `qbr_approval_status`, `qbr_discard_reason`
- `kpi_metrics`: campos `zombie_candidate`, `kpi_to_create`
- Atualizar `okr_wizard_sessions_wizard_type_check` para incluir `'qbr-pre'`, `'qbr-pre-clevel'`, `'qbr-meeting'`, `'qbr-post'`, `'qbr-report'`

**Tipos TypeScript** (`src/modules/okrs/types/wizard.ts`):
- Adicionar 4 personas ao `WizardPersona`
- Adicionar `'strategic_proposal'` ao `TeamCheckinDecision.category`
- Adicionar novos source steps ao `TeamCheckinDecisionSourceStep`
- Criar interfaces: `QbrPreDraftData`, `QbrCLevelDraftData`, `QbrMeetingDraftData`, `QbrPostDraftData` (seguindo padrão `MbrDraftData`)
- Criar snapshots: `QbrPreSnapshot`, `QbrCLevelSnapshot`, `QbrMeetingSnapshot`, `QbrPostSnapshot`
- Criar `QbrMeetingGovernanceChecklist`, `QbrPostGovernanceChecklist`

**Atualizar `InlineDecisionInput` e `DecisionCard`:**
- Adicionar `'strategic_proposal'` ao `CATEGORY_CONFIG`

**Rotas** (`src/routes/okrs.routes.tsx`):
- 4 novas rotas usando o helper `OkrRoute` existente

### Fase 2 — Wizard `qbr-pre` (líderes de time)

**Página:** `src/modules/okrs/pages/QbrPrePage.tsx`
- Segue padrão `MbrPage.tsx`: `useGenericWizardDraft<QbrPreStep, QbrPreDraftData>`
- 6 steps (balanço, KPIs, aprendizados, objetivo, KR details, resumo)
- Pré-condição: verificar `cycles.qbr_status IN ('open', 'collecting')`

**Step 1 — Balanço:** `QbrBalanceStep.tsx`
- Reutiliza `useTeamPreviousCycleAnalysis` e `useKrStateInsights`
- Reutiliza `KrContextCard`, `KrStateInsightCard`

**Step 2 — KPIs:** `QbrKpiAnalysisStep.tsx`
- Reutiliza `useKpisForWizardV2` com `scope: 'leader'`
- Reutiliza padrão `MbrKpiSnapshot` para congelar dados

**Step 3 — Aprendizados:** `QbrLearningsStep.tsx`
- Reutiliza `ReflectionQuestions`, `VicInsightCard`

**Step 4 — Proposta de OKRs:** Composição inline dos step components do wizard de criação
- Usa `TeamOkrObjectiveStep`, `TeamOkrKrTypeStep`, `TeamOkrKrDetailStep`, `TeamOkrKrMetricsStep`, `TeamOkrDependenciesStep`, `TeamOkrInitiativesStep` diretamente
- Dados salvos no draft QBR, não em `useWizardDraft` separado
- Não chama `useCreateTeamOkrBundle` — apenas persiste no draft

**Step 5 — Resumo:** `QbrPreSummary.tsx`
- Congela `QbrPreSnapshot` em `reflection_data`
- Atualiza `cycles.qbr_status`

**Arquivos:**
```
src/modules/okrs/pages/QbrPrePage.tsx
src/modules/okrs/components/wizards/qbr-pre/
├── QbrBalanceStep.tsx
├── QbrKpiAnalysisStep.tsx
├── QbrLearningsStep.tsx
└── QbrPreSummary.tsx
```

### Fase 3 — Wizard `qbr-pre-clevel`

**Página:** `src/modules/okrs/pages/QbrPreCLevelPage.tsx`
- Acesso: `BuAdminRoute`
- Pré-condição: `cycles.qbr_status = 'reviewing'`

**Steps:**
1. **Leitura do sistema:** Consolida snapshots dos líderes. Reutiliza `useCompanyOkrs`, `useOrgOkrAnalysis`. IA via `useWizardAI` com agente `alinhamento-estrategico`.
2. **Análise estratégica:** Reflexão C-Level com `VicInsightCard`.
3. **Validação de OKRs:** Revisão das propostas dos líderes com flags de calibração. Reutiliza componentes de `MbrTeamOkrsOverviewStep` adaptados.
4. **Direcionamentos:** `DecisionCard` + `InlineDecisionInput` com `category: 'strategic_proposal'`.
5. **Avaliação:** `RitualImprovementFeedback` sem alteração.

**Arquivos:**
```
src/modules/okrs/pages/QbrPreCLevelPage.tsx
src/modules/okrs/components/wizards/qbr-pre-clevel/
├── QbrCLevelSystemReadStep.tsx
├── QbrCLevelStrategicStep.tsx
├── QbrCLevelOkrValidationStep.tsx
└── QbrCLevelDirectivesStep.tsx
```

### Fase 4 — Edge function `qbr-pre-summary`

Segue padrão `mbr-summary/index.ts`:
- Consolida todos os `qbr-pre` + `qbr-pre-clevel` do ciclo
- 3 agentes IA em paralelo via `llmComplete`
- Salva resultado como `wizard_type: 'qbr-report'`
- Envia via `emit_notification_event`
- Transiciona `qbr_status` → `ready`

### Fase 5 — Wizard `qbr-meeting`

**Página:** `src/modules/okrs/pages/QbrMeetingPage.tsx`
- Padrão MBR com snapshots imutáveis + gates

**Steps:**
1. **Abertura:** Carrega relatório pré-QBR + direcionamentos C-Level via `useLastCompletedSession`
2. **Revisão de OKRs por time (gate):** Navegação 1-de-N como `MbrTeamOkrsDetailStep`. Ações: approved/approved_with_changes/discarded/defer. Gate: todos revisados.
3. **Decisões (gate):** `DecisionCard` com `owner` e `deadline` obrigatórios. Gate: mínimo 1 decisão.
4. **Compromissos cross-área:** Vincula a OKRs aprovados.
5. **Avaliação:** `RitualImprovementFeedback`.
6. **Encerramento:** Checklist de governança. Dispara `qbr-meeting-summary`.

### Fase 6 — Wizard `qbr-post`

**Página:** `src/modules/okrs/pages/QbrPostPage.tsx`

**Steps:**
1. **Promoção de OKRs:** `useCreateTeamOkrBundle` para cada time com status `approved`. Seta `qbr_origin_session_id` e `qbr_approval_status`.
2. **Decisões complementadas:** Carrega do meeting snapshot, permite completar.
3. **Compromissos formalizados:** Salva como `okr_dependencies`.
4. **Cadência de follow-up:** Configura alertas e pauta do próximo MBR.
5. **Ata executiva e encerramento:** Campo de texto + checklist. Dispara `qbr-post-summary`. Transiciona `qbr_status` → `done`.

### Fase 7 — Integração com rituais existentes

- **MBR:** Step condicional `QbrDecisionsFollowUpStep` antes de `MbrDecisionsStep` quando existem decisões QBR pendentes no ciclo
- **RitualHistoryPage:** Adicionar `'qbr-pre' | 'qbr-pre-clevel' | 'qbr-meeting' | 'qbr-post'` nos filtros
- **WizardVicContext:** Adicionar 4 novos tipos de contexto

---

## Componentes reutilizados sem alteração

| Componente | Uso |
|---|---|
| `FullPageWizardShell` | Shell de todos os 4 wizards |
| `WizardStepper`, `WizardStepHeader`, `WizardStepFooter` | Navegação |
| `WizardStepScaffold` | Layout estável com scroll |
| `useGenericWizardDraft` | Persistência dos 4 wizards |
| `useLastCompletedSession` | Carregar snapshots anteriores |
| `useCreateTeamOkrBundle` | Promoção atômica no pós-QBR |
| `useKpisForWizardV2` | KPIs no pré-QBR |
| `useTeamPreviousCycleAnalysis` | Balanço do ciclo |
| `useKrStateInsights` | Estados dos KRs |
| `KrStateInsightCard`, `VicInsightCard` | Insights contextuais |
| `ReflectionQuestions` | Reflexão guiada |
| `DecisionCard`, `InlineDecisionInput` | Registro de decisões |
| `RitualImprovementFeedback` | Avaliação do rito |
| `TeamOkrObjectiveStep`, `TeamOkrKrDetailStep`, etc. | Sub-fluxo de criação no pré-QBR |

## Componentes adaptados (modificação mínima)

| Componente | Adaptação |
|---|---|
| `InlineDecisionInput` | Adicionar `'strategic_proposal'` ao `CATEGORY_CONFIG` |
| `DecisionCard` | Suportar nova category |
| `TeamCheckinDecisionSourceStep` | Adicionar source steps do QBR |
| `MbrPage.tsx` | Step condicional de follow-up de decisões QBR |

---

## Ordem de execução sugerida

1. Schema + tipos (Fase 1) — fundação necessária para tudo
2. Wizard qbr-pre (Fase 2) — primeiro fluxo funcional
3. Wizard qbr-pre-clevel (Fase 3) — consome dados do pré
4. Edge function qbr-pre-summary (Fase 4) — relatório consolidado
5. Wizard qbr-meeting (Fase 5) — rito principal
6. Wizard qbr-post (Fase 6) — encerramento e promoção
7. Integração (Fase 7) — conecta com rituais existentes

Total estimado: ~20 componentes novos, 4 páginas, 3 edge functions, 1 migração SQL.

