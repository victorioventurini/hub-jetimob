import type { TcrSection } from "./types.ts";

export const architectureSection: TcrSection = {
  title: "1. Visão Geral da Arquitetura",
  content: `
### 1.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS + shadcn/ui |
| **Estado** | TanStack Query (React Query) |
| **Roteamento** | React Router DOM v6 |
| **Backend** | Supabase (Lovable Cloud) |
| **Banco de Dados** | PostgreSQL |
| **Autenticação** | Supabase Auth (Magic Link via email) |
| **Storage** | Supabase Storage |
| **Funções Serverless** | Supabase Edge Functions (Deno) |
| **IA** | Lovable AI (Google Gemini / OpenAI) |

### 1.2 Modelo de Autenticação

- **Método:** Magic Link (link de acesso via email)
- **Validação de Domínio:** Usuários só podem fazer login se o domínio do email estiver cadastrado em uma BU ativa
- **Fluxo:**
  1. Usuário insere email
  2. Sistema valida se domínio pertence a uma BU ativa
  3. **Para usuários internos:** Verifica se existe perfil pré-cadastrado em \`profiles\`
  4. Se válido, gera Magic Link via \`supabase.auth.admin.generateLink()\`
  5. Envia link por email via SendGrid (com Resend como fallback)
  6. Usuário clica no link e é redirecionado para \`/auth/callback\`
  7. \`AuthCallback.tsx\` verifica o \`token_hash\` via \`supabase.auth.verifyOtp()\` para estabelecer sessão
  8. Profile é criado automaticamente via trigger \`handle_new_user()\` (se não existir)

> **Nota (v2.65.0):** O sistema usa Magic Link com \`token_hash\` no URL (não hash fragment) para evitar problemas com SendGrid click tracking.

> **Nota (v2.43.0):** Usuários internos (domínio em \`allowed_email_domains\`) agora precisam ter perfil pré-cadastrado para receber Magic Link. Impede acesso não autorizado via domínio válido.

### 1.3 Conceito Multi-BU (Business Units)

O Hub é uma plataforma **multi-tenant** onde cada empresa/unidade de negócio opera de forma isolada:

- Cada BU tem seu próprio conjunto de usuários, times, OKRs, KPIs, etc.
- Um usuário pode pertencer a **múltiplas BUs** (via \`bu_user_memberships\`)
- Uma BU é definida por \`is_default = true\` como padrão do usuário
- Dados são escopados por BU através de RLS policies
- Cada BU pode ter cores, logo e configurações personalizadas

### 1.4 Controle de Permissões

#### Roles do Sistema

| Role | Descrição | Acesso |
|------|-----------|--------|
| \`super_admin\` | Administrador global da plataforma | Acesso total a todas as BUs |
| \`admin\` | Administrador | Acesso administrativo (pode gerenciar estrutura) |

> **Nota:** super_admin e admin recebem wildcard \`['*']\` em permissões.

#### Roles por BU

| Role | Descrição |
|------|-----------|
| \`admin\` | Admin local da BU (acesso total dentro da BU) |
| \`collaborator\` | Colaborador da BU (acesso via grupos de permissão) |

#### Funções de Autorização (RLS)

| Função | Descrição |
|--------|-----------|
| \`is_platform_admin(user_id)\` | Verifica se é \`super_admin\` ou \`admin\` global |
| \`is_super_admin(user_id)\` | Verifica se é apenas \`super_admin\` |
| \`is_bu_admin(user_id, bu_id)\` | Verifica se é admin da BU específica |
| \`user_has_bu_access(user_id, bu_id)\` | Verifica se tem membership na BU |
| \`has_role(user_id, role)\` | Verifica se possui uma role específica |
| \`get_my_permissions(bu_id)\` | Retorna array de permission keys do usuário |

#### Funções de Hierarquia de Times (v2.2+)

| Função | Descrição |
|--------|-----------|
| \`is_team_leader(user_id, team_id)\` | Verifica se usuário é líder DIRETO do time |
| \`team_is_ancestor(ancestor_id, team_id)\` | Verifica se um time é ancestral de outro |
| \`team_is_descendant(team_id, ancestor_id)\` | Verifica se um time é descendente de outro |
| \`user_can_manage_team(user_id, team_id)\` | Regra FINAL: líder direto OU admin/super_admin |
| \`get_manageable_teams(user_id, bu_id)\` | Retorna IDs dos times que o usuário pode gerenciar |

**Regras de Gestão de Times:**
- ✅ Líder pode gerenciar APENAS o próprio time e times filhos diretos
- ❌ Líder NÃO pode gerenciar time pai
- ❌ Líder NÃO pode gerenciar times irmãos
- ❌ Líder NÃO pode gerenciar times de outros ramos
`,
};
