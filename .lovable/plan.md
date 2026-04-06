

# Novo Step "Balanço do Quarter" no QBR Pre C-Level

## Pré-checklist verificado

- [x] TCR v3.21.0 — arquitetura multi-BU, stack, auth, wizard patterns
- [x] DEVELOPMENT_STANDARDS v1.27.0 — POST-BU (`useBuScopedSupabase`), query keys centralizadas, URL state
- [x] DATA_MODEL_REGISTRY — `cycles` (BU-scoped), `okr_team_objectives` (cycle_id), `okr_team_key_results`, `okr_org_objectives`
- [x] WIZARD_DEVELOPMENT_GUIDE v1.0 — `FullPageWizardShell`, `WizardStepScaffold`, `WizardStepHeader`, `WizardStepFooter`, insights obrigatórios
- [x] Memory: wizard-development — `useGenericWizardDraft`, race condition guard, `handleClose` = no-op
- [x] Memory: qbr-pre-clevel-ritual-standard — steps atuais, snapshot, edge function de resumo
- [x] Memory: org-view-quarter-filter-standard — `useAllOrgObjectivesView(year, cycleId)` já aceita cycleId
- [x] Verificação de implementação similar — `QbrBalanceStep` (qbr-pre do time) existe como referência de layout

## Resumo

Inserir step read-only "Balanço do Quarter" entre "Leitura do Sistema" e "Análise Estratégica". Wizard passa de 5 para 6 steps. Sem novos campos no `QbrCLevelDraftData`.

## Mudanças por arquivo

### 1. `src/modules/okrs/types/wizard.ts`

**Tipo `QbrPreCLevelStep`** — adicionar `'quarter-balance'`:
```typescript
export type QbrPreCLevelStep = 'system-read' | 'quarter-balance' | 'strategic-analysis' | 'okr-validation' | 'directives' | 'feedback';
```

**`WIZARD_CONFIGS['qbr-pre-clevel'].steps`** — inserir na posição 2:
```typescript
{ id: 'quarter-balance', label: 'Balanço do Quarter', shortLabel: 'Balanço' },
```

### 2. `src/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelQuarterBalanceStep.tsx` (NOVO)

Componente read-only com duas seções usando `WizardStepScaffold`:

**Props:**
```typescript
interface QbrCLevelQuarterBalanceStepProps {
  cycleId: string;
  year: number;
  onContinue: () => void;
  onBack: () => void;
}
```

**Seção A — OKRs Organizacionais:**
- Usa `useAllOrgObjectivesView(year, cycleId)` (hook existente, já aceita cycleId)
- Para cada objetivo org: card com título, badge RAG agregado, barra de progresso
- Dentro: KRs org com `OkrProgressBar`, RAG badge, `calculateKrState` + `KrStateInline`
- Sub-lista de team KRs vinculados (via `linkedTeamKrs` no retorno do hook)
- Estado vazio: mensagem + link para `/okrs/org-view`

**Seção B — Scorecard por Time:**
- Usa `useTeamOverviewMetrics(cycleId, teamIds)` (hook existente)
- Grid de cards por time com: nome, health badge, contadores (achieved/on_track/at_risk/off_track/sem check-in)
- Tendência vs quarter anterior: buscar ciclo anterior via `useCycles()`, comparar métricas
- Estado vazio: mensagem informativa

**Footer:** `WizardStepFooter` com back + continuar (sem validação).

### 3. `src/modules/okrs/components/wizards/qbr-pre-clevel/index.ts`

Adicionar export:
```typescript
export { QbrCLevelQuarterBalanceStep } from './QbrCLevelQuarterBalanceStep';
```

### 4. `src/modules/okrs/pages/QbrPreCLevelPage.tsx`

**WIZARD_STEPS** — inserir na posição 2:
```typescript
{ id: 'quarter-balance' as const, label: 'Balanço do Quarter', description: 'Desempenho do ciclo' },
```

**STEP_ORDER** — atualizar:
```typescript
const STEP_ORDER: QbrPreCLevelStep[] = ['system-read', 'quarter-balance', 'strategic-analysis', 'okr-validation', 'directives', 'feedback'];
```

**renderStepContent** — adicionar case:
```typescript
case 'quarter-balance':
  return (
    <QbrCLevelQuarterBalanceStep
      cycleId={quarterlyCycle!.id}
      year={quarterlyCycle!.year ?? new Date().getFullYear()}
      onContinue={goNext}
      onBack={goBack}
    />
  );
```

Import do novo componente no topo.

## Decisões técnicas

| Decisão | Justificativa |
|---------|---------------|
| Step read-only, sem campos no draft | Prompt especifica: "não adiciona campos de input ao snapshot" |
| Reusar `useAllOrgObjectivesView(year, cycleId)` | Hook já existe e aceita cycleId (feature anterior) |
| Reusar `useTeamOverviewMetrics(cycleId, teamIds)` | Hook existente, já retorna métricas consolidadas |
| `WizardStepScaffold` + `WizardStepHeader` | Padrão obrigatório do WIZARD_DEVELOPMENT_GUIDE |
| `KrStateInline` para estado de KR | Padrão de insights obrigatório |
| Tendência vs quarter anterior = comparação simplificada | Buscar ciclo anterior pelo `start_date` menor mais próximo, tipo `quarter` |

## O que NÃO muda

- Steps existentes (1, 3-6) — sem alteração funcional, apenas renumerados
- `QbrCLevelDraftData` — sem novos campos
- Lógica de rascunho e conclusão — sem alteração
- Edge function `qbr-clevel-learnings-summary` — sem alteração

