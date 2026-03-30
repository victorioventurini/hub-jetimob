

# Plano: Step "Projetos" no Leader Prep Wizard

## Validação TCR & Docs Canônicos ✓

| Doc | Status | Notas |
|-----|--------|-------|
| TCR v3.20.0 | ✓ | Projects v1.4, milestone_status enum, project_teams join |
| WIZARD_DEVELOPMENT_GUIDE | ✓ | WizardStepHeader + WizardStepFooter + WizardStepScaffold |
| BU_SCOPED_SUPABASE_RULES | ✓ | useOptionalBuClient já usado em useProjectsForWizard |
| QUERY_KEYS_STANDARD | ✓ | Reutiliza projectsKeys.forWizard() existente |
| IDENTITY_CONVENTION | ✓ | owner_id = profiles.id |
| wizard-ritual-integration-standard | ✓ | Integração aditiva, sem alterar draft |

## Contexto Atual

- `LeaderHighlightsStep` renderiza `<ProjectsSummary teamId={teamId} mode="prep" />` como bloco colapsável — visão compacta (nome, health, progresso, prazo)
- O hook `useProjectsForWizard` já busca projetos ativos do time com milestones, mas só retorna contagens agregadas
- O `CollaboratorProjectsStep` já implementa o padrão completo com milestones inline e MilestoneStatusSelect

## Alterações

### 1. Expandir `useProjectsForWizard` para retornar milestones individuais

Adicionar campo `milestones` ao retorno (id, name, status, due_date, owner_id, notes). O tipo `ProjectForWizard` ganha campo opcional `milestones?` para não quebrar consumidores existentes.

**Arquivo:** `src/modules/projects/hooks/useProjectsForWizard.ts`
- Expandir select para incluir `name, owner_id, notes` nos milestones
- Mapear milestones individuais (filtrando deleted_at) no retorno

**Arquivo:** `src/modules/projects/types.ts`
- Adicionar campo opcional ao `ProjectForWizard`:
```ts
milestones?: Array<{
  id: string; name: string; status: MilestoneStatus;
  due_date: string | null; owner_id: string | null; notes: string | null;
}>;
```

### 2. Novo componente: `LeaderProjectsStep.tsx`

**Arquivo:** `src/modules/okrs/components/wizards/leader-prep/LeaderProjectsStep.tsx`

**Comportamento:**
- Usa `useProjectsForWizard(teamId)` para buscar projetos do time
- Exibe cada projeto com: nome, ProjectHealthBadge, ProjectStatusBadge, ProjectProgressBar, prazo, link externo
- Lista milestones pendentes (status !== 'done') com MilestoneStatusSelect inline (fire-and-forget via useUpdateMilestone)
- Milestones done ficam ocultos
- Empty state: "Nenhum projeto ativo neste time"
- Notas de milestone visíveis via tooltip (se existirem)

**UI:** WizardStepScaffold + WizardStepHeader (ícone FolderKanban, variant purple, título "Projetos do Time") + WizardStepFooter (back + continuar)

### 3. Integrar no `LeaderPrepPage.tsx`

**Arquivo:** `src/modules/okrs/pages/LeaderPrepPage.tsx`

- Tipo WizardStep: `'overview' | 'kpi-alerts' | 'projects' | 'highlights' | 'prep' | 'alignment'`
- WIZARD_STEPS: inserir `{ id: 'projects', label: 'Projetos', description: 'Marcos e entregas do time' }` entre kpi-alerts e highlights
- STEP_ORDER: `['overview', 'kpi-alerts', 'projects', 'highlights', 'prep', 'alignment']`
- renderStepContent: case 'projects' renderiza `<LeaderProjectsStep teamId={teamIdParam} onContinue={goNext} onBack={goBack} />`

### 4. Remover ProjectsSummary do LeaderHighlightsStep

**Arquivo:** `src/modules/okrs/components/wizards/leader-prep/LeaderHighlightsStep.tsx`

- Remover o bloco `{teamId && <ProjectsSummary .../>}` (linhas 218-221)
- Remover import de ProjectsSummary
- Evita duplicação — projetos passam a ter step dedicado

### 5. Atualizar barrel export

**Arquivo:** `src/modules/okrs/components/wizards/leader-prep/index.ts`

- Adicionar export do LeaderProjectsStep

## Não altera

- Draft state (LeaderPrepDraftData) — sem campos novos
- Steps existentes — nenhuma modificação de lógica
- useProjectsForWizard — campo milestones é opcional, consumidores existentes continuam funcionando

