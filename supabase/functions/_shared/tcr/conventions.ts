import type { TcrSection } from "./types.ts";

export const conventionsSection: TcrSection = {
  title: "4. Convenções de Código",
  content: `
### 4.1 Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | \`ObjectiveCard.tsx\` |
| Hooks | camelCase com \`use\` | \`useTeamOkrs.ts\` |
| Utilitários | camelCase | \`formatDate.ts\` |
| Tipos | PascalCase | \`TeamObjective\` |
| Constantes | UPPER_SNAKE | \`MAX_CHECKINS\` |

### 4.2 Query Keys

Use o padrão centralizado em \`src/lib/queryKeys/\`:

\`\`\`typescript
// src/lib/queryKeys/okrs.ts
export const okrKeys = {
  all: ['okrs'] as const,
  orgObjectives: (cycleId: string) => [...okrKeys.all, 'org', cycleId] as const,
  teamObjectives: (teamId: string, cycleId: string) => 
    [...okrKeys.all, 'team', teamId, cycleId] as const,
};
\`\`\`

### 4.3 Supabase Queries

- Nunca use \`select('*')\` — sempre especifique colunas
- Use tipagem com \`.returns<T>()\` quando necessário
- Sempre verifique \`error\` antes de usar \`data\`

\`\`\`typescript
// ✅ Correto
const { data, error } = await supabase
  .from('okr_team_objectives')
  .select('id, title, status')
  .eq('team_id', teamId);

// ❌ Incorreto
const { data } = await supabase
  .from('okr_team_objectives')
  .select('*');
\`\`\`

### 4.4 RLS Policies

- Todo dado operacional deve ser BU-scoped
- Use \`auth.uid()\` apenas para comparar com \`user_id\` de auth.users
- Para dados de domínio, use profile_id via subquery

\`\`\`sql
-- ✅ Correto para dados BU-scoped
CREATE POLICY "users_bu_data" ON my_table
  USING (bu_id IN (
    SELECT bu_id FROM bu_user_memberships WHERE user_id = auth.uid()
  ));

-- ❌ Incorreto - comparando auth.uid() com profile_id
CREATE POLICY "wrong" ON my_table
  USING (profile_id = auth.uid());
\`\`\`
`,
};
