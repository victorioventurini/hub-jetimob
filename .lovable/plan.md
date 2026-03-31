

# Plano: Novo Ritual Pré-MBR (mbr-pre)

## Resumo

Wizard de preparação mensal para líderes de time (5 steps), seguindo o padrão exato do Pré-QBR. Máxima reutilização de componentes existentes — os steps de balanço e KPI reutilizam `QbrBalanceStep` e `QbrKpiAnalysisStep` diretamente (mesma interface de props). Os steps 3 e 4 são novos (diferentes do QBR) e o step 5 (summary) é novo.

---

## Arquivos a criar (6)

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/okrs/components/wizards/mbr-pre/MbrPreHighlightsStep.tsx` | Step 3 — Destaques e riscos (3 textareas + ReflectionQuestions colapsado; gate: ≥1 campo) |
| `src/modules/okrs/components/wizards/mbr-pre/MbrPreNextStepsStep.tsx` | Step 4 — Próximos passos (textarea foco + lista prioridades + dependências cross-team) |
| `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` | Step 5 — Resumo read-only + botão Enviar |
| `src/modules/okrs/components/wizards/mbr-pre/index.ts` | Barrel export |
| `src/modules/okrs/pages/MbrPrePage.tsx` | Page (padrão QbrPrePage: useGenericWizardDraft + FullPageWizardShell + seed KRs/KPIs) |
| `src/modules/okrs/components/ritual-report/renderers/MbrPreReport.tsx` | Renderer para histórico |

## Arquivos a modificar (5)

| Arquivo | Mudança |
|---------|---------|
| `src/modules/okrs/types/wizard.ts` | Adicionar `'mbr-pre'` a `WizardPersona`, `TeamCheckinDecisionSourceStep`; criar types `MbrPreStep`, `MbrPreDraftData`; adicionar config a `WIZARD_CONFIGS` e `WIZARD_VIC_ACTION_CONTEXTS` |
| `src/modules/okrs/components/wizards/index.ts` | Barrel export `mbr-pre` |
| `src/routes/rituals.routes.tsx` | Rota `/rituals/mbr-pre` + legacy redirect `/okrs/mbr-pre` |
| `src/pages/Wizards.tsx` | Card "Pré-MBR" na seção "Líderes de Time", badge "Mensal" |
| `src/modules/okrs/components/ritual-report/SnapshotReportView.tsx` | Registrar `MbrPreReport` |

## Detalhes técnicos

### Types (wizard.ts)

```typescript
// Adicionar a WizardPersona
| 'mbr-pre'

// Adicionar a TeamCheckinDecisionSourceStep  
| 'mbr-pre-balance' | 'mbr-pre-kpi' | 'mbr-pre-highlights' | 'mbr-pre-next-steps'

export type MbrPreStep = 'balance' | 'kpi-analysis' | 'highlights' | 'next-steps' | 'summary';

export interface MbrPreDraftData {
  cycleId: string;
  teamId: string;
  krFinalStates: QbrPreDraftData['krFinalStates']; // reutiliza shape existente
  kpiSnapshots: MbrKpiSnapshot[];
  zombieCandidates: string[];
  kpisToCreate: QbrPreDraftData['kpisToCreate'];
  highlights: { accelerated: string; blocked: string; needsDecision: string };
  nextSteps: { focus: string; prioritizedItems: string[]; crossDependencies: string[] };
  decisions: TeamCheckinDecision[];
}
```

### Reutilização direta de steps existentes

- **Step 1 (Balanço):** Usa `QbrBalanceStep` diretamente — mesma interface de props (krFinalStates, decisions, onContinue, teamId). O sourceStep será `'mbr-pre-balance'`.
- **Step 2 (KPIs):** Usa `QbrKpiAnalysisStep` diretamente — mesma interface (kpiSnapshots, zombieCandidates, kpisToCreate, decisions).

### Steps novos (3, 4, 5)

**Step 3 — MbrPreHighlightsStep:** Segue layout do `QbrLearningsStep` mas com campos adaptados:
- "O que acelerou" (✓ verde)
- "O que travou" (✗ vermelho)  
- "O que precisa de decisão na reunião" (⚠ âmbar)
- `ReflectionQuestions` colapsado no topo com perguntas mensais
- Gate: pelo menos 1 campo preenchido

**Step 4 — MbrPreNextStepsStep:** Novo, sem equivalente QBR:
- Textarea "foco do próximo mês"
- Lista dinâmica de itens priorizados (add/remove, texto livre)
- Lista de dependências cross-team (add/remove, texto livre)

**Step 5 — MbrPreSummary:** Segue padrão `QbrPreSummary`:
- Cards read-only para cada seção
- Botão "Enviar" congela snapshot em `okr_wizard_sessions` com `wizard_type = 'mbr-pre'`

### Page (MbrPrePage.tsx)

Segue exatamente o padrão `QbrPrePage`:
- `useActiveCycle()` para obter ciclo ativo (qualquer tipo, não apenas quarter)
- **Sem gate de qbr_status** — disponível sempre que houver ciclo ativo
- `useGenericWizardDraft<MbrPreStep, MbrPreDraftData>` com `wizardType: 'mbr-pre'`
- Seed de KRs e KPIs idêntico ao QbrPrePage
- Draft key: `mbr-pre:{cycleId}:{teamId}`
- `handleComplete` congela snapshot e navega para `/rituals`

### Integração no MBR (NÃO inclusa neste PR)

A modificação do `MbrTeamOkrsDetailStep` para consumir o snapshot do Pré-MBR será feita em etapa subsequente, pois o componente de detalhe por time possui lógica de navegação complexa que merece atenção isolada. O Pré-MBR funciona de forma independente como ritual standalone.

### Wizards.tsx

Adicionar na seção "Líderes de Time" (após "Check-in do Time"):
```typescript
{
  id: 'mbr-pre',
  name: 'Pré-MBR',
  description: 'Prepare o contexto do seu time para o Monthly Business Review',
  icon: Briefcase,
  module: 'okrs',
  requiredRole: 'leader',
  badge: 'Mensal',
  badgeVariant: 'secondary',
  requiresTeam: true,
  route: '/rituals/mbr-pre',
}
```

### Report Renderer

Segue padrão `QbrPreReport` com seções adaptadas: Balanço KRs, KPIs, Destaques e Riscos, Próximos Passos, Notas.

---

## O que é reutilizado sem alteração

`FullPageWizardShell`, `useGenericWizardDraft`, `QbrBalanceStep`, `QbrKpiAnalysisStep`, `InlineDecisionInput`, `KrLinkedDetails`, `UnlinkedProjectsList`, `ReflectionQuestions`, `WizardStepScaffold`, `WizardStepHeader/Footer`, `HierarchyContextSwitcher`, `calculateKrState`, `useLastCompletedSession`, `useActiveCycle`

