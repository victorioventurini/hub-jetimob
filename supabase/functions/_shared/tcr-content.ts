/**
 * Technical Context Registry (TCR) Content
 * 
 * This file contains the embedded TCR sections.
 * Extracted from get-tcr/index.ts for maintainability.
 * 
 * Version: 2.58.0
 * Updated: 2026-01-22
 */

export const TCR_VERSION = "3.14.0";
export const TCR_UPDATED_AT = "2026-03-25";

export interface TcrSection {
  title: string;
  content: string;
}

export const TCR_SECTIONS: Record<string, TcrSection> = {
  architecture: {
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
  },
  entities: {
    title: "2. Domínio de Dados",
    content: `
### 2.1 Entidades Principais

#### **bu_units** — Business Units
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome da BU |
| allowed_email_domains | text[] | Domínios permitidos para login |
| logo_url | text | URL do logo |
| primary_color | text | Cor primária (hex) |
| status | enum | \`active\`, \`inactive\` |

#### **profiles** — Perfis de Usuários
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| first_name | text | Nome |
| last_name | text | Sobrenome |
| display_name | text | Nome de exibição |
| work_email | text | Email corporativo |
| job_title | text | Cargo |
| team_id | uuid | FK para teams |
| onboarding_completed | bool | Onboarding concluído |

#### **bu_user_memberships** — Memberships por BU
| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | uuid | FK para auth.users |
| bu_id | uuid | FK para bu_units |
| role_in_bu | enum | Role dentro da BU específica |
| is_default | bool | Se é a BU padrão do usuário |

#### **teams** — Times
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do time |
| leader_user_id | uuid | Líder do time |
| parent_team_id | uuid | Time pai (hierarquia) |
| bu_id | uuid | FK para bu_units |

### 2.2 Módulo OKRs

#### **okr_org_objectives** — Objetivos Organizacionais
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| title | text | Título do objetivo |
| year | int | Ano do objetivo |
| owner_user_id | uuid | Responsável |
| status | enum | \`draft\`, \`active\`, \`completed\`, \`cancelled\` |
| bu_id | uuid | FK para bu_units |

#### **okr_team_key_results** — KRs de Time
| Campo | Tipo | Descrição |
|-------|------|-----------|
| team_objective_id | uuid | FK para objetivo do time |
| title | text | Título |
| type | enum | \`contribution\`, \`enabler\`, \`foundational\` |
| baseline | numeric | Valor inicial |
| current_value | numeric | Valor atual |
| target | numeric | Meta |
| direction | enum | \`up\`, \`down\` |
| status | enum | RAG status (\`green\`, \`yellow\`, \`red\`, \`not_started\`) |

#### **okr_checkins** — Check-ins de KRs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| kr_id | uuid | FK para team_key_results |
| current_value | numeric | Valor novo |
| confidence | enum | \`high\`, \`medium\`, \`low\` |
| blockers | text | Bloqueadores |
| comments | text | Comentários/menções |

### 2.3 Módulo KPIs

#### **kpi_metrics** — Métricas/KPIs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | text | Nome do KPI |
| category | enum | \`financeiro\`, \`growth\`, \`cs\`, \`produto\`, \`operacoes\`, \`pessoas\` |
| direction | enum | \`up\`, \`down\` |
| frequency | enum | \`daily\`, \`weekly\`, \`monthly\`, \`quarterly\`, \`manual\` |
| target_value | numeric | Meta |

#### **kpi_values** — Valores de KPIs
| Campo | Tipo | Descrição |
|-------|------|-----------|
| kpi_id | uuid | FK para kpi_metrics |
| value | numeric | Valor |
| reference_date | date | Data de referência |
| source | enum | \`manual\`, \`api\`, \`webhook\`, \`spreadsheet\`, \`database\` |
`,
  },
  modules: {
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
  },
  conventions: {
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
  },
  identity: {
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
  },
  agents: {
    title: "6. Agentes de IA",
    content: `
### 6.1 Arquitetura de Agentes

Os agentes são configurados na tabela \`ai_agents\` e invocados via edge function \`invoke-agent\`.

| Campo | Descrição |
|-------|-----------|
| \`slug\` | Identificador único do agente |
| \`integration_key\` | Qual LLM usar (ex: \`lovable-ai\`) |
| \`system_prompt\` | Prompt base do agente |
| \`output_format\` | \`text\`, \`json\`, \`structured\` |
| \`allowed_tools\` | Lista de tools disponíveis |

### 6.2 Agentes Ativos

| Slug | Descrição |
|------|-----------|
| \`vic\` | Assistente principal do Hub |
| \`okr-coach\` | Coach de OKRs |
| \`kr-advisor\` | Assistente de KRs |
| \`initiative-validator\` | Validador de iniciativas |

### 6.3 Invocação

\`\`\`typescript
const { data } = await supabase.functions.invoke('invoke-agent', {
  body: {
    agent_slug: 'okr-coach',
    context: { objective_id: '...' },
    user_message: 'Como melhorar este objetivo?',
  },
});
\`\`\`
`,
  },
  permissions: {
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
  },
  notifications: {
    title: "8. Sistema de Notificações",
    content: `
### 8.1 Arquitetura

1. **Evento** dispara insert em \`notification_outbox\`
2. **Cron** ou **trigger** processa a outbox
3. Edge function \`process-notification-outbox\` envia para canais

### 8.2 Canais Suportados

| Canal | Implementação |
|-------|---------------|
| \`in_app\` | Tabela \`notifications\` |
| \`email\` | SendGrid |
| \`slack\` | Webhook |
| \`webhook\` | HTTP POST |

### 8.3 Preferências

Usuários configuram preferências por evento e canal:

\`\`\`typescript
// user_notification_preferences
{
  user_id: 'uuid',
  event_slug: 'okr.checkin.created',
  channel: 'email',
  is_enabled: false, // opt-out
}
\`\`\`
`,
  },
};

/**
 * Build the full TCR document from all sections
 */
export function buildFullTcr(): string {
  const header = `# Technical Context Registry (TCR) — Hub da Jet

**Versão:** ${TCR_VERSION}  
**Última atualização:** ${TCR_UPDATED_AT}

---

> Este documento é a **fonte única de verdade** para desenvolvimento no Hub.
> Sempre consulte-o antes de tomar decisões de arquitetura ou implementação.

---

## Índice

${Object.entries(TCR_SECTIONS).map(([key, section]) => `- [${section.title}](#${key})`).join('\n')}

---

`;

  const sections = Object.entries(TCR_SECTIONS)
    .map(([, section]) => `## ${section.title}\n${section.content}\n---\n`)
    .join('\n');

  const footer = `
## Metadados

| Campo | Valor |
|-------|-------|
| **Versão do TCR** | ${TCR_VERSION} |
| **Data da última atualização** | ${TCR_UPDATED_AT} |
| **Endpoint** | \`GET /functions/v1/get-tcr\` |

---

## Uso com ChatGPT

Para usar este documento como contexto no ChatGPT:

1. Configure um Custom GPT com a action \`getTcr\`
2. Instrua: "Sempre consulte o TCR antes de gerar código"

**Prompt sugerido:**
\`\`\`
Você é um desenvolvedor sênior trabalhando no Hub da Jet.
Todas as decisões devem respeitar o TCR (Technical Context Registry) fornecido.
Se houver conflito ou ambiguidade, pergunte antes de prosseguir.
Priorize: segurança, consistência com padrões existentes, simplicidade.
\`\`\`
`;

  return header + sections + footer;
}
