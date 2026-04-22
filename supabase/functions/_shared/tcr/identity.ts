import type { TcrSection } from "./types.ts";

export const identitySection: TcrSection = {
  title: "5. Convenção de Identidade",
  content: `
### 5.1 Dois IDs, Dois Contextos

| ID | Tabela | Uso |
|----|--------|-----|
| \`auth.users.id\` | \`auth.users\` | Autenticação, notificações, memberships |
| \`profiles.id\` | \`public.profiles\` | UI, relações de negócio, exibição |

### 5.2 Regras de Uso

1. **UI e Exibição**: Sempre use \`profiles.id\`
2. **FK para dados de usuário**: Use \`profiles.id\`
3. **Notificações**: Use \`auth.users.id\` em \`recipient_user_id\`
4. **Memberships/Auth**: Use \`auth.users.id\`

### 5.3 Conversão Entre IDs

\`\`\`typescript
// profile_id → user_id
const { data } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('id', profileId)
  .single();

// user_id → profile_id
const { data } = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', authUserId)
  .single();
\`\`\`
`,
};
