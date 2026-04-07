

## Plano: Melhorias no Ritual QBR Meeting — 11 adições em 5 steps

### Pré-checklist ✅
- TCR consultado — padrão `FullPageWizardShell`, `useGenericWizardDraft`, persistência em `okr_wizard_sessions`
- DEVELOPMENT_STANDARDS — sem anti-patterns; componentes shared no barrel
- DATA_MODEL_REGISTRY — `TeamCheckinDecision` é tipo compartilhado entre 8+ wizards
- Codebase verificado — tipos existentes, componentes existentes, nenhuma duplicação

### Conflito detectado
A **Adição 1 do Step 1** (estimativa de tempo na agenda) refere-se ao card "Agenda da Reunião" que foi **removido do JSX** na mensagem anterior a pedido do usuário. O componente `MeetingAgenda` ainda existe no arquivo mas não é renderizado. **Recomendação**: pular esta adição ou reativar o card. O plano abaixo **reativa a MeetingAgenda** com as estimativas de tempo, pois é um requisito explícito do documento. Se preferir manter removido, basta dizer.

---

### Mudanças nos tipos (wizard.ts)

**1. Estender `TeamCheckinDecision`** — adicionar 2 campos opcionais:
```ts
relatedDirectiveId?: string;
decisionType?: 'strategic' | 'tactical';
```
Como este tipo é compartilhado por todos os wizards, os campos são opcionais e não quebram nada.

**2. Estender `QbrMeetingSnapshot.crossCommitments[]`** — adicionar:
```ts
responsibleUserId?: string;  // novo
responsibleUserName?: string; // para snapshot imutável
```
(`linkedOkrId` já existe no tipo)

**3. Adicionar `nextThirtyDays` ao `QbrMeetingSnapshot` e `QbrMeetingDraftData`**:
```ts
nextThirtyDays?: { ceo?: string; coo?: string; cpto?: string; };
```

---

### Step 1 — Abertura (QbrMeetingOpeningStep.tsx) — 2 adições

**Adição 1 — Estimativa de tempo na agenda**
- Reativar `<MeetingAgenda />` no JSX
- Adicionar prop `teamsForReview: number` ao componente
- Calcular tempo: Step 2 = `teamsForReview × 9 min`, demais fixos (5, 15, 10, 10)
- Exibir badge de tempo ao lado de cada item + total no rodapé
- Prop `leaderSummaryCount` já existe e pode ser usada

**Adição 2 — Retrospectiva do quarter anterior**
- Novo sub-componente `QuarterRetrospective` entre Scorecard e OrgOkrsSummary
- Props: `teams: Array<{id, name}>`, `previousCycleMetrics`, `currentCycleMetrics`
- Tabela comparativa: Time | Quarter anterior | Quarter atual | Tendência
- Dados: a QbrMeetingPage já carrega `teamsForReview` — precisa de uma nova query no Page para buscar health do ciclo anterior
- Na Page: query adicional para `lastClosedQuarterlyCycle` (já disponível via `useActiveCycle`) e buscar métricas via uma query leve de KRs por time
- Se não há ciclo anterior, o bloco é omitido silenciosamente

**Impacto na Page**: adicionar prop `previousQuarterData` ao `QbrMeetingOpeningStepProps`

---

### Step 2 — Revisão de OKRs (QbrMeetingOkrReviewStep.tsx) — 3 adições

**Adição 1 — Timer por time**
- Novo sub-componente `ReviewTimer` (local ao arquivo, não compartilhado)
- `useState` para `timerActive`, `secondsRemaining` (540s = 9min)
- `useEffect` com `setInterval` de 1s quando ativo
- Botão "▶ Iniciar timer" ao lado do nome do time no header
- Aos 120s restantes: `cn('border-status-amber')` no card wrapper
- Ao zerar: `cn('border-status-red')` + `toast('Tempo esgotado para [nome]')`
- Timer é local — reseta ao trocar de time, não persiste no draft

**Adição 2 — Campo de ajuste estruturado para `approved_with_changes`**
- Quando status = `approved_with_changes`, exibir formulário por KR:
  - Checkbox "Esta KR tem ajuste"
  - Campos condicionais: novo título (Input), nova meta (Input), novo responsável (BuUserSelect)
- Persistir em `approvals[].changes` como `Array<{ krIndex, newTitle?, newTarget?, newOwnerId?, newOwnerName? }>`
- Novo sub-componente `StructuredChangesForm` no mesmo arquivo

**Adição 3 — Badge de OKR compartilhado**
- No card de cada proposta, cruzar `linkedOrgKrId` de todas as `teamsForReview`
- Se 2+ times cobrem a mesma KR org, exibir badge "🤝 Compartilhado com: [time]"
- Usar `useMemo` para computar `sharedOrgKrMap: Map<orgKrId, teamName[]>` uma vez
- Badge inline no card de proposta, sem usar `SharedOkrBadge` (contexto diferente)

---

### Step 3 — Decisões (QbrMeetingDecisionsStep.tsx) — 2 adições

**Adição 1 — Vínculo decisão → item de pauta**
- Adicionar prop `cLevelDirectives` ao step
- No `InlineDecisionInput` ou em uma extensão local, adicionar Select "Relacionado a" com as directives
- Persistir como `decisions[].relatedDirectiveId` (ID = index ou hash da directive)
- Exibir badge "Ref: [texto truncado]" no `DecisionCard`
- Como `DecisionCard` é compartilhado, a exibição do badge é condicional via nova prop `showDirectiveRef`

**Adição 2 — Tipo de decisão (strategic/tactical)**
- Adicionar toggle de 2 badges no formulário de criação (inline no step, acima do `InlineDecisionInput`)
- Persistir como `decisions[].decisionType`
- Badge colorido no `DecisionCard` via prop `showDecisionType`
- Strategic = azul escuro, Tactical = cinza

**Impacto na Page**: passar `cLevelDirectives` para `QbrMeetingDecisionsStep`

---

### Step 4 — Compromissos (QbrMeetingCommitmentsStep.tsx) — 2 adições

**Adição 1 — Responsável no compromisso**
- Adicionar `BuUserSelect` ao formulário, após "Para (time)"
- Persistir como `crossCommitments[].responsibleUserId` + `responsibleUserName`
- Exibir nome/avatar no card do compromisso

**Adição 2 — Vínculo compromisso → OKR aprovado**
- Adicionar prop `approvals` e `teamsForReview` ao step
- Select "OKR vinculado" listando apenas objetivos com status `approved` ou `approved_with_changes`
- Persistir no `linkedOkrId` (campo já existe no tipo)
- Badge com título do OKR no card

**Impacto na Page**: passar `approvals` e `teamsForReview` para `QbrMeetingCommitmentsStep`

---

### Step 5 — Encerramento (QbrMeetingClosingStep.tsx) — 2 adições

**Adição 1 — Resumo detalhado da reunião**
- Estender o `GovernanceSummary` existente com contadores de:
  - Decisões estratégicas vs táticas (usando `decisionType`)
  - Decisões com/sem dono
  - Compromissos com/sem responsável
  - KRs org com/sem cobertura
- Layout read-only, antes do checklist (já está nesta posição)

**Adição 2 — Campo "Próximos 30 dias"**
- Novo bloco após checklist, antes do feedback
- 3 campos `Input` (max 200 chars): CEO, COO, CPTO
- Props: `nextThirtyDays` + `onNextThirtyDaysChange`
- Campos opcionais — não bloqueiam "Concluir"
- Persistir no draft e snapshot

**Impacto na Page**: passar `nextThirtyDays` e handler

---

### Report (QbrMeetingReport.tsx)
- Adicionar seção "Próximos 30 dias" ao final do relatório
- Exibir 3 itens (CEO/COO/CPTO) somente se pelo menos um estiver preenchido

---

### Arquivos impactados (resumo)

| Arquivo | Mudanças |
|---------|----------|
| `wizard.ts` | +3 campos em `TeamCheckinDecision`, +2 campos em crossCommitments, +`nextThirtyDays` em Draft e Snapshot |
| `QbrMeetingOpeningStep.tsx` | Reativar agenda com tempo + bloco retrospectiva |
| `QbrMeetingOkrReviewStep.tsx` | Timer + ajuste estruturado + badge compartilhado |
| `QbrMeetingDecisionsStep.tsx` | Vínculo directive + tipo decisão |
| `QbrMeetingCommitmentsStep.tsx` | Responsável + vínculo OKR |
| `QbrMeetingClosingStep.tsx` | Resumo expandido + próximos 30 dias |
| `QbrMeetingReport.tsx` | Seção nextThirtyDays |
| `QbrMeetingPage.tsx` | Novas props passadas aos steps + query ciclo anterior |
| `DecisionCard.tsx` | Props `showDirectiveRef` + `showDecisionType` (opcionais) |
| `InlineDecisionInput.tsx` | Suporte a `decisionType` default |

### O que não muda
- Gates de navegação existentes
- `OrgCoverageMap` — sem alteração
- Checklist de governança — mesmos 5 itens
- Edge function `qbr-meeting-summary`
- Rituais `qbr-pre`, `qbr-pre-clevel` — intocados
- Lógica de aprovação/rejeição de OKRs

