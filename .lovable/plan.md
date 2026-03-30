

# Plano: Step "Projetos" no Collaborator Check-in Wizard

## Validação TCR & Docs Canônicos ✓

| Doc | Status | Notas |
|-----|--------|-------|
| TCR v3.20.0 | ✓ | Projects v1.4, `milestone_status` enum existe |
| WIZARD_DEVELOPMENT_GUIDE | ✓ | `WizardStepHeader` + `WizardStepFooter`, optional step pattern |
| BU_SCOPED_SUPABASE_RULES | ✓ | Usar `useBuScopedSupabase()` + `.eq('bu_id', buId)` |
| QUERY_KEYS_STANDARD | ✓ | Nova key em `projectsKeys` |
| IDENTITY_CONVENTION | ✓ | `effectiveUserId` = `profiles.id` |
| wizard-ritual-integration-standard | ✓ | Integração aditiva, sem alterar draft |

## Alterações

### 1. `src/lib/queryKeys/projects.ts`
Adicionar key:
```ts
myMilestones: (buId: string | null, profileId: string | null) =>
  ['projects', 'my-milestones', buId, profileId] as const,
```

### 2. Novo: `src/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep.tsx`

**Props:** `effectiveUserId`, `onContinue`, `onBack`, `onSkip`

**Query:** Busca projetos ativos onde o usuário é owner do projeto OU owner de milestones pendentes. Duas queries paralelas + merge/deduplica por `project.id`. Usa `useBuScopedSupabase()` + `useBu()` para BU filtering.

**UI:**
- `WizardStepHeader` — ícone `FolderKanban`, variant `purple`, título "Projetos"
- Para cada projeto: nome + `ProjectHealthBadge` + `ProjectProgressBar`
- Dentro de cada projeto: milestones pendentes com `MilestoneStatusSelect` inline
- Milestones `done` são colapsados/ocultos
- Empty state: "Nenhum projeto sob sua responsabilidade"

**Mutation:** `useUpdateMilestone` (fire-and-forget com fail-safe — try/catch + toast.warning)

**Footer:** `WizardOptionalStepFooter` (skip allowed)

**Cache invalidation:** `useUpdateMilestone` já invalida `projectsKeys.milestones()`, `listPrefix()`, `detail()`. Adicionar invalidação de `projectsKeys.forWizard()` no onSuccess.

### 3. Editar: `src/modules/okrs/pages/CollaboratorCheckinPage.tsx`

- Tipo `WizardStep`: adicionar `'projects'`
- `WIZARD_STEPS`: inserir `{ id: 'projects', label: 'Projetos', description: 'Atualização de marcos' }` entre `kpis` e `initiatives`
- `STEP_ORDER`: `['context', 'checkin', 'kpis', 'projects', 'initiatives', 'reflection', 'summary']`
- Import `CollaboratorProjectsStep`
- `renderStepContent()`: case `'projects'` renderiza `<CollaboratorProjectsStep effectiveUserId={effectiveUserId} onContinue={goNext} onBack={goBack} onSkip={goNext} />`

### 4. Editar: `src/modules/okrs/components/wizards/collaborator/index.ts`

Adicionar export do `CollaboratorProjectsStep`.

## Não altera

- Draft state (`CollaboratorDraftData`) — sem campos novos, mudanças de milestone são persistidas imediatamente
- Steps existentes — nenhuma modificação
- Testes existentes — steps anteriores não mudam de índice (são referenciados por id)

