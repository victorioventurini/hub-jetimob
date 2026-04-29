## Escopo desta onda

Apenas **Fases 2 e 5** do prompt original. As Fases 1, 3, 4 e 6 ficam fora — serão tratadas em ondas subsequentes.

Critério de sucesso: ~29 campos removidos dos tipos de wizard, zero alteração de comportamento de usuário, sessões antigas continuam renderizando.

## Pré-checklist canônico realizado

- TCR §4.8.1 (framework de wizards v3.26.0) e §2189 (imutabilidade de sessão) consultados.
- TCR §3951 (auto-seeding imutável de KPIs/OKRs) consultado.
- Memórias relevantes: `mem://features/okrs/management-rituals-standard-v2`, `mem://features/rituals/ritual-addendum-standard`, `mem://features/rituals/ritual-reopen-mechanism`, `mem://features/okrs/cycles-and-rituals-master`.
- Padrão `wizard-snapshot-persistence` mapeado em `okr_wizard_sessions.reflection_data`.

## Princípios desta onda

1. **Nenhum step, gate ou fluxo muda.** Se um campo é renderizado no histórico, mantemos retrocompatibilidade no renderer (`?.` + fallback derivado).
2. **Snapshots existentes são imutáveis.** JSONB de `okr_wizard_sessions.reflection_data` antigo nunca é re-escrito.
3. **Sessões `in_progress` são migradas com defaults.** Se o draft em `localStorage` ou `okr_wizard_sessions` ainda tem o campo antigo, simplesmente deixamos de ler — não há corrupção.
4. **Tests são atualizados** para refletir a nova superfície de tipos.

## Fase 2 — Remoção de campos sem consumidor

### 2.1 — Métricas pré-computadas do Leader Prep (8 campos)

Remover o objeto `metrics` de `LeaderPrepWizardState`:
`totalKrs`, `krsUpdatedOnTime`, `krsUpdatedLate`, `krsNoUpdate`, `krsAtRisk`, `krsStagnant`, `initiativesCritical`, `collaboratorsNeedingHelp`.

Substituir por hook `useLeaderPrepMetrics(teamId, weekReference)` que recomputa a partir de `okr_checkins` + `effective_kr_status`.

Consumidores diretos a ajustar:
- `src/modules/okrs/components/wizards/leader-prep/LeaderOverviewStep.tsx` — passa a ler do hook.
- `src/modules/okrs/components/ritual-report/renderers/LeaderPrepReport.tsx` — render condicional: usa o hook se a sessão está em curso; para sessões antigas, lê `metrics` do JSONB com optional chaining (fallback gracioso).
- `LeaderPrepPage.tsx` — remover persistência das métricas no draft.

### 2.2 — Notas livres sem consumidor (5 campos, não 6)

Remover:
- `LeaderPrepWizardState.meetingNotes`
- `WeeklyDraftData.prioritiesNotes`
- `WeeklyDraftData.peopleNotes`
- `WeeklyDraftData.closing.checklist` (record genérico)
- `CollaboratorWizardState.reflection.impactSummary`

> Divergência do prompt original: `QbrMeetingDraftData.nextThirtyDays` precisa ser **revalidado em onda futura** — vou listar como aberto, não remover nesta onda. Há sinais de que pode ter consumo no QBR Executive Report.

### 2.3 — Campos deprecados (3 campos)

Remover:
- `PreWeeklyDraftData.sourcesReflection`
- `PreWeeklyDraftData.topics[].priority`
- `QbrPostSnapshot.adjustmentNotes`

Confirmar com `rg` que nenhum renderer ou edge function consome (`adjustmentNotes` aparece em 4 arquivos — auditar antes de remover).

### 2.4 — Checklist do Team Checkin (3 booleans)

Remover de `TeamCheckinDraftData.checklist`:
`knowWhatToFocus`, `knowWhatNotToDo`, `knowWhoIsResponsible`.

> **Conflito com renderer:** `TeamCheckinReport.tsx` (linhas 43-45) renderiza esses 3 campos visualmente. Decisão: remover do tipo, manter no renderer com guarda `if (checklist?.knowWhatToFocus !== undefined)` para sessões antigas; novas sessões não exibem essa seção.

### 2.5 — Campos da Weekly sem efeito (1 campo, não 2)

Remover:
- `executiveOpening.suggestedOrder` — sem consumidor confirmado.

> **Divergência do prompt:** `executiveOpening.offAgenda` **tem UI ativa** em `WeeklyExecutiveOpeningStep.tsx` (textarea de input). Não pode ser removido sem decisão de produto — manter nesta onda e abrir item de produto separado.

### 2.6 — Priority do Leader Prep (1 campo)

Remover `highlights[].priority`.

### 2.7 — Variações calculadas do MBR KPI snapshot (2 campos)

Remover do tipo `MbrKpiSnapshot` (renomeação para `KpiRitualSnapshot` é Fase 3, fora desta onda):
- `variationVsLastMonth`
- `variationVsTarget`

Criar util `src/modules/okrs/utils/kpiVariations.ts`:
```ts
export const variationVsLast = (curr, prev) => prev ? ((curr-prev)/prev)*100 : null;
export const variationVsTarget = (curr, target) => target ? ((curr-target)/target)*100 : null;
```

Consumidores:
- `MbrPanoramaStep.tsx` — usar util.
- `mbr-summary/index.ts` e `qbr-pre-summary/index.ts` — computar in-place a partir de `currentValue`, `previousValue`, `target` (que permanecem). Histórico antigo continua válido pois os valores fonte estão preservados.
- Tests: `MbrPanoramaStep.test.tsx`, `MbrKpiGateStep.test.tsx` atualizados.

### 2.8 — MBR checklist sem proxy (1 campo)

Remover `checklist.communicateInAllHands`. Verificar render no `MbrReport.tsx`.

### 2.9 — Carry-over re-derivável (1 campo)

Remover `previousMbrPendingItems` de `MbrDraftData`.

Criar hook `usePreviousMbrPendingItems(currentMbrSessionId, teamId)` consultando `okr_decisions` com filtro de deadline pendente e `source_session_id` da sessão MBR anterior.

Consumidores a ajustar:
- `MbrPage.tsx` (linhas 593, 613, 802-804) — substituir hidratação no draft pelo hook.
- `MbrDecisionsStep.tsx` (linhas 31, 72, 185) — receber via prop do hook.
- Histórico: `MbrReport.tsx` lê do JSONB para sessões antigas, usa hook para in-progress.

### 2.10 — Datas re-deriváveis do Pós-QBR (2 campos)

Remover de `followUpCadence`:
- `nextMbrDate`
- `firstCheckinDate`

Computar via hook `useFollowUpDates(destinationCycleId)` lendo `cycles.review_date` e `cycles.start_date`.

### 2.11 — Boolean derivável do Pós-QBR (1 campo)

Remover `krAdjustments[].hasAdjustment`. Computar inline:
```ts
const hasAdjustment = !!(adj.newTitle || adj.newTarget || adj.newOwnerId);
```

### Total Fase 2: ~22 campos removidos (vs ~25 do prompt; divergências documentadas).

## Fase 5 — Governance checklists deriváveis

### Remover do tipo `MbrDraftData.checklist` (4):
- `kpiGateClear`
- `allTeamsReviewed`
- `decisionsHaveOwner`
- `qbrFollowUpAddressed`

### Remover do tipo `QbrMeetingDraftData.governanceChecklist` (3):
- `allTeamsReviewed`
- `decisionsHaveOwners`
- `dependenciesFormalized`

### Remover do tipo `QbrPostDraftData.governanceChecklist` (3):
- `decisionsHaveOwners`
- `dependenciesFormalized`
- `nextCycleOkrsActive`

### Manter (julgamento humano):
- MBR: `strategicFocusClear`, `nonPrioritiesClear`, `orgOkrsVerified`, `nextMbrScheduled`
- QBR Meeting: `orgCoverageClear`, `feedbackLinkSent`
- Pós-QBR: `strategicFocusClear`

### Implementação

Criar `src/modules/okrs/utils/checklistDerivation.ts` com funções puras:
```ts
export function deriveMbrChecklist(draft: MbrDraftData): DerivedMbrChecklist;
export function deriveQbrMeetingChecklist(draft: QbrMeetingDraftData, totalTeams: number): DerivedQbrMeetingChecklist;
export function deriveQbrPostChecklist(draft: QbrPostDraftData): DerivedQbrPostChecklist;
```

Em `QbrMeetingClosingStep.tsx` (já tem lógica em linhas 394-455) e equivalentes do MBR e Pós-QBR: combinar checklist persistido (manuais) + retorno do `derive*Checklist()` (derivados). UI exibe ambos no mesmo formato; condutor não distingue.

Renderers de histórico (`MbrReport.tsx`, `QbrMeetingReport.tsx`, `QbrPostReport.tsx`):
- Sessão antiga: lê do JSONB com `?.` (mostra o que foi marcado).
- Sessão nova: deriva on-the-fly via `derive*Checklist()`.

### Total Fase 5: 10 campos removidos (vs 9 do prompt).

## Estrutura técnica da entrega

### Ordem de implementação dentro da onda
1. Criar utils (`kpiVariations.ts`, `checklistDerivation.ts`) e hooks (`useLeaderPrepMetrics`, `usePreviousMbrPendingItems`, `useFollowUpDates`) — sem consumidores ainda.
2. Migrar consumidores um arquivo por vez (steps, pages).
3. Atualizar renderers de histórico com guardas de retrocompat.
4. Atualizar edge functions (`mbr-summary`, `qbr-pre-summary`).
5. Remover os campos dos tipos em `mbr.ts`, `qbr.ts`, `weekly.ts`, `leader-prep.ts`, `team-checkin.ts`, `collaborator.ts`.
6. Atualizar tests.

### Arquivos tocados (estimativa)
- 6 arquivos de tipos em `src/modules/okrs/types/wizard/`
- ~12 steps em `src/modules/okrs/components/wizards/*/`
- ~8 renderers em `src/modules/okrs/components/ritual-report/renderers/`
- ~6 pages em `src/modules/okrs/pages/`
- 2 edge functions (`mbr-summary`, `qbr-pre-summary`)
- ~10 arquivos de teste
- 3 novos hooks + 2 novos utils

### Sem migration de banco
Esta onda **não toca em schema do Supabase**. JSONB em `reflection_data` permanece como está.

### Compatibilidade
- Sessões `completed` (snapshot imutável): renderers fazem fallback gracioso via `?.` e tipos opcionais nos renderers.
- Sessões `in_progress` cujo draft tem campos antigos: o read-side simplesmente ignora; o write-side não grava mais. Sem perda de dados.

## Itens deixados em aberto (devolvidos a produto)

Estes pontos do prompt original **não foram implementados** nesta onda por divergência com o código atual:

1. **`QbrMeetingDraftData.nextThirtyDays`** — possível consumo no QBR Executive Report. Precisa investigação antes de remover.
2. **`executiveOpening.offAgenda`** — tem UI ativa em `WeeklyExecutiveOpeningStep.tsx`. Remoção exige decisão de produto.

## Fora de escopo desta onda (ondas futuras)

- **Fase 1** (denormalização de nomes/títulos — ~18 campos) — usuário já aprovou "remover tudo aceitando histórico mostrar nomes atuais". Próxima onda.
- **Fase 3** (unificação de tipos canônicos em `shared.ts`) — `KrFinalStateSnapshot`, `KpiRitualSnapshot`, `QbrKrAdjustment`, `QbrCrossCommitment`, achatamento `WeeklyPriorityItem`.
- **Fase 4** (vocabulário canônico) — `RitualBlock`, `RitualPeopleSignalType`, `RitualThemeActionType`, `DecisionCategory`, mapeamento `DIRECTIVE_TO_DECISION_MAP`.
- **Fase 6** — descartada conforme decisão do usuário.

## Validação ao final da onda

- `bun test` em `src/modules/okrs/**/*` verde.
- Build passa.
- Render manual de uma sessão `completed` antiga (smoke test em preview) sem erro.
- Criação de nova sessão MBR e QBR Meeting sem erro até `closing`.
- Edge functions `mbr-summary` e `qbr-pre-summary` curl OK com payload sem `variationVsLastMonth`.
