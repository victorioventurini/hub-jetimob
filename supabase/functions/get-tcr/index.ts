import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// TCR Content embedded - Version 2.5.0
const TCR_VERSION = "2.5.0";
const TCR_UPDATED_AT = "2026-01-07";

const TCR_SECTIONS: Record<string, { title: string; content: string }> = {
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
| **Autenticação** | Supabase Auth (Magic Link via SendGrid) |
| **Storage** | Supabase Storage |
| **Funções Serverless** | Supabase Edge Functions (Deno) |
| **IA** | Lovable AI (Google Gemini / OpenAI) |

### 1.2 Modelo de Autenticação

- **Método:** Magic Link (OTP via email)
- **Validação de Domínio:** Usuários só podem fazer login se o domínio do email estiver cadastrado em uma BU ativa
- **Fluxo:**
  1. Usuário insere email
  2. Sistema valida se domínio pertence a uma BU ativa
  3. Se válido, envia Magic Link via SendGrid
  4. Usuário clica no link e é autenticado
  5. Profile é criado automaticamente via trigger \`handle_new_user()\`

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

| Módulo | Slug | Objetivo | Status |
|--------|------|----------|--------|
| **Home** | - | Dashboard pessoal com OKRs, aniversários, cultura | ✅ Ativo |
| **OKRs** | \`okrs\` | Gestão de Objectives e Key Results | ✅ Ativo |
| **KPIs** | \`kpis\` | Indicadores de performance | ✅ Ativo |
| **Times** | \`teams\` | Estrutura organizacional | ✅ Ativo |
| **Assets** | \`assets\` | Patrimônio (Inventário, Chaves, Brindes) | ✅ Ativo |
| **Integrações** | \`integrations\` | Gerenciamento de integrações e agentes IA | ✅ Ativo |
| **Automações** | \`automations\` | Webhooks de entrada/saída | ✅ Ativo |
| **Vic** | \`vic\` | Assistente de IA contextual | ✅ Ativo |
| **Tickets** | \`tickets\` | Sistema de tickets com routing e parceiros | ✅ Ativo |
| **BU Management** | \`bu\` | Gerenciamento de Business Units | ✅ Ativo (admin) |

### 3.2 Módulos em Desenvolvimento

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Feedbacks | 🚧 Planejado | Ciclos de feedback e avaliação |
| Pesquisas | 🚧 Planejado | Pesquisas de clima e engajamento |
`,
  },
  "business-rules": {
    title: "4. Regras de Negócio Críticas",
    content: `
### 4.1 Escopo por BU

⚠️ **REGRA FUNDAMENTAL: Todo dado operacional é escopado por BU.**

- Usuários só veem dados da(s) BU(s) que pertencem
- RLS policies garantem isolamento no banco
- Frontend sempre filtra por \`currentBuId\`

### 4.2 Multi-BU

- Um usuário pode pertencer a múltiplas BUs
- Cada usuário tem uma BU padrão (\`is_default = true\`)
- O usuário pode alternar entre BUs no seletor
- Ao trocar de BU, todos os dados são recarregados

### 4.2.1 BU Scope Enforcement (v2.4+)

⚠️ **REGRA CRÍTICA: Toda operação INSERT/UPDATE/DELETE em tabelas operacionais é validada no banco.**

**Funções SQL:**
| Função | Descrição |
|--------|-----------|
| \`current_bu_id()\` | Retorna BU ativa. **NUNCA retorna NULL** — lança \`NO_BU_CONTEXT\` se inválido. |
| \`is_current_bu(bu_id)\` | Helper RLS: retorna \`true\` se \`bu_id\` = \`current_bu_id()\`. |
| \`assert_bu_scope(bu_id)\` | Valida BU em triggers. Exceções: \`MISSING_BU_ID\`, \`NO_BU_CONTEXT\`, \`BU_SCOPE_VIOLATION\`. |

**Triggers:** \`enforce_bu_scope_trigger\` aplicado em 20+ tabelas operacionais (OKRs, Teams, Assets, Tickets, KPIs).

**RLS Hardening:** Todas policies incluem \`user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)\`.

**Frontend:**
- Hook \`useBuScopedSupabase()\` injeta header \`x-current-bu-id\` automaticamente
- Helper \`withBuId(payload, buId)\` para inserts/updates

**Scanner:** \`npx tsx scripts/audit-bu-scope.ts\` detecta operações sem \`bu_id\`.

### 4.3 Hierarquia de Times

- Líder pode gerenciar APENAS seu próprio time e filhos diretos
- Admins podem gerenciar qualquer time da BU
- Super_admins podem gerenciar qualquer time de qualquer BU
- Funções SQL: \`is_team_leader()\`, \`user_can_manage_team()\`, \`get_manageable_teams()\`

### 4.4 Limites de OKRs

- **Máximo 3 objetivos ativos** por time
- **Máximo 3 KRs** por objetivo
- Validado via triggers no banco

### 4.5 Cálculo de Progresso de KR

\`\`\`typescript
function calculateProgress(baseline, current, target, direction) {
  if (direction === 'up') {
    return ((current - baseline) / (target - baseline)) * 100;
  } else {
    return ((baseline - current) / (baseline - target)) * 100;
  }
}
\`\`\`

### 4.6 RAG Status (Semáforo)

| Status | Condição |
|--------|----------|
| 🟢 Green | Progresso ≥ 70% do esperado para o período |
| 🟡 Yellow | Progresso entre 40-70% do esperado |
| 🔴 Red | Progresso < 40% do esperado |
| ⚪ Not Started | Sem progresso registrado |

### 4.7 Tipos de KR

| Tipo | Descrição |
|------|-----------|
| \`contribution\` | Contribui diretamente para KR organizacional |
| \`enabler\` | Habilita/suporta outros KRs |
| \`foundational\` | Fundacional para o funcionamento |

### 4.8 Check-ins

- Check-ins são obrigatórios para mover KRs
- Frequência sugerida: semanal
- Suportam menções (@usuario)
- Atualizam automaticamente \`current_value\` e \`last_checkin_at\` do KR

### 4.9 Histórico e Soft Delete

⚠️ **REGRA: Dados críticos nunca são apagados fisicamente.**

- Registros usam \`deleted_at\` para soft delete
- Audit logs registram todas as alterações
- \`okr_audit_log\` para OKRs, \`audit_logs\` para demais
`,
  },
  links: {
    title: "5. Padrão de Links e URLs",
    content: `
### 5.1 Regra Fundamental

⚠️ **URLs operacionais NÃO contêm buId. BU ativa vem do contexto de sessão.**

### 5.2 Links Compartilháveis (Padrão Oficial)

Todo link externo, compartilhável, notificação ou busca global DEVE usar:
\`\`\`
/go/:entity/:id
\`\`\`

**Helper centralizado:** \`src/lib/shareableLinks.ts\`
\`\`\`typescript
import { getShareableUrl, getShareableAbsoluteUrl } from '@/lib/shareableLinks';

// Retorna: /go/asset/uuid-aqui
getShareableUrl('asset', assetId);

// Retorna: https://hub.jetimob.com/go/asset/uuid-aqui  
getShareableAbsoluteUrl('asset', assetId);
\`\`\`

**Entidades suportadas:**
| Entity | Rota Interna |
|--------|--------------|
| \`asset\` | \`/assets/inventory/:id\` |
| \`team\` | \`/teams/:id\` |
| \`user\` | \`/users/:id\` |
| \`ticket\` | \`/tickets/:id\` |
| \`okr_org_objective\` | \`/okrs/org/:id\` |
| \`okr_team_objective\` | \`/okrs/team/:id\` |
| \`keyring\` | \`/assets/keys/keyring/:id\` |
| \`gift\` | \`/assets/gifts/:id\` |
| \`kpi\` | \`/kpis/:id\` |

### 5.3 Compatibilidade com QR Codes Físicos

⚠️ **CRÍTICO: A rota /assets/:code NUNCA pode ser quebrada (etiquetas já impressas)**

| Rota | Usuário Logado | Usuário Não Logado |
|------|----------------|-------------------|
| \`/assets/0146\` | Resolve BU → redireciona para \`/go/asset/:uuid\` | Renderiza \`/p/assets/0146\` (público) |
| \`/p/assets/0146\` | Página pública | Página pública |

**SQL Functions:**
- \`normalize_asset_code(code)\`: remove não-dígitos, aplica LPAD(4)
- \`resolve_asset_by_code_for_bu(bu_id, code)\`: resolve asset UUID dentro de uma BU
- \`resolve_asset_by_code_global(code)\`: resolve asset UUID + bu_id globalmente
`,
  },
  integrations: {
    title: "6. Eventos e Integrações",
    content: `
### 6.1 Eventos Emitidos (Outbound)

| Evento | Payload | Quando |
|--------|---------|--------|
| \`user.created\` | Profile completo | Novo usuário cadastrado |
| \`user.updated\` | Campos alterados | Perfil atualizado |
| \`team.created\` | Dados do time | Time criado |
| \`team.member_added\` | user_id, team_id | Membro adicionado |
| \`okr.objective_created\` | Objetivo completo | Novo objetivo |
| \`okr.kr_created\` | KR completo | Novo KR |
| \`okr.checkin_created\` | Check-in + KR | Check-in feito |
| \`kpi.value_added\` | KPI + valor | Valor registrado |
| \`kpi.threshold_breached\` | KPI + status | KPI em risco |

### 6.2 Ações Recebidas (Inbound)

| Ação | Payload | Resultado |
|------|---------|-----------|
| \`kpi.add_value\` | kpi_id, value, date | Registra valor |
| \`kr.update_value\` | kr_id, value | Atualiza KR |
| \`kr.add_checkin\` | kr_id, value, notes | Cria check-in |

### 6.3 Integrações Ativas e Planejadas

| Integração | Status | Uso |
|------------|--------|-----|
| SendGrid | ✅ Ativo | Emails (magic link, notificações) |
| Google Maps | ✅ Ativo | Autocomplete de cidades |
| Lovable AI | ✅ Ativo | Agentes Vic |
| Slack | 🚧 Planejado | Notificações e comandos |
| n8n | 🚧 Planejado | Automações complexas |
| Google Sheets | 🚧 Planejado | Import/export de KPIs |
`,
  },
  notifications: {
    title: "10. Central de Notificações",
    content: `
### 10.1 Arquitetura

A Central de Notificações segue modelo de **governança em 3 níveis**:

| Nível | Escopo | Responsabilidade |
|-------|--------|------------------|
| **Global** | Plataforma | Catálogo de eventos e canais |
| **BU** | Business Unit | Configuração de canais (Slack, etc) |
| **Usuário** | Individual | Preferências pessoais |

### 10.2 Tabelas

| Tabela | Escopo | Descrição |
|--------|--------|-----------|
| \`notification_events\` | Global | Catálogo de eventos (18 padrão) |
| \`notification_channels\` | Global | Canais disponíveis (in_app, email, slack, whatsapp, webhook) |
| \`bu_notification_channels\` | BU | Configuração de canais por BU |
| \`user_notification_preferences_v2\` | Usuário+BU | Preferências por evento/canal |
| \`notification_outbox\` | BU | Fila de envio assíncrono |
| \`notifications\` | Usuário | Notificações in-app |

### 10.3 Função de Emissão

\`\`\`sql
-- Emite evento para múltiplos destinatários
emit_notification_event(
  p_event_slug text,
  p_bu_id uuid,
  p_recipient_ids uuid[],
  p_title text,
  p_message text,
  p_context_type text,
  p_context_id uuid,
  p_context_url text,
  p_metadata jsonb
)
\`\`\`

**Fluxo:**
1. Valida evento existe e está ativo
2. Para cada destinatário:
   - Verifica se é usuário externo (partner_contact)
   - Filtra por audiência (internal/external/both)
   - Consulta preferências pessoais
   - Ignora preferências se evento é obrigatório
   - Gera \`notification\` (in_app) e/ou \`notification_outbox\` (outros canais)

### 10.4 Eventos Padrão

| Módulo | Eventos |
|--------|---------|
| Core | \`user.mentioned\`, \`user.welcomed\` |
| OKRs | \`okr.checkin.created\`, \`okr.kr.updated\`, \`okr.objective.completed\` |
| Tickets | \`ticket.created\`, \`ticket.assigned\`, \`ticket.status_changed\`, \`ticket.commented\`, \`ticket.resolved\` |
| Assets | \`asset.assigned\`, \`asset.returned\`, \`asset.maintenance_due\` |
| Teams | \`team.member_added\`, \`team.member_removed\`, \`team.leader_changed\` |
| KPIs | \`kpi.threshold_breached\`, \`kpi.value_added\`, \`kpi.target_achieved\` |

### 10.5 Frontend

| Rota | Acesso | Função |
|------|--------|--------|
| \`/hub/notifications\` | super_admin | Gerenciar eventos e canais globais |
| \`/settings/notifications\` | admin BU | Configurar canais da BU |
| \`/me/notifications\` | usuário | Preferências pessoais |

**Hook:**
\`\`\`typescript
import { useNotificationCenter } from '@/hooks/useNotificationCenter';

const { 
  events, channels, buChannels, userSettings,
  emitEvent, setUserPreference 
} = useNotificationCenter();
\`\`\`

### 10.6 Edge Function: process-notification-outbox

Processa fila de envio com retry automático:
- SendGrid para emails (fallback Resend)
- Slack/WhatsApp placeholders prontos
- Exponential backoff em falhas
- Máximo 3 retries
`,
  },
  "technical-debt": {
    title: "7. Débito Técnico e Limitações",
    content: `
### 7.1 Débito Técnico Conhecido

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Tipagem parcial | Alguns componentes sem TypeScript completo | Baixa |
| Testes | Cobertura de testes ainda baixa | Alta |

### 7.2 Limitações Atuais

- **Sem SSO/SAML:** Apenas magic link
- **Sem mobile app:** Web responsivo apenas
- **Sem modo offline:** Requer conexão constante
- **Edge Functions:** Timeout de 60s

### 7.3 Decisões Temporárias

| Decisão | Motivo | Quando revisar |
|---------|--------|----------------|
| Magic link único | Simplicidade de MVP | Quando precisar SSO |
| Todos os módulos visíveis | Simplicidade | Quando tiver módulos pagos |
`,
  },
  conventions: {
    title: "8. Convenções de Código",
    content: `
### 8.1 Estrutura de Arquivos

\`\`\`
src/
├── components/          # Componentes compartilhados
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Header, Sidebar, etc.
│   └── selects/        # Selects reutilizáveis
├── modules/            # Módulos de negócio
│   └── [module]/
│       ├── components/ # Componentes do módulo
│       ├── hooks/      # Hooks do módulo
│       ├── pages/      # Páginas do módulo
│       ├── types.ts    # Tipos do módulo
│       └── index.ts    # Exports públicos
├── hooks/              # Hooks globais
├── contexts/           # Contextos React
├── pages/              # Páginas principais
└── integrations/       # Integrações (Supabase)
\`\`\`

### 8.2 Nomenclatura

- **Componentes:** PascalCase (\`TeamCard.tsx\`)
- **Hooks:** camelCase com prefixo \`use\` (\`useTeams.ts\`)
- **Tipos:** PascalCase (\`OkrTeamObjective\`)
- **Enums:** camelCase ou snake_case no banco
- **Tabelas:** snake_case (\`okr_team_objectives\`)

### 8.3 Estilização

- Usar tokens semânticos do Tailwind (\`bg-primary\`, não \`bg-blue-500\`)
- Cores definidas em \`index.css\` e \`tailwind.config.ts\`
- Componentes shadcn/ui como base
- Variantes com \`cva\` quando necessário

### 8.4 Edge Functions

| Função | Descrição |
|--------|-----------|
| \`request-magic-link\` | Solicita magic link via SendGrid |
| \`search-cities\` | Autocomplete de cidades (Google Maps) |
| \`culture-message\` | Gera mensagem de cultura (IA) |
| \`invoke-vic\` | Invoca agentes Vic |
| \`process-agent-document\` | Processa documentos para RAG |
| \`get-tcr\` | Expõe o TCR via API |
| \`global-search\` | Busca multi-contexto |
| \`get-public-asset\` | Dados públicos de asset |

### 8.5 Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| \`avatars\` | ✅ Sim | Fotos de perfil |
| \`bu-assets\` | ✅ Sim | Logos e símbolos de BUs |
| \`agent-documents\` | ❌ Não | Documentos para RAG de agentes |
`,
  },
  permissions: {
    title: "9. Sistema de Permissões",
    content: `
### 9.1 Arquitetura

- **Tabela de catálogo único**: \`permission_catalog\` com todas as permissões disponíveis
- **Grupos de permissões**: \`permission_groups\` para agrupamento
- **Overrides por usuário**: \`bu_user_permission_overrides\` para exceções

### 9.2 Função Central

\`\`\`sql
-- Retorna array de permission keys para o usuário na BU
get_my_permissions(p_bu_id uuid) → text[]
\`\`\`

**Retorna:**
- \`['*']\` para super_admin e admin
- Array de permission keys para demais usuários

### 9.3 Frontend

**Hook único:**
\`\`\`typescript
import { usePermissions } from '@/hooks/usePermissions';

const { has, hasAny, hasAll, isWildcard, isLoading } = usePermissions();

// Checagens
has('okrs.manage');
hasAny(['okrs.view', 'okrs.manage']);
hasAll(['assets.inventory.view', 'assets.inventory.manage']);
\`\`\`

**Guard único:**
\`\`\`tsx
import { RequirePermission } from '@/components/auth/RequirePermission';

<RequirePermission permission="okrs.manage">
  <EditOkrButton />
</RequirePermission>

<RequirePermission permissions={['okrs.view', 'kpis.view']} requireAll={false}>
  <DashboardCard />
</RequirePermission>
\`\`\`

### 9.4 Interfaces

| Rota | Descrição | Acesso |
|------|-----------|--------|
| \`/hub/permissions\` | Gerenciar catálogo global | super_admin |
| \`/settings/permissions\` | Gerenciar permissões por usuário/grupo na BU | admin |
`,
  },
};

function buildFullTcr(): string {
  const header = `# Technical Context Registry (TCR) — Hub da Jet

**Versão:** ${TCR_VERSION}  
**Última atualização:** ${TCR_UPDATED_AT}  
**Responsável:** Lovable AI / Equipe de Engenharia

---

`;

  const sections = Object.values(TCR_SECTIONS)
    .map((s) => `## ${s.title}\n${s.content}`)
    .join("\n\n---\n\n");

  const footer = `
---

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API Key
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("TCR_API_KEY");

  if (!expectedKey) {
    console.error("TCR_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn("Unauthorized TCR access attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid or missing API key" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const section = url.searchParams.get("section");

    console.log(`TCR v${TCR_VERSION} request - Section: ${section || "full"}`);

    let content: string;
    let title: string;

    if (section && TCR_SECTIONS[section]) {
      // Return specific section
      const sectionData = TCR_SECTIONS[section];
      title = sectionData.title;
      content = `# Technical Context Registry (TCR) — Hub da Jet

**Versão:** ${TCR_VERSION}  
**Seção:** ${title}

---

## ${title}
${sectionData.content}

---

_Para o TCR completo, omita o parâmetro \`section\`._
`;
    } else if (section) {
      // Invalid section
      const validSections = Object.keys(TCR_SECTIONS).join(", ");
      return new Response(
        JSON.stringify({
          error: `Invalid section: ${section}`,
          valid_sections: validSections,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Return full TCR
      content = buildFullTcr();
      title = "Full TCR";
    }

    console.log(`Returning TCR: ${title}`);

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "X-TCR-Version": TCR_VERSION,
      },
    });
  } catch (error) {
    console.error("Error processing TCR request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
