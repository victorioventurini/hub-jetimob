

# Plano: Wizard MBR (Monthly Business Review)

## Visao Geral

O MBR e um rito decisorio mensal focado em saude estrategica do negocio. Diferente do Team Check-in (operacional/semanal), o MBR opera no nivel organizacional: KPIs mestres, OKRs organizacionais e decisoes estrategicas.

O plano reaproveita ao maximo a infraestrutura existente: `FullPageWizardShell`, `useGenericWizardDraft`, `InlineDecisionInput`, `WizardStepHeader/Footer`, `WizardStepper`, e o sistema de decisoes (azul/roxo/verde).

---

## Fase 1: Fundacao (Backend + Tipos)

### 1.1 Adicionar persona `'mbr'` ao sistema

**Arquivo:** `src/modules/okrs/types/wizard.ts`

- Adicionar `'mbr'` ao tipo `WizardPersona`
- Adicionar config em `WIZARD_CONFIGS`
- Adicionar `'wizard-mbr'` ao `WizardVicContext.type`
- Adicionar mapeamento em `WIZARD_VIC_ACTION_CONTEXTS`

**Novos tipos no mesmo arquivo:**

```typescript
// MBR Step type
type MbrStep = 'panorama' | 'kpi-gate' | 'org-okrs' | 'decisions' | 'closing';

// MBR-specific source steps for decisions
type MbrDecisionSourceStep = 'panorama' | 'kpi-gate' | 'org-okrs' | 'decisions' | 'closing';

// KPI snapshot (imutavel apos conclusao)
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
  impactAssessment?: string; // "Se ignorarmos por 30 dias..."
}

// OKR org snapshot
interface MbrOrgOkrSnapshot {
  objectiveId: string;
  title: string;
  progress: number;
  status: string;
  trend: 'improving' | 'stable' | 'declining';
  remainsStrategicPriority: boolean; // Sim/Nao
}

// Checklist de governanca
interface MbrGovernanceChecklist {
  strategicFocusClear: boolean;
  nextStepsHaveOwners: boolean;
  nonPrioritiesClear: boolean;
  communicateInAllHands: boolean;
}

// Feedback anonimo do rito
interface RitualImprovementFeedback {
  id: string;
  text: string;
  status: 'pending' | 'implement' | 'evaluated' | 'discarded';
  createdAt: string;
}

// Draft data completo
interface MbrDraftData {
  referenceMonth: string; // YYYY-MM
  kpiSnapshots: MbrKpiSnapshot[];
  orgOkrSnapshots: MbrOrgOkrSnapshot[];
  decisions: TeamCheckinDecision[]; // Reusa o tipo existente
  checklist: MbrGovernanceChecklist;
  ritualFeedback: RitualImprovementFeedback[];
  previousMbrPendingItems: TeamCheckinDecision[]; // Carregado do MBR anterior
}
```

### 1.2 Banco de Dados

**Nao e necessaria nenhuma nova tabela.** A tabela `okr_wizard_sessions` ja suporta:
- `wizard_type: string` (aceita `'mbr'`)
- `reflection_data: Json` (armazena o snapshot completo)
- `decisions: Json`
- `summary_sent_at` (idempotencia do e-mail)
- `status: wizard_session_status` (draft/in_progress/completed/abandoned)

O campo `reflection_data` armazenara o `MbrDraftData` completo como snapshot imutavel. Isso garante que nada sera recalculado depois.

### 1.3 Rota

**Arquivo:** `src/routes/okrs.routes.tsx`

```typescript
const MbrPage = lazy(() => import('@/modules/okrs/pages/MbrPage'));
// ...
<Route path="/okrs/mbr" element={<OkrRoute requiresBuAdmin><MbrPage /></OkrRoute>} />
```

Nota: `requiresBuAdmin` porque o MBR e um rito de lideranca/direcao.

---

## Fase 2: Pagina e Steps (Frontend)

### 2.1 Estrutura de arquivos

```
src/modules/okrs/
  pages/
    MbrPage.tsx                          # Pagina principal (segue padrao TeamCheckinPage)
  components/
    wizards/
      mbr/
        index.ts                         # Barrel export
        MbrWizardCard.tsx                # Card de entrada (segue TeamCheckinWizardCard)
        MbrPanoramaStep.tsx              # Etapa 1
        MbrKpiGateStep.tsx               # Etapa 2
        MbrOrgOkrsStep.tsx               # Etapa 3
        MbrDecisionsStep.tsx             # Etapa 4 (reusa logica do TeamDecisionsStep)
        MbrClosingStep.tsx               # Etapa 5
```

### 2.2 MbrPage.tsx

Segue o padrao exato do `TeamCheckinPage.tsx`:
- `useGenericWizardDraft<MbrStep, MbrDraftData>` com `wizardType: 'mbr'`
- `FullPageWizardShell` com 5 steps
- `HierarchyContextSwitcher` nao necessario (MBR e nivel organizacional, nao de time)
- Ao concluir: `clearDraft()` -> toast -> navega para `/okrs/executive`
- Trigger assincrono da edge function `mbr-summary`

### 2.3 Etapa 1 -- Panorama Executivo (`MbrPanoramaStep`)

**Dados:** Hook `useKpisForWizardV2` com `scope: 'manager'` ou query customizada para KPIs organizacionais (`kpi_metrics` com `scope = 'org'`).

**UI:**
- `WizardStepHeader` com icone `BarChart3`, variant `primary`
- Cards de KPIs mestres com: nome, valor atual, RAG badge, variacao vs mes anterior, variacao vs meta
- KPIs em risco destacados automaticamente (RAG amarelo/vermelho no topo)
- `InlineDecisionInput` com `sourceStep: 'panorama'`
- `WizardFirstStepFooter` com label "Analisar KPIs Criticos"

**Snapshot:** Ao entrar na etapa, os KPIs sao carregados e salvos no draft como `kpiSnapshots`. Dados congelados.

### 2.4 Etapa 2 -- KPI Gate Estrategico (`MbrKpiGateStep`)

**Dados:** Filtra `kpiSnapshots` onde `ragStatus` e amarelo ou vermelho.

**UI:**
- Para cada KPI critico:
  - Card com nome, valor, RAG, variacao
  - Campo textarea: "Se ignorarmos por 30 dias, o que acontece?"
  - Toggle: "Exige decisao estrategica?" (Sim/Nao)
  - Se "Sim": `InlineDecisionInput` inline obrigatorio

**Gate de Navegacao:** Nao permite avancar se algum KPI marcado como "Sim" nao tem decisao registrada.

- `WizardStepFooter` com label "Revisar OKRs Organizacionais"

### 2.5 Etapa 3 -- OKRs Organizacionais (`MbrOrgOkrsStep`)

**Dados:** Hook `useOrgObjectives` para carregar OKRs org ativas.

**UI:**
- Lista de objetivos organizacionais com progresso, status, tendencia
- Pergunta por objetivo: "Essa OKR continua representando prioridade estrategica?" (Sim/Nao)
- Se "Nao": exige registro como Decisao ou Ajuste de Foco via `InlineDecisionInput`
- Nao permite edicao estrutural de OKR

**Snapshot:** OKRs congeladas em `orgOkrSnapshots` no draft.

- `WizardStepFooter` com label "Consolidar Diretrizes"

### 2.6 Etapa 4 -- Decisoes Estrategicas Consolidadas (`MbrDecisionsStep`)

**Reuso quase total** da logica do `TeamDecisionsStep` existente. Diferencas:

- `SOURCE_STEP_LABELS` adaptado: `panorama`, `kpi-gate`, `org-okrs`, `decisions`
- Secao adicional: "Pendencias do ultimo MBR" -- carrega `previousMbrPendingItems` (decisoes `next_step` e `focus_adjustment` do MBR anterior)
- Permite reclassificar categoria (mover entre decision/focus_adjustment/next_step)
- CRUD completo com edicao inline (ja existe no `DecisionCard`)

### 2.7 Etapa 5 -- Encerramento e Governanca (`MbrClosingStep`)

**UI:**
- Checklist obrigatorio de 4 itens (`MbrGovernanceChecklist`)
- Campo anonimo obrigatorio: "Como podemos melhorar essa reuniao?"
  - Textarea simples, salvo como `RitualImprovementFeedback` no draft
  - Sem identificacao do autor
- `WizardLastStepFooter` com primary desabilitado ate: todos checkboxes marcados + pelo menos 1 feedback

---

## Fase 3: Historico e Pendencias

### 3.1 Hook `useLastMbrSession`

Reusa `useLastCompletedSession('mbr')` para obter dados do ultimo MBR.

### 3.2 Carregar pendencias do MBR anterior

Na inicializacao do draft (`MbrPage`), consultar a ultima sessao completada tipo `'mbr'` e extrair de `reflection_data.data.decisions` os itens com categoria `next_step` e `focus_adjustment`. Esses sao carregados em `previousMbrPendingItems`.

### 3.3 Pagina de historico (futuro)

A rota `/okrs/mbr/history?month=YYYY-MM` pode ser implementada como fase posterior. O snapshot ja estara salvo no `reflection_data` da sessao, permitindo visualizacao futura sem recalculo.

---

## Fase 4: E-mail de Resumo

### 4.1 Edge Function `mbr-summary`

**Arquivo:** `supabase/functions/mbr-summary/index.ts`

Segue o padrao do `team-checkin-summary`:
- Usa `withMiddleware` (CORS, validacao)
- `requireAuth: false` para permitir re-disparo administrativo
- Carrega sessao, extrai snapshot de `reflection_data`
- Orquestra agentes de IA para gerar resumo estrategico
- Destinatarios: **apenas lideres de time** da BU (`teams.leader_user_id` ativos)
  - NAO inclui subtimes
- Emite via `emit_notification_event` RPC
- Idempotencia via `summary_sent_at`

### 4.2 Template do e-mail

Conteudo:
- KPIs criticos (do snapshot)
- Decisoes estrategicas
- Ajustes de foco
- Proximos passos com responsaveis
- Diretrizes do mes

---

## Fase 5: Integracao

### 5.1 Card de entrada

`MbrWizardCard` exibido na pagina de wizards/dashboard executivo. Segue padrao do `TeamCheckinWizardCard`:
- Link para `/okrs/mbr`
- Badge com "Mensal"
- Data do ultimo MBR

### 5.2 Barrel exports

- Adicionar `export * from './mbr'` em `src/modules/okrs/components/wizards/index.ts`

---

## Resumo de Reuso

| Componente | Reuso | Adaptacao |
|---|---|---|
| `FullPageWizardShell` | 100% | Nenhuma |
| `useGenericWizardDraft` | 100% | Apenas novo `wizardType` |
| `WizardStepHeader/Footer` | 100% | Labels diferentes |
| `InlineDecisionInput` | 100% | `sourceStep` adaptado |
| `TeamCheckinDecision` type | 100% | Reusa diretamente |
| `WizardStepper` | 100% | Nenhuma |
| `DecisionCard` (inline edit) | ~90% | Extrair para shared se necessario |
| `okr_wizard_sessions` tabela | 100% | Nenhuma migracao |
| `team-checkin-summary` | ~60% | Base para `mbr-summary` |
| `useOrgObjectives` | 100% | Nenhuma |
| `useKpisForWizardV2` | ~80% | Pode precisar filtro org-level |

---

## Codigo novo estimado

- ~1 pagina (`MbrPage.tsx`) -- ~200 linhas
- ~5 step components -- ~150 linhas cada
- ~1 card de entrada -- ~80 linhas
- ~1 edge function -- ~400 linhas (baseada no template existente)
- Tipos -- ~80 linhas
- Total estimado: ~1700 linhas de codigo novo

---

## O que NAO sera feito nesta fase

1. Pagina de historico navegavel (`/okrs/mbr/history`) -- snapshot ja estara salvo, pagina construida depois
2. Marcacao de feedback como "Implementar/Avaliado/Descartado" -- campo salvo, UI de gestao posterior
3. Retroportar o bloco de feedback anonimo para outros wizards -- padrao criado aqui, expandido depois

