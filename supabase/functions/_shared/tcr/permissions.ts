import type { TcrSection } from "./types.ts";

export const permissionsSection: TcrSection = {
  title: "7. Sistema de Permissões V2",
  content: `
### 7.1 Modelo de Permissões

O sistema usa **permission keys** granulares organizadas por módulo e surface:

\`\`\`
{module}.{surface}.{action}
\`\`\`

Exemplos:
- \`okrs.team.view\`
- \`okrs.team.checkin\`
- \`admin.users.manage\`

### 7.2 Templates

Templates são conjuntos de permission keys:

| Tabela | Descrição |
|--------|-----------|
| \`permission_templates_v2\` | Definições de templates |
| \`permission_template_items_v2\` | Keys de cada template |
| \`user_permission_templates_v2\` | Atribuições de templates a usuários |

### 7.3 Verificação de Permissão

\`\`\`typescript
// No frontend
const { hasPermission } = useAuth();
if (hasPermission('okrs.team.checkin')) {
  // pode fazer check-in
}

// No backend (RLS)
SELECT * FROM okr_checkins
WHERE has_permission_key(auth.uid(), bu_id, 'okrs.team.checkin');
\`\`\`

### 7.4 Surfaces

| Surface | Descrição |
|---------|-----------|
| \`base\` | Acesso mínimo |
| \`view\` | Visualização |
| \`operate\` | Operação (criar, editar) |
| \`administer\` | Administração |
| \`restricted\` | Acesso limitado (externos) |
`,
};
