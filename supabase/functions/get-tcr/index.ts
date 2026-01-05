import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// TCR Content embedded - Version 1.0.0
const TCR_VERSION = "1.0.0";
const TCR_UPDATED_AT = "2026-01-05";

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
| \`team_leader\` | Líder de time | Gerencia seu time e seus OKRs/KPIs |
| \`collaborator\` | Colaborador padrão | Acesso básico à sua BU |

#### Roles por BU

| Role | Descrição |
|------|-----------|
| \`ceo\` | CEO da BU (admin local) |
| \`admin\` | Admin local da BU |
| \`collaborator\` | Colaborador da BU |

#### Funções de Autorização (RLS)

| Função | Descrição |
|--------|-----------|
| \`is_platform_admin(user_id)\` | Verifica se é \`super_admin\` ou \`admin\` global |
| \`is_super_admin(user_id)\` | Verifica se é apenas \`super_admin\` |
| \`is_bu_admin(user_id, bu_id)\` | Verifica se é admin/ceo da BU específica |
| \`user_has_bu_access(user_id, bu_id)\` | Verifica se tem membership na BU |
| \`has_role(user_id, role)\` | Verifica se possui uma role específica |
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
| **Integrações** | \`integrations\` | Gerenciamento de integrações e agentes IA | ✅ Ativo |
| **Automações** | \`automations\` | Webhooks de entrada/saída | ✅ Ativo |
| **Vic** | \`vic\` | Assistente de IA contextual | ✅ Ativo |
| **BU Management** | \`bu\` | Gerenciamento de Business Units | ✅ Ativo (admin) |

### 3.2 Módulos em Desenvolvimento

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Patrimônio | 🚧 Planejado | Gestão de ativos patrimoniais |
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

### 4.3 Limites de OKRs

- **Máximo 3 objetivos ativos** por time
- **Máximo 3 KRs** por objetivo
- Validado via triggers no banco

### 4.4 Cálculo de Progresso de KR

\`\`\`typescript
function calculateProgress(baseline, current, target, direction) {
  if (direction === 'up') {
    return ((current - baseline) / (target - baseline)) * 100;
  } else {
    return ((baseline - current) / (baseline - target)) * 100;
  }
}
\`\`\`

### 4.5 RAG Status (Semáforo)

| Status | Condição |
|--------|----------|
| 🟢 Green | Progresso ≥ 70% do esperado para o período |
| 🟡 Yellow | Progresso entre 40-70% do esperado |
| 🔴 Red | Progresso < 40% do esperado |
| ⚪ Not Started | Sem progresso registrado |

### 4.6 Tipos de KR

| Tipo | Descrição |
|------|-----------|
| \`contribution\` | Contribui diretamente para KR organizacional |
| \`enabler\` | Habilita/suporta outros KRs |
| \`foundational\` | Fundacional para o funcionamento |

### 4.7 Check-ins

- Check-ins são obrigatórios para mover KRs
- Frequência sugerida: semanal
- Suportam menções (@usuario)
- Atualizam automaticamente \`current_value\` e \`last_checkin_at\` do KR

### 4.8 Histórico e Soft Delete

⚠️ **REGRA: Dados críticos nunca são apagados fisicamente.**

- Registros usam \`deleted_at\` para soft delete
- Audit logs registram todas as alterações
- \`okr_audit_log\` para OKRs, \`audit_logs\` para demais
`,
  },
  integrations: {
    title: "5. Eventos e Integrações",
    content: `
### 5.1 Eventos Emitidos (Outbound)

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

### 5.2 Ações Recebidas (Inbound)

| Ação | Payload | Resultado |
|------|---------|-----------|
| \`kpi.add_value\` | kpi_id, value, date | Registra valor |
| \`kr.update_value\` | kr_id, value | Atualiza KR |
| \`kr.add_checkin\` | kr_id, value, notes | Cria check-in |

### 5.3 Integrações Ativas e Planejadas

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
  "technical-debt": {
    title: "6. Débito Técnico e Limitações",
    content: `
### 6.1 Débito Técnico Conhecido

| Item | Descrição | Prioridade |
|------|-----------|------------|
| \`profiles.bu_id\` | Campo legado, substituído por \`bu_user_memberships\` | Média |
| Tipagem parcial | Alguns componentes sem TypeScript completo | Baixa |
| Testes | Cobertura de testes ainda baixa | Alta |

### 6.2 Limitações Atuais

- **Sem SSO/SAML:** Apenas magic link
- **Sem mobile app:** Web responsivo apenas
- **Sem modo offline:** Requer conexão constante
- **Edge Functions:** Timeout de 60s

### 6.3 Decisões Temporárias

| Decisão | Motivo | Quando revisar |
|---------|--------|----------------|
| Magic link único | Simplicidade de MVP | Quando precisar SSO |
| Todos os módulos visíveis | Simplicidade | Quando tiver módulos pagos |
`,
  },
  conventions: {
    title: "7. Convenções de Código",
    content: `
### 7.1 Estrutura de Arquivos

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

### 7.2 Nomenclatura

- **Componentes:** PascalCase (\`TeamCard.tsx\`)
- **Hooks:** camelCase com prefixo \`use\` (\`useTeams.ts\`)
- **Tipos:** PascalCase (\`OkrTeamObjective\`)
- **Enums:** camelCase ou snake_case no banco
- **Tabelas:** snake_case (\`okr_team_objectives\`)

### 7.3 Estilização

- Usar tokens semânticos do Tailwind (\`bg-primary\`, não \`bg-blue-500\`)
- Cores definidas em \`index.css\` e \`tailwind.config.ts\`
- Componentes shadcn/ui como base
- Variantes com \`cva\` quando necessário

### 7.4 Edge Functions

| Função | Descrição |
|--------|-----------|
| \`request-magic-link\` | Solicita magic link via SendGrid |
| \`search-cities\` | Autocomplete de cidades (Google Maps) |
| \`culture-message\` | Gera mensagem de cultura (IA) |
| \`invoke-vic\` | Invoca agentes Vic |
| \`process-agent-document\` | Processa documentos para RAG |
| \`get-tcr\` | Expõe o TCR via API |

### 7.5 Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| \`avatars\` | ✅ Sim | Fotos de perfil |
| \`bu-assets\` | ✅ Sim | Logos e símbolos de BUs |
| \`agent-documents\` | ❌ Não | Documentos para RAG de agentes |
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

    console.log(`TCR request - Section: ${section || "full"}`);

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
      return new Response(
        JSON.stringify({
          error: "Invalid section",
          available_sections: Object.keys(TCR_SECTIONS),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Return full TCR
      content = buildFullTcr();
      title = "Full TCR";
    }

    console.log(`TCR response - ${title} (${content.length} chars)`);

    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/markdown; charset=utf-8",
        "X-TCR-Version": TCR_VERSION,
        "X-TCR-Updated": TCR_UPDATED_AT,
      },
    });
  } catch (error) {
    console.error("Error serving TCR:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
