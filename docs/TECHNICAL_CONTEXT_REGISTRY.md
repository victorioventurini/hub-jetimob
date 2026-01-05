# Technical Context Registry (TCR) — Hub da Jet

**Versão:** 1.0.0  
**Última atualização:** 2026-01-05  
**Responsável:** Lovable AI / Equipe de Engenharia

---

## 1. Visão Geral da Arquitetura

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
  5. Profile é criado automaticamente via trigger `handle_new_user()`

### 1.3 Conceito Multi-BU (Business Units)

O Hub é uma plataforma **multi-tenant** onde cada empresa/unidade de negócio opera de forma isolada:

- Cada BU tem seu próprio conjunto de usuários, times, OKRs, KPIs, etc.
- Um usuário pode pertencer a **múltiplas BUs** (via `bu_user_memberships`)
- Uma BU é definida por `is_default = true` como padrão do usuário
- Dados são escopados por BU através de RLS policies
- Cada BU pode ter cores, logo e configurações personalizadas

### 1.4 Controle de Permissões

#### Roles do Sistema

| Role | Descrição | Acesso |
|------|-----------|--------|
| `super_admin` | Administrador global da plataforma | Acesso total a todas as BUs |
| `admin` | Administrador | Acesso administrativo (pode gerenciar estrutura) |
| `team_leader` | Líder de time | Gerencia seu time e seus OKRs/KPIs |
| `collaborator` | Colaborador padrão | Acesso básico à sua BU |

#### Roles por BU

| Role | Descrição |
|------|-----------|
| `ceo` | CEO da BU (admin local) |
| `admin` | Admin local da BU |
| `collaborator` | Colaborador da BU |

#### Funções de Autorização (RLS)

| Função | Descrição |
|--------|-----------|
| `is_platform_admin(user_id)` | Verifica se é `super_admin` ou `admin` global |
| `is_super_admin(user_id)` | Verifica se é apenas `super_admin` |
| `is_bu_admin(user_id, bu_id)` | Verifica se é admin/ceo da BU específica |
| `user_has_bu_access(user_id, bu_id)` | Verifica se tem membership na BU |
| `has_role(user_id, role)` | Verifica se possui uma role específica |

---

## 2. Domínio de Dados

### 2.1 Entidades Principais

#### **bu_units** — Business Units
Unidades de negócio (empresas/filiais).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome da BU |
| description | text | Descrição |
| legal_entity | text | Razão social |
| cnpj | text | CNPJ |
| allowed_email_domains | text[] | Domínios permitidos para login |
| logo_url | text | URL do logo |
| symbol_url | text | URL do símbolo |
| primary_color | text | Cor primária (hex) |
| secondary_color | text | Cor secundária (hex) |
| status | enum | `active`, `inactive` |

**Escopo:** Global (gerenciado por platform admins)

---

#### **profiles** — Perfis de Usuários
Dados do perfil de cada usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| first_name | text | Nome |
| last_name | text | Sobrenome |
| display_name | text | Nome de exibição |
| work_email | text | Email corporativo |
| job_title | text | Cargo |
| photo_url | text | URL da foto |
| work_mode | enum | `remote`, `hybrid`, `onsite` |
| city | text | Cidade |
| state | text | Estado |
| start_date | date | Data de início |
| birth_date | date | Data de nascimento |
| employment_status | enum | `active`, `inactive`, `vacation` |
| onboarding_completed | bool | Onboarding concluído |
| bu_id | uuid | BU principal (legado) |

**Escopo:** Por usuário (próprio perfil)

---

#### **user_roles** — Roles Globais
Roles globais do usuário no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| role | enum | `super_admin`, `admin`, `team_leader`, `collaborator` |

**Escopo:** Global

---

#### **bu_user_memberships** — Memberships por BU
Vínculo de usuários com BUs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| bu_id | uuid | FK para bu_units |
| role_in_bu | enum | Role dentro da BU específica |
| is_default | bool | Se é a BU padrão do usuário |

**Escopo:** Por BU

---

#### **teams** — Times
Estrutura organizacional de times.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do time |
| description | text | Descrição |
| leader_user_id | uuid | Líder do time |
| parent_team_id | uuid | Time pai (hierarquia) |
| status | enum | `active`, `inactive` |
| bu_id | uuid | FK para bu_units |

**Escopo:** Por BU

---

#### **user_team_memberships** — Membros de Times
Vínculo de usuários com times.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| team_id | uuid | FK para teams |
| is_active | bool | Se está ativo |
| joined_at | timestamp | Data de entrada |
| left_at | timestamp | Data de saída (se saiu) |

**Escopo:** Por BU (via team)

---

#### **squads** — Squads
Agrupamentos temporários/projetos de times.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do squad |
| description | text | Descrição |
| leader_user_id | uuid | Líder do squad |
| bu_id | uuid | FK para bu_units |
| status | enum | `active`, `inactive` |

**Escopo:** Por BU

---

### 2.2 Módulo OKRs

#### **okr_org_objectives** — Objetivos Organizacionais
Objetivos de alto nível da organização.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| title | text | Título do objetivo |
| description | text | Descrição |
| year | int | Ano do objetivo |
| owner_user_id | uuid | Responsável |
| status | enum | `draft`, `active`, `completed`, `cancelled` |
| bu_id | uuid | FK para bu_units |

**Escopo:** Por BU

---

#### **okr_org_key_results** — KRs Organizacionais
Key Results vinculados a objetivos organizacionais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| org_objective_id | uuid | FK para objetivo |
| title | text | Título do KR |
| baseline | numeric | Valor inicial |
| current_value | numeric | Valor atual |
| target | numeric | Meta |
| direction | enum | `up` (maior=melhor), `down` (menor=melhor) |
| unit | text | Unidade (%, R$, etc.) |
| status | enum | `green`, `yellow`, `red`, `not_started` |
| owner_user_id | uuid | Responsável |

**Escopo:** Por BU

---

#### **okr_team_objectives** — Objetivos de Time
Objetivos de cada time, vinculados a objetivos org.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| team_id | uuid | FK para teams |
| org_objective_id | uuid | FK para objetivo org |
| cycle_id | uuid | FK para cycles (opcional) |
| title | text | Título |
| owner_user_id | uuid | Responsável |
| status | enum | Status do objetivo |

**Limite:** Máximo 3 objetivos ativos por time (validado via trigger)

**Escopo:** Por BU (via team)

---

#### **okr_team_key_results** — KRs de Time
Key Results dos times.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| team_objective_id | uuid | FK para objetivo do time |
| parent_kr_id | uuid | KR pai (se houver) |
| team_id | uuid | FK para teams |
| title | text | Título |
| type | enum | `contribution`, `enabler`, `foundational` |
| baseline | numeric | Valor inicial |
| current_value | numeric | Valor atual |
| target | numeric | Meta |
| direction | enum | `up`, `down` |
| unit | text | Unidade |
| owner_user_id | uuid | Responsável |
| co_responsibles | uuid[] | Co-responsáveis |
| linked_org_kr_id | uuid | KR org vinculado (contribuição) |
| status | enum | RAG status |
| evidence_url | text | URL de evidência |

**Limite:** Máximo 3 KRs por objetivo (validado via trigger)

**Escopo:** Por BU (via team)

---

#### **okr_checkins** — Check-ins de KRs
Atualizações de progresso dos KRs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kr_id | uuid | FK para team_key_results |
| date | date | Data do check-in |
| previous_value | numeric | Valor anterior |
| current_value | numeric | Valor novo |
| confidence | enum | `high`, `medium`, `low` |
| blockers | text | Bloqueadores |
| comments | text | Comentários/menções |
| user_id | uuid | Quem fez o check-in |

**Escopo:** Por BU (via KR)

---

#### **okr_initiatives** — Iniciativas
Ações/projetos vinculados a KRs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kr_id | uuid | FK para team_key_results |
| name | text | Nome da iniciativa |
| description | text | Descrição |
| owner_user_id | uuid | Responsável |
| contributors | uuid[] | Contribuidores |
| status | enum | `planned`, `in_progress`, `completed`, `cancelled` |
| priority | enum | `high`, `medium`, `low` |
| progress | int | Progresso (0-100) |
| start_date | date | Data início |
| expected_end_date | date | Data fim prevista |

**Escopo:** Por BU

---

### 2.3 Módulo KPIs

#### **kpi_metrics** — Métricas/KPIs
Definição de KPIs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do KPI |
| description | text | Descrição |
| category | enum | `financeiro`, `growth`, `cs`, `produto`, `operacoes`, `pessoas` |
| bu_id | uuid | FK para bu_units |
| team_id | uuid | FK para teams (opcional) |
| owner_user_id | uuid | Responsável |
| unit | text | Unidade |
| direction | enum | `up`, `down` |
| frequency | enum | `daily`, `weekly`, `monthly`, `quarterly`, `manual` |
| target_value | numeric | Meta |
| status | enum | `active`, `inactive` |
| is_global | bool | Se é global (visível para toda BU) |

**Escopo:** Por BU

---

#### **kpi_values** — Valores de KPIs
Histórico de valores dos KPIs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kpi_id | uuid | FK para kpi_metrics |
| value | numeric | Valor |
| reference_date | date | Data de referência |
| source | enum | `manual`, `api`, `webhook`, `spreadsheet`, `database` |
| notes | text | Observações |
| created_by | uuid | Quem registrou |

**Escopo:** Por BU (via KPI)

---

### 2.4 Módulo Integrações & IA

#### **ai_agents** — Agentes de IA
Definição de agentes de IA (Vic).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| scope | enum | `global`, `bu` |
| bu_id | uuid | FK para bu_units (se bu) |
| slug | text | Identificador único |
| integration_key | text | Chave da integração |
| name | text | Nome do agente |
| description | text | Descrição |
| system_prompt | text | Prompt do sistema |
| model_name | text | Modelo (gemini, gpt, etc.) |
| temperature | numeric | Temperatura do modelo |
| max_tokens | int | Max tokens |
| output_format | enum | `text`, `json` |
| output_schema | jsonb | Schema de saída (se json) |
| is_active | bool | Se está ativo |

**Escopo:** Global ou por BU

---

#### **bu_ia_config** — Configuração de IA por BU
Configurações de IA para cada BU.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| ia_enabled | bool | Se IA está habilitada |
| ia_mode | text | `manual`, `assisted` |
| max_calls_per_user_day | int | Limite por usuário/dia |
| max_calls_per_bu_day | int | Limite por BU/dia |

**Escopo:** Por BU

---

### 2.5 Módulo Automações

#### **automation_connections** — Conexões de Saída
Webhooks de saída para sistemas externos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome da conexão |
| bu_id | uuid | FK para bu_units |
| scope | text | `global`, `bu` |
| webhook_url | text | URL do webhook |
| http_method | text | GET, POST, etc. |
| auth_type | text | `none`, `bearer`, `api_key`, `basic` |
| is_active | bool | Se está ativa |

**Escopo:** Global ou por BU

---

#### **automation_event_catalog** — Catálogo de Eventos
Eventos que o Hub pode emitir.

| Categoria | Eventos |
|-----------|---------|
| users | `user.created`, `user.updated`, `user.deleted` |
| teams | `team.created`, `team.member_added`, `team.member_removed` |
| okrs | `okr.objective_created`, `okr.kr_created`, `okr.checkin_created` |
| kpis | `kpi.created`, `kpi.value_added`, `kpi.threshold_breached` |

---

#### **automation_action_catalog** — Catálogo de Ações
Ações que podem ser executadas via API externa.

| Categoria | Ações |
|-----------|-------|
| kpis | `kpi.add_value` |
| krs | `kr.update_value`, `kr.add_checkin` |
| system | `system.healthcheck` |

---

### 2.6 Outras Entidades

#### **cycles** — Ciclos de OKR
Períodos de planejamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome (Q1 2026, etc.) |
| type | text | Tipo (quarter, semester, year) |
| start_date | date | Início |
| end_date | date | Fim |
| planning_date | date | Data de planejamento |
| review_date | date | Data de revisão |
| retro_date | date | Data de retrospectiva |

**Escopo:** Global

---

#### **modules** — Módulos do Sistema
Registro de módulos disponíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| slug | text | Identificador único |
| name | text | Nome |
| type | enum | `global`, `operational` |
| route | text | Rota no frontend |
| icon | text | Ícone |
| status | enum | `active`, `inactive`, `maintenance` |
| display_order | int | Ordem de exibição |

**Escopo:** Global (ativação por BU via `bu_module_configs`)

---

#### **notifications** — Notificações
Sistema de notificações internas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | Destinatário |
| bu_id | uuid | BU relacionada |
| type | enum | `mention`, `reminder`, `alert`, etc. |
| title | text | Título |
| message | text | Mensagem |
| context_type | text | Tipo do contexto (kr, objective, etc.) |
| context_id | uuid | ID do contexto |
| context_url | text | URL para navegação |
| is_read | bool | Se foi lida |
| actor_id | uuid | Quem gerou a notificação |

**Escopo:** Por usuário

---

#### **mentions** — Menções
Sistema de menções em comentários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| mentioned_user_id | uuid | Usuário mencionado |
| author_id | uuid | Autor da menção |
| bu_id | uuid | BU |
| context_type | text | Tipo (checkin, comment, etc.) |
| context_id | uuid | ID do contexto |
| parent_type | text | Tipo pai (kr, objective) |
| parent_id | uuid | ID pai |
| notification_id | uuid | Notificação gerada |

**Escopo:** Por BU

---

## 3. Módulos do Hub

### 3.1 Módulos Ativos

| Módulo | Slug | Objetivo | Status |
|--------|------|----------|--------|
| **Home** | - | Dashboard pessoal com OKRs, aniversários, cultura | ✅ Ativo |
| **OKRs** | `okrs` | Gestão de Objectives e Key Results | ✅ Ativo |
| **KPIs** | `kpis` | Indicadores de performance | ✅ Ativo |
| **Times** | `teams` | Estrutura organizacional | ✅ Ativo |
| **Integrações** | `integrations` | Gerenciamento de integrações e agentes IA | ✅ Ativo |
| **Automações** | `automations` | Webhooks de entrada/saída | ✅ Ativo |
| **Vic** | `vic` | Assistente de IA contextual | ✅ Ativo |
| **BU Management** | `bu` | Gerenciamento de Business Units | ✅ Ativo (admin) |

### 3.2 Módulos em Desenvolvimento

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Patrimônio | 🚧 Planejado | Gestão de ativos patrimoniais |
| Feedbacks | 🚧 Planejado | Ciclos de feedback e avaliação |
| Pesquisas | 🚧 Planejado | Pesquisas de clima e engajamento |

---

## 4. Regras de Negócio Críticas

### 4.1 Escopo por BU

```
⚠️ REGRA FUNDAMENTAL: Todo dado operacional é escopado por BU.
```

- Usuários só veem dados da(s) BU(s) que pertencem
- RLS policies garantem isolamento no banco
- Frontend sempre filtra por `currentBuId`

### 4.2 Multi-BU

- Um usuário pode pertencer a múltiplas BUs
- Cada usuário tem uma BU padrão (`is_default = true`)
- O usuário pode alternar entre BUs no seletor
- Ao trocar de BU, todos os dados são recarregados

### 4.3 Limites de OKRs

- **Máximo 3 objetivos ativos** por time
- **Máximo 3 KRs** por objetivo
- Validado via triggers no banco

### 4.4 Cálculo de Progresso de KR

```typescript
function calculateProgress(baseline, current, target, direction) {
  if (direction === 'up') {
    return ((current - baseline) / (target - baseline)) * 100;
  } else {
    return ((baseline - current) / (baseline - target)) * 100;
  }
}
```

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
| `contribution` | Contribui diretamente para KR organizacional |
| `enabler` | Habilita/suporta outros KRs |
| `foundational` | Fundacional para o funcionamento |

### 4.7 Check-ins

- Check-ins são obrigatórios para mover KRs
- Frequência sugerida: semanal
- Suportam menções (@usuario)
- Atualizam automaticamente `current_value` e `last_checkin_at` do KR

### 4.8 Histórico e Soft Delete

```
⚠️ REGRA: Dados críticos nunca são apagados fisicamente.
```

- Registros usam `deleted_at` para soft delete
- Audit logs registram todas as alterações
- `okr_audit_log` para OKRs, `audit_logs` para demais

---

## 5. Eventos e Integrações

### 5.1 Eventos Emitidos (Outbound)

| Evento | Payload | Quando |
|--------|---------|--------|
| `user.created` | Profile completo | Novo usuário cadastrado |
| `user.updated` | Campos alterados | Perfil atualizado |
| `team.created` | Dados do time | Time criado |
| `team.member_added` | user_id, team_id | Membro adicionado |
| `okr.objective_created` | Objetivo completo | Novo objetivo |
| `okr.kr_created` | KR completo | Novo KR |
| `okr.checkin_created` | Check-in + KR | Check-in feito |
| `kpi.value_added` | KPI + valor | Valor registrado |
| `kpi.threshold_breached` | KPI + status | KPI em risco |

### 5.2 Ações Recebidas (Inbound)

| Ação | Payload | Resultado |
|------|---------|-----------|
| `kpi.add_value` | kpi_id, value, date | Registra valor |
| `kr.update_value` | kr_id, value | Atualiza KR |
| `kr.add_checkin` | kr_id, value, notes | Cria check-in |

### 5.3 Integrações Planejadas

| Integração | Status | Uso |
|------------|--------|-----|
| SendGrid | ✅ Ativo | Emails (magic link, notificações) |
| Google Maps | ✅ Ativo | Autocomplete de cidades |
| Lovable AI | ✅ Ativo | Agentes Vic |
| Slack | 🚧 Planejado | Notificações e comandos |
| n8n | 🚧 Planejado | Automações complexas |
| Google Sheets | 🚧 Planejado | Import/export de KPIs |

---

## 6. Débito Técnico e Limitações

### 6.1 Débito Técnico Conhecido

| Item | Descrição | Prioridade |
|------|-----------|------------|
| `profiles.bu_id` | Campo legado, substituído por `bu_user_memberships` | Média |
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

---

## 7. Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `avatars` | ✅ Sim | Fotos de perfil |
| `bu-assets` | ✅ Sim | Logos e símbolos de BUs |
| `agent-documents` | ❌ Não | Documentos para RAG de agentes |

---

## 8. Edge Functions

| Função | Descrição |
|--------|-----------|
| `request-magic-link` | Solicita magic link via SendGrid |
| `send-magic-link` | (Legado) Envio direto |
| `auth-email-hook` | Hook para customização de emails |
| `search-cities` | Autocomplete de cidades (Google Maps) |
| `culture-message` | Gera mensagem de cultura (IA) |
| `invoke-vic` | Invoca agentes Vic |
| `process-agent-document` | Processa documentos para RAG |

---

## 9. Views do Banco

| View | Descrição |
|------|-----------|
| `v_pending_checkins` | KRs com check-ins pendentes |
| `v_shared_okrs_summary` | Resumo de OKRs compartilhados |
| `v_team_contributed_okrs` | OKRs onde time contribui |

---

## 10. Convenções de Código

### 10.1 Estrutura de Arquivos

```
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
```

### 10.2 Nomenclatura

- **Componentes:** PascalCase (`TeamCard.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useTeams.ts`)
- **Tipos:** PascalCase (`OkrTeamObjective`)
- **Enums:** camelCase ou snake_case no banco
- **Tabelas:** snake_case (`okr_team_objectives`)

### 10.3 Estilização

- Usar tokens semânticos do Tailwind (`bg-primary`, não `bg-blue-500`)
- Cores definidas em `index.css` e `tailwind.config.ts`
- Componentes shadcn/ui como base
- Variantes com `cva` quando necessário

---

## 11. Versionamento

| Campo | Valor |
|-------|-------|
| **Versão do TCR** | 1.0.0 |
| **Data da última atualização** | 2026-01-05 |
| **Responsável** | Lovable AI |
| **Supabase Project ID** | oiwnghihyqdsinouwmga |

---

## Changelog

### v1.0.0 (2026-01-05)
- Versão inicial do TCR
- Documentação completa de todas as entidades
- Regras de negócio consolidadas
- Funções de autorização renomeadas (`is_platform_admin`)

---

## Uso com ChatGPT

Para usar este documento como contexto no ChatGPT:

1. Copie o conteúdo completo deste arquivo
2. Cole no início da conversa com ChatGPT
3. Instrua: "Use este TCR como fonte de verdade para gerar código e decisões sobre o Hub"

**Prompt sugerido:**
```
Você é um desenvolvedor sênior trabalhando no Hub da Jet.
Todas as decisões devem respeitar o TCR (Technical Context Registry) fornecido.
Se houver conflito ou ambiguidade, pergunte antes de prosseguir.
Priorize: segurança, consistência com padrões existentes, simplicidade.
```
