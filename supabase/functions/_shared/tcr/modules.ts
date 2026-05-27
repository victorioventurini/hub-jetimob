import type { TcrSection } from "./types.ts";

export const modulesSection: TcrSection = {
  title: "3. Módulos do Next",
  content: `
### 3.1 Módulos Ativos

| Módulo | Descrição |
|--------|-----------|
| **Home** | Dashboard personalizado com resumo e ações rápidas |
| **OKRs** | Gestão de Objetivos e Key Results (org + time) |
| **KPIs** | Métricas e indicadores de performance |
| **Tickets** | Sistema de chamados internos |
| **Assets** | Inventário de ativos (patrimônio, chaves, brindes) |
| **Projects** | Iniciativas estratégicas com marcos (milestones) e vínculo a KRs |
| **Admin** | Configurações, usuários, permissões |
| **Notifications** | Central de notificações multi-canal |
| **Automations** | Webhooks e integrações externas |

### 3.2 Estrutura de Arquivos

\`\`\`
src/
├── modules/
│   ├── okrs/
│   │   ├── components/
│   │   │   ├── checkin/          # CheckinDialog modularizado (v2.44.0)
│   │   │   └── team-objective-form/  # TeamObjectiveFormDialog modularizado (v2.44.0)
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── types/
│   ├── kpis/
│   ├── tickets/
│   ├── assets/
│   │   └── components/
│   │       └── inventory/
│   │           └── form/         # InventoryFormDialog modularizado (v2.44.0)
│   ├── home/
│   ├── admin/
│   ├── notifications/
│   └── permissions/
├── components/
│   └── ui/           # shadcn/ui components
├── hooks/            # Hooks globais
├── lib/              # Utilitários
└── integrations/
    └── supabase/     # Cliente e tipos gerados
\`\`\`

### 3.3 Refatorações de Sustentabilidade (v2.44.0)

Arquivos grandes refatorados para manter limites de código:

| Componente Original | Antes | Depois | Estrutura |
|---------------------|-------|--------|-----------|
| \`InventoryFormDialog.tsx\` | 707 linhas | 85 linhas | \`form/schema\`, \`form/fields\`, \`form/hook\` |
| \`CheckinDialog.tsx\` | 593 linhas | 140 linhas | \`checkin/context\`, \`checkin/progress\`, \`checkin/status\`, \`checkin/reflection\` |
| \`TeamObjectiveFormDialog.tsx\` | 658 linhas | 115 linhas | \`team-objective-form/types\`, \`team-objective-form/fields\`, \`team-objective-form/hook\` |

### 3.4 Projects — Autoridade sobre Milestones (v2026-04-27)

Defesa em 4 camadas para soft-delete de marcos (\`project_milestones\`):

1. **UI gating** — \`useProjectPermissionsV2.canDeleteMilestoneRecord(...)\`
2. **Hook** — \`useSoftDeleteMilestone\` filtra \`bu_id\`, faz \`.select()\` e detecta 0 rows
3. **RLS** — policies \`project_milestones_update\` / \`project_milestones_delete\`
4. **Trigger DB** — \`enforce_milestone_soft_delete_authority\` (BEFORE UPDATE OF deleted_at)

| Ação | Quem pode |
|------|-----------|
| **Editar marco** (qualquer campo exceto \`deleted_at\`) | Project owner OU milestone owner OU líder do project owner OU bu admin OU \`projects.milestone.update:bu\` |
| **Remover marco** (soft-delete via \`deleted_at\`) | Project owner OU líder do project owner OU bu admin OU \`projects.milestone.delete:bu\` |

⚠️ Milestone owner **não pode remover** o próprio marco — apenas editar. Tentativa retorna \`ERRCODE 42501\` com mensagem \`INSUFFICIENT_PRIVILEGE: only the project owner can remove milestones\`.

Ver canônico: \`mem://features/projects/milestone-permissions-row-aware\`.
`,
};
