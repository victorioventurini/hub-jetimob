

## Plano: Pré-carregar OKRs rascunho do QBR-pre no Wizard de Criação

### Pré-checklist concluído
- ✅ TCR v3.23.0 — revisado (Client Singleton, Identity, BU-scoped)
- ✅ DEVELOPMENT_STANDARDS v1.29.0 — revisado (PRE/POST-BU, query keys, anti-patterns)
- ✅ WIZARD_DEVELOPMENT_GUIDE v1.0 — revisado (FullPageWizardShell, useGenericWizardDraft, insights obrigatórios)
- ✅ Dados reais verificados: 15 objetivos draft no ciclo `2026-Q2` (status `planning`), com KRs associados
- ✅ Memórias de draft-uniqueness, persistence-reliability, draft-okr-governance consultadas

### Descoberta crítica

O ciclo Q2 tem `status: 'planning'`. O wizard hoje usa `useActiveCycle()` que retorna apenas ciclos `active`. Resultado: `quarterlyCycle = Q1 (active)`, mas os drafts estão no **Q2 (planning)**. Sem ajuste, o wizard nunca encontraria os drafts.

### Abordagem

Não duplicar componentes. Estender o fluxo existente em 5 passos.

---

### Etapa 1 — Permitir criação de OKRs em ciclo de planejamento

**Arquivo:** `src/modules/okrs/pages/OkrCreationPage.tsx`

Alterar a lógica de seleção de ciclo: quando não há `activeQuarterlyCycle`, usar o primeiro `planningCycle` de tipo quarter (se existir). Isso permite que o wizard abra para Q2 mesmo antes de ativá-lo. O status do objetivo criado será `draft` (não `active`) quando vindo de ciclo planning.

```
const quarterlyCycle = activeQuarterlyCycle || planningCycles.find(c => c.type === 'quarter') || activeCycle;
```

### Etapa 2 — Criar hook `useDraftObjectivesForCycle`

**Arquivo novo:** `src/modules/okrs/hooks/queries/useDraftObjectivesForCycle.ts`

Query em `okr_team_objectives` com:
- `status = 'draft'`, `team_id`, `cycle_id`, `deleted_at IS NULL`
- Join com `okr_team_key_results` para trazer KRs aninhados
- Campos explícitos (sem `select('*')`)
- Retorna array tipado com `{ id, title, description, org_objective_id, keyResults[] }`

**Exportar** em `src/modules/okrs/hooks/queries/index.ts`

**Query key** em `src/lib/queryKeys/okrs.ts`:
```ts
draftObjectives: (teamId: string, cycleId: string) => ['okr-draft-objectives', teamId, cycleId] as const,
```

### Etapa 3 — Estender `TeamOkrDraft` com campo de origem

**Arquivo:** `src/modules/okrs/hooks/useWizardDraft.ts`

- Adicionar `sourceDraftObjectiveId: string | null` ao tipo `TeamOkrDraft`
- Adicionar ao `createEmptyDraft` com valor `null`
- Bump `DRAFT_VERSION` para 6

### Etapa 4 — Hidratar wizard com drafts do banco

**Arquivo:** `src/modules/okrs/pages/OkrCreationPage.tsx`

- Chamar `useDraftObjectivesForCycle(teamIdParam, quarterlyCycle?.id)`
- Quando os dados chegam **E** o draft local está vazio (step `intro`, título vazio, sem localStorage):
  - Pré-popular `objectiveTitle`, `objectiveDescription`, `selectedOrgObjectiveId`, `draftKrs` do primeiro draft
  - Guardar `sourceDraftObjectiveId` = ID real do objetivo no banco
  - Pular para step `objective` (contexto/retro não são necessários — já feitos no QBR-pre)
- Se múltiplos drafts: banner informativo "Você tem N objetivos rascunho do QBR Pre — após criar este, volte para os demais"
- **Regra:** se localStorage já tem dados (líder editou manualmente), **não sobrescrever**

### Etapa 5 — Suporte a upsert no `useCreateTeamOkrBundle`

**Arquivo:** `src/modules/okrs/hooks/useCreateTeamOkrBundle.ts`

- Adicionar campo opcional `existingObjectiveId?: string` ao `CreateTeamOkrBundleInput`
- Se presente:
  - **Update** o objetivo existente (título, descrição, org_objective_id, status → baseado no ciclo)
  - **Delete** KRs antigos do draft (`team_objective_id = existingObjectiveId`)
  - **Insert** novos KRs
- Se ausente: fluxo de insert atual (zero breaking changes)

No `handleSubmit` de `OkrCreationPage`, passar `existingObjectiveId: draft.sourceDraftObjectiveId` quando disponível. O status do objetivo será definido como `active` se o ciclo é active, ou mantido como `draft` se o ciclo é planning.

---

### Arquivos impactados

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `src/modules/okrs/hooks/queries/useDraftObjectivesForCycle.ts` | **Novo** | Query de drafts por team+cycle |
| `src/modules/okrs/hooks/queries/index.ts` | Exportar | Barrel |
| `src/lib/queryKeys/okrs.ts` | Adicionar key | `draftObjectives` |
| `src/modules/okrs/hooks/useWizardDraft.ts` | Estender tipo | `sourceDraftObjectiveId`, bump version |
| `src/modules/okrs/hooks/useCreateTeamOkrBundle.ts` | Upsert | Suporte a edição de draft existente |
| `src/modules/okrs/pages/OkrCreationPage.tsx` | Hidratação + ciclo planning | Lógica principal |

### Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Múltiplos drafts por time | Carrega primeiro, banner para demais |
| localStorage já editado | Prioridade localStorage, não sobrescreve |
| Ciclo planning → status correto | Objetivo mantém `draft` se ciclo é planning, `active` se ciclo é active |
| DRAFT_VERSION bump | Invalida localStorage antigo → força recarga limpa do banco |
| KRs órfãos ao fazer upsert | Delete KRs antigos antes de inserir novos |

