# Pré-MBR — Reorganização em 6 steps reflexivos

> **Pré-checklist consultado:** `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`, `docs/canonical/IDENTITY_CONVENTION.md`, `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`, `mem://standards/wizard-snapshot-denormalized-fields-deprecation`, `mem://features/okrs/mbr-multi-date-governance`, `mem://features/okrs/management-rituals-standard-v2`, `mem://standards/frontend-rules-of-hooks`, `mem://standards/no-render-side-effects`, `mem://standards/soft-delete-policy-v1`, `mem://standards/query-optimization-standard`, `mem://standards/frontend-memoization-standard`, `mem://features/projects/milestone-permissions-row-aware`. Componentes canônicos verificados: `WizardStepScaffold/Header/Footer`, `WizardFirstStepFooter` ("Começar"), `WizardLastStepFooter`, `RitualGreeting`, `CollaboratorCheckinTrail`, `ReflectionQuestions` (prop `collapsed`).

Referência de UX: rito **Check-in Individual** (`CollaboratorContextStep`).
Premissa: Pré-MBR é **reflexivo** — líder olha o time, **não atualiza** KPIs nem milestones; apenas justifica o que está fora da meta.

## Nova estrutura (6 steps)

| # | ID | Título | Função |
|---|----|--------|--------|
| 1 | `opening` | Abertura — Resumo do Mês | Saudação + snapshot agregado do time + trilha do rito |
| 2 | `kpi-analysis` | Indicadores do Time | KPIs `org / area / team` (read-only) — justificativa obrigatória se RAG ≠ verde |
| 3 | `projects` | Projetos do Time | Projetos/milestones atrasados (read-only) — justificativa obrigatória |
| 4 | `highlights` | Destaques e Riscos | Igual atual; card "Perguntas para reflexão" abre por padrão |
| 5 | `next-steps` | Próximos Passos | Sem alteração |
| 6 | `summary` | Resumo e Envio | Inclui as justificativas registradas |

Step atual `balance` (KRs hierárquicos editáveis) **deixa de ser o Step 1**. O conteúdo dele é absorvido pelo novo `opening` em forma de **resumo agregado** (cards de contagem por estado de KR + KPIs em alerta + projetos atrasados), sem edição. A funcionalidade de gravar `krFinalStates` permanece (seed automático em `useEffect` continua igual) — apenas deixa de ter UI dedicada.

## Detalhe por step

### Step 1 — `opening` (novo)
Criar `MbrPreOpeningStep.tsx` em `src/modules/okrs/components/wizards/mbr-pre/`. Reaproveita:
- `WizardStepScaffold` + `WizardStepHeader` (variant `purple`, ícone `Sparkles`)
- `RitualGreeting` (passar `ritualSlug="mbr-pre"`; se hook `useRitualGreetingContext` ainda não suportar slug, fallback estático com mês de referência)
- `CollaboratorCheckinTrail` (genérico — props `steps[]`); ordem da trilha derivada de `STEP_ORDER` do Pré-MBR
- `RitualPreparationStatus` no topo (`topSlot`) — já passado hoje no `balance`
- `WizardFirstStepFooter` (label default já é "Começar")

Conteúdo do "Resumo do Mês" (cards):
- KRs por estado (`achieved+exceeded`, `at_risk`, `off_track+not_achieved`, `stagnant+not_started`) — derivado de `draft.data.krFinalStates`
- KPIs em alerta (yellow + red) — derivado de `draft.data.kpiSnapshots`
- Projetos atrasados — vem da nova query do Step 3 (compartilhada via hook)

### Step 2 — `kpi-analysis` (refatorar via composição)
**Não duplicar** `QbrKpiAnalysisStep` (compartilhado com Pré-QBR). Criar wrapper local `MbrPreKpiAnalysisStep.tsx` que:
- Reaproveita o `QbrKpiAnalysisStep` para a lista visual (`<QbrKpiAnalysisStep ... />`) ou, se a injeção de slot for invasiva, reescreve a lista usando os mesmos building blocks (`KpiNameLink`, `KpiScopeBadge`, `RAG_STATUS_COLORS`, `formatValueWithUnit`).
- Para cada KPI com `ragStatus ∈ {yellow, red}` renderiza um `JustificationField` (novo, em `wizards/shared`) controlado pelo novo campo `kpiJustifications: Record<string, string>` no draft.
- `primaryDisabled` quando houver KPI fora da meta sem justificativa preenchida.
- Filtra apenas KPIs (não métricas) — query atual em `MbrPrePage` (`kpi_metrics`) já cobre KPIs; **confirmar** se há flag de tipo a aplicar (`indicator_type`?). Em caso de dúvida, manter filtro atual e abrir tarefa de validação.

### Step 3 — `projects` (novo)
Criar `MbrPreProjectsStep.tsx`. **Composição, não duplicação**:
- Reaproveita `ProjectHealthBadge`, `ProjectProgressBar` de `@/modules/projects/components`.
- **Não usar** `MilestoneStatusSelect`, `MilestoneDialog` nem `useUpdateMilestone` (rito é reflexivo).
- Nova query em `MbrPrePage` (extraída para hook `useMbrPreTeamProjects` em `src/modules/okrs/hooks/`):
  - `projects` filtrados por `bu_id` + `project_teams.team_id = teamId` + `status in ('planned','in_progress','paused')` + `deleted_at is null`
  - Inclui `project_milestones(id, name, status, due_date, deleted_at)` — `project_milestones` só tem `deleted_at` (memória soft-delete).
  - Colunas explícitas (proibido `select('*')`).
  - Query key via `mbrKeys.preTeamProjects(buId, teamId)` (adicionar em `src/lib/queryKeys/okrs.ts`).
- Filtro de "fora do prazo": projeto com `due_date < hoje` e `status != 'done'`, OU milestone com `due_date < hoje` e `status != 'done'`.
- Para cada item atrasado → `JustificationField` controlado por `projectJustifications: { projects: Record<string,string>; milestones: Record<string,string> }`.
- `primaryDisabled` quando houver atrasado sem justificativa.
- `React.memo` no card de projeto e no card de milestone.

### Step 4 — `highlights`
Única mudança: em `MbrPreHighlightsStep.tsx` remover prop `collapsed` do `<ReflectionQuestions />` (default expand).

### Step 5 — `next-steps`
Sem mudança.

### Step 6 — `summary`
Em `MbrPreSummary.tsx` adicionar bloco de "Justificativas registradas" (KPIs + projetos), exibindo **sem nomes denormalizados** — resolver via lookup: `useEntityLookup({ kpiIds, projectIds })` + `resolveName` (padrão Onda 4 Fase 2).
Manter `WizardLastStepFooter` com `backDisabled={isCompleting}` (já implementado).

---

## Mudanças técnicas

### Arquivos novos
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep.tsx`
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreKpiAnalysisStep.tsx` (wrapper sobre KPI analysis com justificativas)
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreProjectsStep.tsx`
- `src/modules/okrs/components/wizards/shared/JustificationField.tsx` — campo padrão (label, textarea, asterisco "obrigatório", borda `border-warning` quando vazio + required)
- `src/modules/okrs/hooks/useMbrPreTeamProjects.ts`

### Arquivos editados
- `src/modules/okrs/types/wizard/mbr.ts`
  - `MbrPreStep`: `'opening' | 'kpi-analysis' | 'projects' | 'highlights' | 'next-steps' | 'summary'`
  - `MbrPreDraftData`: adicionar `kpiJustifications: Record<string,string>` e `projectJustifications: { projects: Record<string,string>; milestones: Record<string,string> }`
  - Manter `krFinalStates` (seed continua) — não persistir nomes (Onda 4 F3).
- `src/modules/okrs/pages/MbrPrePage.tsx`
  - `WIZARD_STEPS`, `STEP_ORDER`, `DEFAULT_DATA`, `defaultStep: 'opening'`
  - `renderStepContent`: trocar `balance` por `opening`; inserir `projects` antes de `highlights`
  - **Hook order**: garantir que todos os `useQuery`/`useMemo` ficam antes dos guards (`mem://standards/frontend-rules-of-hooks`)
  - Migração defensiva: se `draft.currentStep === 'balance'` no load, `setStep('opening')` em `useEffect` (não em render)
  - Sem mudança em `useRitualAvailability`/`useCompletedSessionForCycle`/janela composta
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreHighlightsStep.tsx` — remover `collapsed` no `<ReflectionQuestions>`
- `src/modules/okrs/components/wizards/mbr-pre/MbrPreSummary.tsx` — bloco de justificativas com lookup
- `src/lib/queryKeys/okrs.ts` — `mbrKeys.preTeamProjects(buId, teamId)`
- `src/modules/okrs/components/wizards/mbr-pre/index.ts` — exportar novos steps

### Não mexer
- `QbrBalanceStep`, `QbrKpiAnalysisStep`, `WizardStepFooter`/`WizardFirstStepFooter`/`WizardLastStepFooter`
- Janela de availability, calendário, ciclos
- Schema do banco — toda a mudança é frontend (`reflection_data` JSONB já comporta os novos campos)

### Migração de drafts em curso
Drafts com `currentStep: 'balance'` → mapear para `'opening'` no init (useEffect). Drafts sem `kpiJustifications`/`projectJustifications` → default `{}` via spread no `DEFAULT_DATA`.

### Validações canônicas a respeitar
- BU-scoped: todas as queries com `.eq('bu_id', currentBuId)` e gate sincrônico
- `realProfileId` não é necessário aqui (sem mutations no rito reflexivo)
- Sem `select('*')`; colunas explícitas
- Soft-delete: `projects` filtra `deleted_at`+`cancelled_at`; `project_milestones` filtra apenas `deleted_at`
- Snapshot enxuto: armazenar apenas IDs + texto da justificativa
- `React.memo` em `KpiJustificationCard` e `ProjectJustificationCard`

---

## Dúvidas a confirmar antes de implementar

1. **KRs do time** — manter o snapshot agregado dentro de `opening` (cards de contagem por estado, sem editar) **ou** descontinuar completamente o `krFinalStates`?
2. **Filtro KPI vs Métrica** — a tabela `kpi_metrics` distingue KPI de "métrica operacional" via alguma coluna (`indicator_type`?) que o Step 2 deva usar? Se sim, qual valor exclui métrica?
3. **Granularidade da justificativa em projetos** — uma justificativa por **projeto atrasado** + uma por **milestone atrasado** (proposta atual), **ou** apenas uma por projeto englobando os milestones?
