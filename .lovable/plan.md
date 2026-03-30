

# Plano: Projetos e Milestones detalhados nos wizards MBR, QBR Pre e C-Level

## Validação TCR & Docs Canônicos ✓

| Doc | Status | Notas |
|-----|--------|-------|
| TCR v3.20.0 | ✓ | Projects v1.4, milestone_status enum, project_teams join |
| WIZARD_DEVELOPMENT_GUIDE | ✓ | WizardStepScaffold + WizardStepHeader + WizardStepFooter |
| wizard-ritual-integration-standard | ✓ | Integração aditiva via ProjectsSummary, sem alterar draft |
| BU_SCOPED_SUPABASE_RULES | ✓ | useOptionalBuClient no useProjectsForWizard |
| component-reuse-philosophy | ✓ | Reutilizar ProjectsSummary estendido, não duplicar |
| mbr-ritual-specification | ✓ | MBR opera sem seleção de time; detail step navega 1-de-N |
| qbr-ritual-standard | ✓ | QBR Pre é team-scoped via ?team=UUID |

## Análise de Pertinência por Wizard

| Wizard | Team context? | Já tem projetos? | Ação |
|--------|--------------|-------------------|------|
| **MBR** (team-okrs-detail) | Sim (1-de-N) | `ProjectsSummary mode="review"` (compacto) | **Expandir** para mostrar milestones inline |
| **QBR Pre** (líder) | Sim (?team=UUID) | Nenhum | **Adicionar** bloco aditivo no step "Balanço" |
| **C-Level Check-in** | Não (org-level) | Nenhum | **Não implementar** — sem team_id, projetos são team-scoped |
| QBR Pre C-Level | Não (consolidação) | Nenhum | Não implementar — lê submissions dos líderes |
| QBR Meeting | Stub | Nenhum | Não implementar — em construção |
| QBR Post | Não (promoção) | Nenhum | Não implementar — operacional |

**Decisão:** Implementar em **MBR** e **QBR Pre**. C-Level Check-in não tem `teamId` — adicionar projetos sem escopo de time violaria o modelo de dados (projects são vinculados via `project_teams`). Forçar exibição de todos os projetos da BU no C-Level seria ruidoso e fora do propósito estratégico do rito.

## Estratégia de Implementação

Ao invés de criar componentes separados para cada wizard, a abordagem é **estender o `ProjectsSummary` existente** com um novo modo `"detail"` que exibe milestones inline com `MilestoneStatusSelect` — reutilizando o padrão já implementado no `LeaderProjectsStep`. Isso segue o `component-reuse-philosophy`.

## Alterações

### 1. Estender `ProjectsSummary` com modo `"detail"`

**Arquivo:** `src/modules/projects/components/ProjectsSummary.tsx`

- Adicionar modo `"detail"` ao tipo de `mode`
- Quando `mode="detail"`, renderizar para cada projeto:
  - `ProjectHealthBadge` + `ProjectStatusBadge` + nome
  - `ProjectProgressBar` com percentual
  - Prazo (com destaque se vencido)
  - Link externo
  - **Milestones pendentes** com `MilestoneStatusSelect` inline (fire-and-forget via `useUpdateMilestone`)
  - Notas de milestone via tooltip
  - Empty state para projetos sem milestones
- Modos existentes (`checkin`, `prep`, `review`) permanecem inalterados

### 2. Atualizar MBR Team Detail Step

**Arquivo:** `src/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep.tsx`

- Trocar `mode="review"` por `mode="detail"` na chamada a `ProjectsSummary` (linha 293)
- Resultado: milestones agora visíveis e editáveis inline dentro do drill-down de cada time

### 3. Adicionar ProjectsSummary ao QBR Pre — step "Balanço"

**Arquivo:** `src/modules/okrs/components/wizards/qbr-pre/QbrBalanceStep.tsx`

- Receber novo prop opcional `teamId?: string`
- Adicionar `<ProjectsSummary teamId={teamId} mode="detail" />` como bloco aditivo ao final do conteúdo scrollável
- Integração aditiva: não altera draft, não altera flow

**Arquivo:** `src/modules/okrs/pages/QbrPrePage.tsx`

- Passar `teamId={teamIdParam}` ao `Q