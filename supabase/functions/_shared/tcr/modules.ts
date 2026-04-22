import type { TcrSection } from "./types.ts";

export const modulesSection: TcrSection = {
  title: "3. Módulos do Hub",
  content: `
### 3.1 Módulos Ativos

| Módulo | Descrição |
|--------|-----------|
| **Home** | Dashboard personalizado com resumo e ações rápidas |
| **OKRs** | Gestão de Objetivos e Key Results (org + time) |
| **KPIs** | Métricas e indicadores de performance |
| **Tickets** | Sistema de chamados internos |
| **Assets** | Inventário de ativos (patrimônio, chaves, brindes) |
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
`,
};
