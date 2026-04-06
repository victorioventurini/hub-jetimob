

## Plano Revisado: Melhorias nos Rituais QBR (Meeting + Post)

**Pre-checklist concluído:**
- [x] TCR v3.21.0 consultado (seção 4.8 QBR Wizards, seções de Edge Functions, modelo de dados)
- [x] DEVELOPMENT_STANDARDS v1.27.0 consultado (PRE-BU/POST-BU, query keys, wizard patterns)
- [x] DATA_MODEL_REGISTRY consultado (tabelas `okr_wizard_sessions`, `cycles`, `teams`)
- [x] IDENTITY_CONVENTION — não impactada (sem manipulação de `user_id` vs `profile_id`)
- [x] PERMISSIONS_AND_RBAC_MODEL — não impactado (acesso já é `requiresBuAdmin`)
- [x] Codebase verificado — Item 1 (Balanço do Quarter) e Item 3 (flags/adendos) confirmados como implementados

**Itens já implementados (sem alteração):**
- Item 1: `QbrCLevelQuarterBalanceStep` existe em `qbr-pre-clevel/`
- Item 3: `QbrMeetingOkrReviewStep` já recebe e renderiza `calibrationFlags` e `teamAddendums`

**Escopo: Itens 2, 4, 5 e 6** — 7 arquivos, sem mudança de schema, sem edge functions, sem RLS.

---

### Item 2 — QbrMeetingOpeningStep: Scorecard + Pauta C-Level + Agenda

**Arquivo:** `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingOpeningStep.tsx`

Três novos blocos antes dos KPIs em alerta (que se mantêm intactos, apenas reposicionados):

**Bloco 1 — Scorecard do quarter (4 metric cards em grid 2x2):**
- OKRs no ritmo (`healthy`) — verde
- OKRs em risco (`at_risk`) — amarelo
- OKRs fora da meta (`off_track`) — vermelho
- Times sem submissão qbr-pre — cinza
- Dados via nova prop `scorecardMetrics: { healthy: number; atRisk: number; offTrack: number; noSubmission: number }`

**Bloco 2 — Pauta obrigatória do C-Level (já parcialmente implementado):**
- Manter renderização existente de `cLevelDirectives` e `cLevelStrategicAnalysis.whatNotToDo`
- Adicionar fallback: quando `cLevelSessionExists === false`, exibir `Card` com borda tracejada e texto "O Pré-QBR C-Level não foi submetido. A pauta obrigatória não está disponível."
- Nova prop `cLevelSessionExists: boolean`

**Bloco 3 — Agenda da reunião:**
- Lista visual fixa dos 5 steps com número, título, subtítulo descritivo
- Indicador do step atual via nova prop `currentStepIndex: number`
- Sem interação — read-only

**Alteração de props (additive):**
```typescript
export interface QbrMeetingOpeningStepProps {
  // ... existentes mantidas ...
  scorecardMetrics: { healthy: number; atRisk: number; offTrack: number; noSubmission: number };
  cLevelSessionExists: boolean;
  currentStepIndex: number;
}
```

**Arquivo:** `src/modules/okrs/pages/QbrMeetingPage.tsx`
- Computar `scorecardMetrics` a partir dos dados já carregados:
  - `teamsForReview` (contagem de submissões) vs `buTeams` (total de times ativos)
  - Contagem de aprovações por status dos KRs (derivada de `preQbrSessions` → `krFinalStates`)
- Passar `cLevelSessionExists: !!cLevelSession`
- Passar `currentStepIndex: STEP_ORDER.indexOf(draft.currentStep)`

**Padrões respeitados:**
- `useBuScopedSupabase()` para queries (POST-BU) ✅
- Sem `select('*')` — queries existentes já usam campos explícitos ✅
- Dados derivados de snapshots existentes (sem queries adicionais) ✅

---

### Item 4 — QbrMeetingClosingStep: Resumo + Checklist dinâmico

**Arquivo:** `src/modules/okrs/components/wizards/qbr-meeting/QbrMeetingClosingStep.tsx`

**Novas props (additive):**
```typescript
export interface QbrMeetingClosingStepProps {
  // ... existentes mantidas ...
  approvals: QbrMeetingSnapshot['approvals'];
  decisions: TeamCheckinDecision[];
  crossCommitments: QbrMeetingSnapshot['crossCommitments'];
  totalTeamsForReview: number;
}
```

**Resumo antes do checklist (Card read-only):**
- OKRs aprovados / com ajuste / diferidos / descartados — contadores derivados de `approvals`
- Total de decisões com dono — contagem de `decisions.filter(d => d.owner?.id)`
- Total de compromissos cross-área — `crossCommitments.length`

**Checklist dinâmico — cada item recebe `disabled` condicional:**
| Item | Condição para habilitar |
|------|------------------------|
| `allTeamsReviewed` | `approvals.length >= totalTeamsForReview` |
| `decisionsHaveOwners` | `decisions.every(d => d.owner?.id)` ou `decisions.length === 0` |
| `dependenciesFormalized` | Livre (confirmação manual) |
| `feedbackLinkSent` | Livre (confirmação manual) |

- Quando `disabled`, o `Checkbox` mostra tooltip explicando a pendência
- Item auto-checked quando condição atendida

**Arquivo:** `src/modules/okrs/pages/QbrMeetingPage.tsx`
- Passar as 4 novas props ao `QbrMeetingClosingStep` (dados já disponíveis no `draft.data`)

---

### Item 5 — QbrPostOkrPromotionStep: Flags C-Level + Campo de ajuste + Dependências

**Arquivo:** `src/modules/okrs/components/wizards/qbr-post/QbrPostOkrPromotionStep.tsx`

**Novas props:**
```typescript
export interface QbrPostOkrPromotionStepProps {
  // ... existentes mantidas ...
  calibrationFlags?: QbrCLevelSnapshot['okrCalibrationFlags'];
  crossCommitments?: QbrMeetingSnapshot['crossCommitments'];
  adjustmentNotes: Record<string, string>;
  onAdjustmentNotesChange: (notes: Record<string, string>) => void;
}
```

**Flags do C-Level:**
- Dentro de cada card de time, abaixo do status badge, exibir `calibrationFlags.filter(f => f.teamId === okr.teamId)`
- Reutilizar o mesmo padrão visual do `QbrMeetingOkrReviewStep` (ícone `Flag` + `bg-status-amber-muted/30`)

**Campo de ajuste inline:**
- Para OKRs com `status === 'approved_with_changes'`, renderizar `Textarea` abaixo dos OKRs propostos
- Placeholder: "Descreva os ajustes necessários antes de promover..."
- Valor: `adjustmentNotes[okr.sessionId]`
- onChange: `onAdjustmentNotesChange({ ...adjustmentNotes, [sessionId]: value })`

**Indicador de dependências:**
- Para cada time, verificar se `crossCommitments` contém `toTeamId === okr.teamId`
- Se sim, exibir `Badge` âmbar: "Depende de: [nome do time origin]"
- Resolver nome via `buTeams` (já disponível no `QbrPostPage`)

**Arquivo:** `src/modules/okrs/types/wizard.ts`
- Adicionar `adjustmentNotes?: Record<string, string>` ao `QbrPostDraftData`

**Arquivo:** `src/modules/okrs/pages/QbrPostPage.tsx`
- Carregar sessão C-Level (mesma query pattern do `QbrMeetingPage` — reutilizar)
- Extrair `calibrationFlags` do snapshot
- Passar `crossCommitments` do meeting snapshot (já carregado como `meetingCommitments`)
- Adicionar `adjustmentNotes: {}` ao `DEFAULT_DATA`
- Passar as novas props e handlers ao componente

---

### Item 6 — QbrPostMinutesStep: Resumo automático antes da ata

**Arquivo:** `src/modules/okrs/components/wizards/qbr-post/QbrPostMinutesStep.tsx`

**Novas props:**
```typescript
export interface QbrPostMinutesStepProps {
  // ... existentes mantidas ...
  summaryData?: {
    promotedOkrs: Array<{ teamName: string; objectiveTitle: string; krCount: number }>;
    decisions: Array<{ text: string; ownerName?: string; deadline?: string }>;
    crossCommitments: Array<{ fromTeamName: string; toTeamName: string; description: string; deadline: string }>;
    teamsWithoutPromotion: string[];
  };
}
```

**Card read-only antes do campo de texto (dados estruturados, sem IA):**
- **OKRs promovidos:** lista por time com objetivo e quantidade de KRs
- **Decisões:** lista com dono e prazo
- **Compromissos cross-área:** "De → Para" com prazo
- **Times sem OKR promovido:** lista para visibilidade

- Renderizado com `Collapsible` (expandido por padrão) para não ocupar espaço excessivo
- Label: "Resumo do QBR (dados consolidados)"

**Arquivo:** `src/modules/okrs/pages/QbrPostPage.tsx`
- Computar `summaryData` a partir dos dados já carregados:
  - `approvedOkrs` + `draft.data.promotedOkrIds` para OKRs promovidos
  - `meetingDecisions` + `draft.data.decisions` para decisões
  - `meetingCommitments` + `draft.data.crossCommitments` para compromissos
  - `teams` — `approvedOkrs.map(o => o.teamId)` para times sem promoção

---

### Resumo de arquivos impactados

| Arquivo | Mudança |
|---------|---------|
| `QbrMeetingOpeningStep.tsx` | +Scorecard +Fallback C-Level +Agenda |
| `QbrMeetingClosingStep.tsx` | +Resumo +Checklist dinâmico |
| `QbrMeetingPage.tsx` | Novas props para Opening e Closing |
| `QbrPostOkrPromotionStep.tsx` | +Flags C-Level +Campo ajuste +Dependências |
| `QbrPostMinutesStep.tsx` | +Resumo automático antes da ata |
| `QbrPostPage.tsx` | +Query C-Level session +Novas props |
| `types/wizard.ts` | `adjustmentNotes` no `QbrPostDraftData` |

7 arquivos. Sem mudanças de banco, edge functions ou RLS. Todas as props são aditivas (backward-compatible). Dados derivados de snapshots imutáveis em `reflection_data`.

