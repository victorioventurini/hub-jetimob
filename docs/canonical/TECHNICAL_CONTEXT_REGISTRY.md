# Technical Context Registry (TCR) — Hub da Jet

**Versão:** 2.95.0  
**Última atualização:** 2026-02-07 (v2.95.0 - Frontend UX Audit Complete v1.0 - Migração completa de Loader2 para Button.isLoading/LoadingState, remoção de breadcrumbs legacy, centralização de queryKeys, migração de cores hardcoded para tokens semânticos)
**Responsável:** Lovable AI / Equipe de Engenharia
**Status:** V2-only mode ativo | Identity Cutover v3.0 completo | RLS V2 100% migrado | Vic Culture System ativo | Auth Magic Link ativo | Automated Testing Framework v1.1 ativo | **Áreas (Strategic Layer) v1.0 implementado** | **Performance Metrics Dashboard (P4) implementado** | **Saved Links System v1.4 (PageHeader.actions canonical)** | **Performance Wave P5.1 COMPLETO** | **Cycle Checkins Evolution View v1.0** | **Team OKR/KR Linking Edit v1.0** | **Internal User Auth Hardening v1.0** | **Global Partner Companies v1.0 implementado** | **Global Partner Contacts v1.0 implementado** | **RLS Security Audit v1.0 (6 fixes)** | **Tickets Pinned Messages v1.0** | **Tickets Transfer System v1.0** | **Tickets Attachments RLS v3 (external access)** | **Identity Hardening v2.1 (profile_id naming + CI gate)** | **Notification Templates v2.0** | **Impersonation Wildcard Fix v1.0** | **can_view_ticket Hybrid User Support v1.0** | **Impersonation Ticket List External Support v1.0** | **Comprehensive Technical Audit v1.0 (2026-01-22)** | **7 Partial Indexes Soft-Delete** | **pg_cron Cleanup Semanal** | **user_team_memberships Schema Fix** | **Unified Participant Layer v1.0** | **External User Identity Pattern v1.0** | **Edge Functions Error Handler Standardization** | **Wave 3-7 Hooks Barrel Consolidation COMPLETO** | **Wave 4.1 Documentation Hierarchy v1.0** | **Wave 4.2 SQL Functions Audit (175 funções)** | **Wave 4.3 Edge Functions JSDoc Audit (18 funções)** | **Ticket Watcher Messaging Fix v1.0** | **Ticket Message Pinning RLS v3** | **Tickets UI Badge Standardization v1.0** | **Assets Inventory Return Date Column v1.0** | **Database Hygiene Wave 10/10 v1.0** | **useDebounce Alias Removed** | **4 Performance Indexes Added** | **OTP Code Removal v1.0 (Magic Link canonical)** | **URL State em OrganogramPage v1.0** | **Mutations com Campos Explícitos v1.0** | **Context Resilience Pattern v1.0** | **useOptionalBuClient Stricter Gating v1.0** | **React Router forwardRef Fix v1.0** | **Supabase Client Singleton Pattern v1.0 (HMR-safe)** | **rpc_home_dashboard_data Enum Fix v1.0** | **Documentation Path Consolidation v1.0 (docs/canonical/)** | **Generic Messaging Reply System v1.0** | **Routes Modularization v1.0 (App.tsx 1125→180 linhas)** | **Systemic Health Analysis v2.0** | **Log Cleanup Executed** | **UI Wave v1.0 (Button isLoading + LoadingState)** | **KPIs Module Complete v1.0 (CRUD + Mutations)** | **Radix Focus Recovery v1.0** | **OKR Checkins RLS Ownership Fix v1.0** | **Organogram Text Export v1.0** | **Dashboard Ticket Links v1.0** | **PII Security Views Update v1.0** | **Assets Reports Deep Links v1.0** | **OKR/KPI Wizard Integration v1.0** | **Listing Page Layout Standardization v1.0** | **Complementary Buttons Standard v1.0** | **GTM Multi-Tenant v1.0** | **Responsibility Transfer System (RTS) v1.0** | **Asset Recommendations v1.0** | **Frontend UX Audit Complete v1.0** | **System Health Score 10/10** ✅

> 📚 **Documentação Técnica Consolidada:**
>
> ### Padrões de Desenvolvimento
> - [DEVELOPMENT_STANDARDS.md v1.17.0](./DEVELOPMENT_STANDARDS.md) — **Padrões Obrigatórios** (PRE-BU/POST-BU, Identity, RBAC, Queries, URL State, Edge Functions)
> - [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) — Padrão de query keys centralizadas
> - [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) — Regras de cliente Supabase (global vs bu-scoped)
> - [URL_STATE_STANDARD.md](./URL_STATE_STANDARD.md) — Padrão de URL state para filtros e paginação
>
> ### Modelo de Dados e Banco
> - [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md) — **Fonte única de verdade para schema** (tabelas, views, funções, enums)
> - [DATA_MODEL_REGISTRY.json](./DATA_MODEL_REGISTRY.json) — Versão JSON para automação
>
> ### Identidade e Permissões
> - [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) — Convenção `user_id` (auth) vs `profile_id` (domínio)
> - [EXTERNAL_USER_IDENTITY_PATTERN.md](../guides/EXTERNAL_USER_IDENTITY_PATTERN.md) — **Padrão para usuários externos (partner_contacts)** ⭐
> - [UNIFIED_PARTICIPANT_LAYER.md](../guides/UNIFIED_PARTICIPANT_LAYER.md) — Camada unificada interno/externo
> - [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md) — Modelo completo de permissões V2
> - [RBAC_TEMPLATES_V3.md](./RBAC_TEMPLATES_V3.md) — Sistema de templates de permissão
>
> ### Relatórios de Saúde e Compliance
> - [SYSTEMIC_HEALTH_ANALYSIS_2026-01-23.md](../audits/SYSTEMIC_HEALTH_ANALYSIS_2026-01-23.md) — **Análise sistêmica de saúde** ⭐
> - [HEALTH_REPORT_2026-01-22.md](../audits/HEALTH_REPORT_2026-01-22.md) — Relatório de saúde técnica
> - [COMPLIANCE_BASELINE.md](../audits/COMPLIANCE_BASELINE.md) — Baseline de compliance e audits
>
> ### Testes Automatizados
> - [TESTING_GUIDE.md](../guides/TESTING_GUIDE.md) — **Guia completo de testes (Vitest + Playwright)** ⭐
>
> ### Desenvolvimento de Wizards
> - [WIZARD_DEVELOPMENT_GUIDE.md](../guides/WIZARD_DEVELOPMENT_GUIDE.md) — **Guia obrigatório para novos wizards** ⭐
>
> ### Operações
> - [BACKUP_RESTORE_PLAYBOOK.md](../guides/BACKUP_RESTORE_PLAYBOOK.md) — Playbook de backup e restore
> - [GO_LIVE_CHECKLIST.md](../guides/GO_LIVE_CHECKLIST.md) — Checklist de go-live

> ⚠️ **Data Model Registry (Canonical)**
> - Arquivo: `docs/canonical/DATA_MODEL_REGISTRY.md` (humano) + `.json` (máquina)
> - Regra: **NUNCA inventar nomes de tabela/view/função**. Usar exclusivamente o registry.
> - Regenerar: `npx tsx scripts/generate-data-model-registry.ts`
> 
> 📑 **Índice Completo de Documentação:** [../DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)

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
  3. **Para usuários internos:** Verifica se existe perfil pré-cadastrado em `profiles`
  4. Se válido, gera Magic Link via `supabase.auth.admin.generateLink()`
  5. Envia link por email via SendGrid (com Resend como fallback)
  6. Usuário clica no link e é redirecionado para `/auth/callback`
  7. `AuthCallback.tsx` verifica o `token_hash` via `supabase.auth.verifyOtp()` para estabelecer sessão
  8. Profile é criado automaticamente via trigger `handle_new_user()` (se não existir)

> **Nota (v2.65.0):** O sistema usa Magic Link com `token_hash` no URL (não hash fragment) para evitar problemas com SendGrid click tracking que remove fragmentos de URL.

> **Nota (v2.43.0):** Usuários internos (domínio em `allowed_email_domains`) agora precisam ter perfil pré-cadastrado em `profiles` para receber Magic Link. Isso impede que qualquer email com domínio válido acesse o sistema sem convite prévio.

#### Critérios de Recebimento de Magic Link

| Tipo de Usuário | Critério | Tabela de Validação |
|-----------------|----------|---------------------|
| **Contato Parceiro** | Email cadastrado em `partner_contacts` com status `active` **E** com associação ativa em `partner_contact_bu_associations` | `partner_contacts` + `partner_contact_bu_associations` |
| **Empresa Parceira** | Domínio do email em `external_companies.allowed_domains` (via `external_company_bu_associations`) | `external_company_bu_associations` → `external_companies` |
| **Usuário Interno** | Domínio em `bu_units.allowed_email_domains` **E** email em `profiles.work_email` | `bu_units` + `profiles` |

⚠️ **IMPORTANTE:** Usuários internos sem perfil pré-cadastrado NÃO recebem Magic Link, mesmo com domínio válido.

> **Nota (v2.45.0):** Empresas parceiras agora são globais (únicas por CPF/CNPJ). A validação de domínio para login verifica associações ativas em `external_company_bu_associations`.

> **Nota (v2.46.0):** Contatos de parceiros agora são globais (únicos por email). A validação de login verifica associações ativas em `partner_contact_bu_associations`. Um mesmo contato pode estar ativo em múltiplas BUs.

### 1.3 Conceito Multi-BU (Business Units)

O Hub é uma plataforma **multi-tenant** onde cada empresa/unidade de negócio opera de forma isolada:

- Cada BU tem seu próprio conjunto de usuários, times, OKRs, KPIs, etc.
- Um usuário pode pertencer a **múltiplas BUs** (via `bu_user_memberships`)
- Uma BU é definida por `is_default = true` como padrão do usuário
- Dados são escopados por BU através de RLS policies
- Cada BU pode ter cores, logo e configurações personalizadas

### 1.3.1 Conceito de Áreas (v2.33.0)

**Áreas** são entidades estratégicas que agrupam times sem criar "times fake":

```
BU (Business Unit)
└── Área (responsabilidade estratégica: Revenue, Produto, Tecnologia...)
    └── Time (execução operacional)
        └── Subtime (opcional)
            └── Pessoas
```

| Característica | Área | Time |
|---------------|------|------|
| Membros | Apenas líder/co-líder | Membros operacionais |
| OKRs | **NÃO possui OKRs** | Possui OKRs de time |
| Propósito | Agrupamento estratégico | Execução operacional |
| Backlog | Não | Sim |

**Tabela:** `public.areas` | **Rota:** `/settings/areas` | **RFC:** [RFC_AREAS_IMPLEMENTATION.md](./engineering/RFC_AREAS_IMPLEMENTATION.md)

### 1.4 Controle de Permissões

#### Roles do Sistema

| Role | Descrição | Acesso |
|------|-----------|--------|
| `super_admin` | Administrador global da plataforma | Acesso total a todas as BUs |
| `admin` | Administrador | Acesso administrativo (pode gerenciar estrutura) |

> **Nota:** super_admin e admin recebem wildcard `['*']` em permissões.

#### Roles por BU

| Role | Descrição |
|------|-----------|
| `admin` | Admin local da BU (acesso total dentro da BU) |
| `collaborator` | Colaborador da BU (acesso via grupos de permissão) |

#### Funções de Autorização (RLS)

| Função | Descrição |
|--------|-----------|
| `is_platform_admin(user_id)` | Verifica se é `super_admin` ou `admin` global |
| `is_super_admin(user_id)` | Verifica se é apenas `super_admin` |
| `is_bu_admin(user_id, bu_id)` | Verifica se é admin da BU específica |
| `user_has_bu_access(user_id, bu_id)` | Verifica se tem membership na BU |
| `has_role(user_id, role)` | Verifica se possui uma role específica |
| `has_asset_permission(user_id, bu_id, roles)` | Verifica permissão em sub-módulos de Assets |
| `get_my_permissions(bu_id)` | Retorna array de permission keys do usuário |

#### Funções de Hierarquia de Times (v2.2+)

| Função | Descrição |
|--------|-----------|
| `is_team_leader(user_id, team_id)` | Verifica se usuário é líder DIRETO do time |
| `team_is_ancestor(ancestor_id, team_id)` | Verifica se um time é ancestral de outro |
| `team_is_descendant(team_id, ancestor_id)` | Verifica se um time é descendente de outro |
| `user_can_manage_team(user_id, team_id)` | Regra FINAL: líder direto OU admin/super_admin |
| `get_manageable_teams(user_id, bu_id)` | Retorna IDs dos times que o usuário pode gerenciar |

**Regras de Gestão de Times:**
- ✅ Líder pode gerenciar APENAS o próprio time e times filhos diretos
- ❌ Líder NÃO pode gerenciar time pai
- ❌ Líder NÃO pode gerenciar times irmãos
- ❌ Líder NÃO pode gerenciar times de outros ramos

#### Funções de Impersonação (v2.23+)

| Função | Descrição |
|--------|-----------|
| `get_user_role_for_impersonation(p_target_profile_id, p_bu_id)` | Retorna role do usuário impersonado (somente super_admin pode chamar) |
| `get_leader_teams_for_impersonation(p_target_profile_id, p_bu_id)` | Retorna times liderados pelo usuário impersonado (somente super_admin) |

**Regras de Impersonação:**
- ✅ Apenas `super_admin` pode ativar impersonação
- ✅ Impersonação é visual (leitura) — não permite mutations como outro usuário
- ✅ `useIdentity()` retorna `userId`/`profileId` do usuário impersonado para leitura
- ✅ `useIdentity()` retorna `realUserId`/`realProfileId` do usuário real para mutations

---

### 1.5 Supabase Client Usage

O Hub utiliza um padrão **singleton** para clientes Supabase, evitando múltiplas instâncias GoTrueClient:

#### Arquitetura de Clientes (v2.69.0)

| Cliente | Arquivo | Uso | `detectSessionInUrl` |
|---------|---------|-----|---------------------|
| **Global Singleton** | `globalClient.ts` | Auth, bootstrap, pré-BU | `false` |
| **BU-Scoped Singleton** | `buScopedClient.ts` | Dados operacionais | `false` |
| **Auto-generated** | `client.ts` | ❌ **NÃO USAR** (apenas para compatibilidade) | `true` |

> ⚠️ **CRÍTICO:** O arquivo `client.ts` é auto-gerado pelo Lovable Cloud e **NÃO DEVE SER USADO** diretamente. Usar sempre `globalClient.ts` ou `useBuScopedSupabase()`.

#### `useBuScopedSupabase()` — Cliente BU-Scoped (OBRIGATÓRIO)
**Obrigatório para todos os dados operacionais.** Injeta automaticamente o header `x-current-bu-id` em todas as requisições.

```typescript
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

const supabase = useBuScopedSupabase();
// Todas as queries incluem x-current-bu-id header
```

**Onde usar:**
- ✅ Todos os módulos operacionais (OKRs, KPIs, Tickets, Assets, Teams, etc.)
- ✅ Qualquer query que acessa dados escopados por BU
- ✅ Mutations em tabelas com `bu_id`

**Guard de segurança:** Lança erro se chamado antes de `BuProvider` inicializar.

#### `supabase` (Cliente Global Singleton) — USO RESTRITO
**Importar de `globalClient.ts`, NUNCA de `client.ts`:**

```typescript
// ✅ CORRETO: Import do singleton global
import { supabase } from "@/integrations/supabase/globalClient";

// ❌ ERRADO: Import do client auto-gerado (causa múltiplas instâncias)
import { supabase } from "@/integrations/supabase/client";
```

**Permitido APENAS para cenários específicos:**

| Cenário | Justificativa |
|---------|---------------|
| **Auth** | Operações de login/logout não têm BU |
| **Membership Bootstrap** | `useUserBus`, `useExternalUser` rodam ANTES do BuProvider |
| **Realtime** | `NotificationCenter` precisa de subscription global |
| **Pré-BU Hooks** | Hooks que populam o BuContext |

```typescript
// ✅ Correto: Auth com globalClient
import { supabase } from "@/integrations/supabase/globalClient";
await supabase.auth.signInWithOtp({ email });

// ❌ ERRADO: Dados operacionais com cliente global
const { data } = await supabase.from("tickets").select("*"); // BUG!
```

**Qualquer uso do cliente global fora dos cenários acima é considerado BUG.**

#### Por que `detectSessionInUrl: false`?

Múltiplas instâncias de `GoTrueClient` com `detectSessionInUrl: true` causam:
- Warnings de "Multiple GoTrueClient instances detected"
- Race conditions na captura do `access_token` do URL
- Comportamento indefinido em auth callbacks

O padrão singleton com `detectSessionInUrl: false` garante que:
- ✅ Apenas `AuthCallback.tsx` processa tokens de URL
- ✅ Sem race conditions entre clientes
- ✅ Sem warnings no console

---

### 1.6 Hooks e Componentes Canônicos

Antes de criar qualquer componente ou hook novo, **OBRIGATÓRIO** verificar se já existe solução canônica:

#### Hooks Canônicos por Domínio

| Domínio | Hook Canônico | Descrição |
|---------|---------------|-----------|
| **Listagem de usuários** | `useBuUsersDirectory()` | Lista usuários da BU atual (busca server-side) |
| **Select de usuários** | `useBuUserSelectOptions()` | Retorna options formatadas para selects |
| **Identidade** | `useIdentity()` | Resolve `userId`/`profileId` (suporta impersonação) — retorna também `realUserId`/`realProfileId` para mutations |
| **Profile ID** | `useProfileId()` | Atalho para obter apenas o profileId |
| **Permissões** | `usePermissions()` | Verifica permission keys do usuário |
| **Cliente BU-scoped** | `useBuScopedSupabase()` | Cliente Supabase com header de BU |
| **Cliente opcional** | `useOptionalBuScopedSupabase()` | Cliente que retorna null antes do BuProvider |
| **BU Context** | `useBu()` | Acesso ao contexto da BU atual |
| **Impersonação** | `useImpersonation()` | Estado de simulação visual (super_admin) |
| **Impersonação opcional** | `useOptionalImpersonation()` | Retorna null se fora do contexto de impersonação |
| **Focus Recovery (Radix)** | `useRadixFocusRecovery()` | Recupera pointer-events após troca de aba (chamar UMA VEZ no App.tsx) |
| **KPIs para Wizards** | `useKpisForWizard()` | Hook fail-safe para wizards OKR — retorna KPIs ativos com latest value, RAG status e flag `needs_update` |

#### Componentes Canônicos por Domínio

| Domínio | Componente | Descrição |
|---------|------------|-----------|
| **Select de usuário** | `BuUserSelect` | Dropdown para selecionar 1 usuário |
| **Multi-select de usuários** | `BuUserMultiSelect` | Dropdown para selecionar múltiplos usuários |
| **Avatar otimizado** | `OptimizedAvatar` | Avatar com lazy loading e fallback |
| **Guard de permissão** | `PermissionGuard` | Renderiza children se permissão existe |
| **Require permissão** | `RequirePermission` | Bloqueia acesso se permissão não existe |

#### Views Canônicas (Supabase)

| View | Propósito |
|------|-----------|
| `v_bu_active_profiles` | **Fonte única** para diretório de usuários da BU |
| `v_profiles_directory` | Perfis com team/job info (alternativa legada) |
| `v_bu_all_profiles_admin` | Todos os perfis incluindo inativos (admin) |

#### Regras

1. **Se existe hook/componente canônico → USAR**
2. **Se não existe → PERGUNTAR antes de criar**
3. **Nunca duplicar lógica** de hooks existentes
4. **Nunca fazer query direta** se existe view canônica

> 📋 **Referência completa:** [SHARED_COMPONENTS_REGISTRY.md](./engineering/SHARED_COMPONENTS_REGISTRY.md)

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

#### **bu_locations** — Sedes/Unidades Físicas
Localizações físicas de cada BU (matriz, filiais, escritórios).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| name | text | Nome da sede |
| type | enum | `headquarters`, `office`, `warehouse`, `remote_hub`, `other` |
| status | enum | `active`, `inactive` |
| is_default | bool | Se é a sede padrão (única por BU) |
| formatted_address | text | Endereço formatado completo |
| address_line_1 | text | Logradouro |
| address_line_2 | text | Complemento |
| district | text | Bairro |
| city | text | Cidade |
| state | text | Estado |
| country | text | País (default 'BR') |
| postal_code | text | CEP |
| latitude | numeric | Latitude |
| longitude | numeric | Longitude |
| google_place_id | text | ID do Google Places |
| timezone | text | Fuso horário |
| notes | text | Observações |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras:**
- Apenas 1 sede pode ser `is_default = true` por BU
- Trigger automático desmarca outras ao marcar nova como padrão
- Endereço preenchido via Google Maps Autocomplete

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
| birth_day | int | Dia do aniversário |
| birth_month | int | Mês do aniversário |
| employment_status | enum | `active`, `vacation`, `terminated`, `external` |
| onboarding_completed | bool | Onboarding concluído |
| bu_id | uuid | BU principal |
| team_id | uuid | Time principal |
| manager_user_id | uuid | Gestor direto |

**Escopo:** Por BU (via bu_id)

---

#### **user_roles** — Roles Globais
Roles globais do usuário no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para auth.users |
| role | enum | `super_admin`, `admin` |

**Escopo:** Global

> **Nota:** Apenas `super_admin` e `admin` são roles válidos. Demais acessos são via permission keys.

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
| leader_user_id | uuid | **PROFILE_ID**: FK para profiles.id (ver [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)) |
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
| user_id | uuid | **PROFILE_ID**: FK para profiles.id (ver [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)) |
| team_id | uuid | FK para teams |
| joined_at | timestamp | Data de entrada |
| left_at | timestamp | Data de saída (se saiu) |

**Escopo:** Por BU (via team)

> **Nota (v2.58.0):** Esta tabela **não possui** coluna `is_active`. A existência do registro indica membership ativo. Remoção de membership = DELETE do registro.

---

#### **squads** — Squads
Agrupamentos temporários/projetos de times.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do squad |
| description | text | Descrição |
| leader_user_id | uuid | **PROFILE_ID**: Líder do squad (ver [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)) |
| bu_id | uuid | FK para bu_units |
| status | enum | `active`, `inactive` |
| deleted_at | timestamptz | Soft delete |

**Escopo:** Por BU

---

#### **squad_memberships** — Membros de Squads
Vínculo de usuários com squads, incluindo papel específico.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| squad_id | uuid | FK para squads |
| user_id | uuid | **PROFILE_ID**: FK para profiles.id (ver [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)) |
| bu_id | uuid | NOT NULL — FK para bu_units (auto-set via trigger) |
| role | enum | `product_owner`, `tech_lead`, `ux_ui_lead`, `member` |
| deleted_at | timestamptz | Soft delete |

**Escopo:** Por BU (direto, não via join)

**Triggers:**
- `trg_squad_membership_set_bu_id` — Auto-preenche `bu_id` a partir do squad
- `trg_enforce_squad_membership_bu_scope` — Valida que `bu_id` coincide com squad

**RLS:**
- SELECT: `is_current_bu(bu_id) AND user_has_bu_access(auth.uid(), bu_id)`
- INSERT/UPDATE/DELETE: `is_bu_admin(auth.uid(), bu_id) OR is_platform_admin(auth.uid())`

**Diferença de `user_team_memberships`:**
- `user_team_memberships`: vínculo permanente usuário ↔ time (is_primary)
- `squad_memberships`: papel específico em squad de projeto (PO, Tech Lead, etc.)

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
| status | enum | `draft`, `active`, `completed`, `cancelled`, `discarded` |
| bu_id | uuid | FK para bu_units |

**Escopo:** Por BU

**Regras de Filtro (v2.38.0):**
- Por padrão, queries excluem objetivos com `status = 'cancelled'` OU `status = 'discarded'`
- Para incluir todos os status, usar `includeAllStatuses: true` nos hooks

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
| year | int | Ano do objetivo |
| owner_user_id | uuid | Responsável |
| status | enum | `draft`, `active`, `completed`, `cancelled`, `discarded` |
| bu_id | uuid | FK para bu_units |

**Limite:** Máximo 3 objetivos ativos por time (validado via trigger)

**Escopo:** Por BU (via team)

**Regras de Filtro (v2.38.0):**
- Por padrão, queries excluem objetivos com `status = 'cancelled'` OU `status = 'discarded'`
- Para incluir todos os status, usar `includeAllStatuses: true` nos hooks

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

#### **okr_contributions** — Relações de Contribuição
Relações informativas entre objetivos/KRs (não afetam cálculo de progresso).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| from_type | enum | `objective`, `kr` |
| from_id | uuid | ID da entidade de origem |
| to_type | enum | `objective`, `kr` |
| to_id | uuid | ID da entidade de destino |
| bu_id | uuid | FK para bu_units |
| description | text | Descrição da contribuição |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras críticas:**
- ❌ Proibido criar ciclos
- ❌ KR tipo `foundational` ou `enabler` NÃO pode contribuir para KR Organizacional
- ✅ Objetivo de Time → Objetivo Organizacional (permitido)
- ✅ KR de Time tipo `contribution` → KR Organizacional (permitido)
- Trigger `validate_okr_contribution()` garante regras

---

#### **okr_kr_metrics** — Vínculo KR ↔ KPI
Relaciona KRs com KPIs (métrica primária + guardrails).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kr_id | uuid | ID do KR |
| kr_type | enum | `org`, `team` |
| kpi_id | uuid | FK para kpi_metrics |
| role | enum | `primary`, `guardrail` |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras críticas:**
- Cada KR deve ter **exatamente 1** KPI com role `primary`
- KR pode ter 0..N KPIs com role `guardrail`
- Cálculo de progresso usa apenas KPI `primary`
- Guardrails geram alertas, não afetam score
- Trigger `validate_kr_primary_metric()` garante unicidade

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
| user_id | uuid | Quem fez o check-in (profile_id) |

**Escopo:** Por BU (via KR)

**RLS INSERT (v2.77.0 - okr_checkins_insert_v3):**
- Permissão: `okrs.checkin.create:self_or_owner`
- **E** relacionamento com a KR:
  - É owner da KR (`owner_user_id = profile_id`)
  - É co-responsável da KR (`profile_id = ANY(co_responsibles)`)
  - É líder do time (via `can_manage_team_okr_by_profile()`)

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

#### **kpi_metrics** — Métricas/KPIs (v2.1)
Definição de KPIs com lifecycle e classificação.

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
| **indicator_type** | enum | `kpi`, `metric` |
| **lifecycle_status** | enum | `proposed`, `active`, `observing`, `deprecated` — v2.1 |
| **target_source** | text | Fonte/URL do target/benchmark — v2.1 |
| **recovery_protocol** | text | Protocolo de recuperação quando fora da meta — v2.1 |
| deleted_at | timestamptz | Soft delete |

**Escopo:** Por BU

**Funções de Cálculo (v2.1):**
- `kpi_calculate_rag(value, target, direction)` → Calcula RAG status
- `kpi_calculate_period(reference_date, frequency)` → Calcula period_start/end/label

---

#### **kpi_values** — Valores de KPIs (v2.1)
Histórico de valores com período e confiança.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kpi_id | uuid | FK para kpi_metrics |
| value | numeric | Valor |
| reference_date | date | Data de referência |
| source | enum | `manual`, `api`, `webhook`, `spreadsheet`, `database` |
| notes | text | Observações |
| created_by | uuid | Quem registrou |
| **period_start** | date | Início do período (ISO week aligned) — v2.1 |
| **period_end** | date | Fim do período — v2.1 |
| **period_label** | text | Label do período: `YYYY-MM-DD`, `IYYY-WIW`, `YYYY-MM`, `YYYY-QQ` — v2.1 |
| **confidence** | enum | `high`, `medium`, `low` — v2.1 |
| **rag_status** | enum | `on_track`, `at_risk`, `off_track`, `no_data` — v2.1 |

**Trigger (v2.1):** `trg_kpi_value_validation`
- Calcula `period_start/end/label` automaticamente via `kpi_calculate_period()`
- Calcula `rag_status` via `kpi_calculate_rag()`
- **Gate de comentário:** Obrigatório se RAG = `at_risk` ou `off_track`
- **Default confidence:** `medium` para manual/NULL, `high` para integração

**Escopo:** Por BU (via KPI)

**Índice de Unicidade:** `(kpi_id, period_start, period_end)` WHERE NOT NULL — previne duplicidade de período

---

### 2.4 Módulo Assets (Patrimônio)

O módulo Assets controla bens patrimoniais, chaves e brindes com **3 sub-módulos independentes**, cada um com permissões próprias.

#### Permissões do Módulo Assets

| Role | Descrição |
|------|-----------|
| `assets_admin` | Administra todos os sub-módulos na BU |
| `inventory_admin` | Gerencia apenas Inventário |
| `inventory_manager` | Movimenta itens do Inventário |
| `keys_admin` | Gerencia apenas Chaves |
| `keys_manager` | Registra retirada/devolução de chaves |
| `gifts_admin` | Gerencia apenas Brindes |
| `gifts_manager` | Registra entradas e saídas de brindes |
| `viewer` | Apenas visualiza |

Tabela: `asset_permissions`

---

#### **asset_inventory** — Itens de Inventário
Bens patrimoniais rastreáveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| name | text | Nome do item |
| internal_code | text | Código interno (etiqueta/QR) - único por BU |
| category_id | uuid | FK para asset_categories |
| status | enum | `available`, `loaned`, `maintenance`, `written_off` |
| home_location_id | uuid | Sede padrão do item |
| current_holder_type | enum | `location`, `user` |
| current_location_id | uuid | Local atual (se holder=location) |
| current_user_id | uuid | Usuário atual (se holder=user) |
| quantity_total | int | Quantidade total |
| quantity_available | int | Quantidade disponível |
| brand | text | Marca |
| model | text | Modelo |
| serial_number | text | Número de série |
| acquisition_value | numeric | Valor de aquisição |
| acquired_at | date | Data de aquisição |
| photos | jsonb | URLs das fotos |
| documents | jsonb | URLs de documentos |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**URL pública:** `https://hub.jetimob.com/assets/{internal_code}` (dados sanitizados via Edge Function `get-public-asset`)

---

#### **asset_groups** — Kits de Inventário
Agrupamento de itens (kits de notebook + acessórios).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| name | text | Nome do kit |
| primary_asset_id | uuid | FK para asset_inventory (item principal) |
| type | enum | `kit`, `bundle` |
| notes | text | Observações |
| status | enum | `active`, `inactive` |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras:**
- Um item pode pertencer a apenas 1 kit ativo por vez
- `primary_asset_id` deve existir em `asset_group_items` com role `primary`
- Trigger `sync_primary_asset_id` mantém consistência automática

---

#### **asset_group_items** — Itens de Kits
Vínculo entre itens de inventário e kits.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| group_id | uuid | FK para asset_groups |
| asset_id | uuid | FK para asset_inventory |
| role | enum | `primary`, `accessory` |
| is_required | bool | Se é obrigatório (checkout junto) |
| quantity | int | Quantidade (default 1) |
| notes | text | Observações |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras:**
- Índice único: `(asset_id)` onde `deleted_at IS NULL` e kit `active`
- Item não pode estar em 2 kits ativos simultaneamente
- Acessórios `is_required = true` são incluídos automaticamente no checkout do primário

---

#### **asset_movements** — Movimentações de Inventário
Histórico de movimentações.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| asset_id | uuid | FK para asset_inventory |
| movement_type | enum | `checkout`, `return`, `transfer`, `maintenance_start`, `maintenance_end`, `write_off` |
| from_holder_type | enum | `location`, `user` |
| from_location_id | uuid | Local de origem |
| from_user_id | uuid | Usuário de origem |
| to_holder_type | enum | `location`, `user` |
| to_location_id | uuid | Local de destino |
| to_user_id | uuid | Usuário de destino |
| authorized_by_user_id | uuid | Quem autorizou |
| performed_by_user_id | uuid | Quem registrou |
| occurred_at | timestamp | Data/hora da movimentação |
| due_at | timestamp | Prazo de devolução |
| notes | text | Observações |

**Escopo:** Por BU

**Regra:** Histórico nunca é apagado. Trigger atualiza status do item.

---

#### **asset_clavicularies** — Claviculários
Armários de chaves.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| location_id | uuid | FK para bu_locations |
| name | text | Nome do claviculário |
| status | enum | `active`, `inactive` |

---

#### **asset_hooks** — Ganchos
Posições no claviculário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| claviculary_id | uuid | FK para clavicularies |
| hook_number | int | Número do gancho (único por claviculário) |
| occupied | bool | Se está ocupado |
| notes | text | Observações |

---

#### **asset_keyrings** — Chaveiros
Conjunto de chaves.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| claviculary_id | uuid | Claviculário onde pertence |
| hook_id | uuid | Gancho atual (quando guardado) |
| name | text | Nome do chaveiro |
| tag_number | text | Número da etiqueta (único por BU) |
| status | enum | `available`, `loaned`, `lost`, `retired` |
| current_user_id | uuid | Usuário atual (se emprestado) |

**Regra:** `hook_number` deve bater com `tag_number` ao devolver.

---

#### **asset_keys** — Chaves Individuais
Chaves individuais dentro de chaveiros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| keyring_id | uuid | FK para keyring (opcional) |
| tag_number | text | Número da etiqueta (único por BU) |
| description | text | Descrição (ex: "Porta sala reuniões") |
| access_type | enum | `door`, `padlock`, `gate`, `other` |
| status | enum | `in_claviculary`, `loaned`, `lost`, `retired` |

---

#### **asset_key_movements** — Movimentações de Chaves
Histórico de retirada/devolução de chaveiros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| keyring_id | uuid | FK para keyring |
| movement_type | enum | `checkout`, `return`, `transfer`, `lost`, `retired` |
| user_id | uuid | Quem está com o chaveiro |
| authorized_by_user_id | uuid | Quem autorizou |
| performed_by_user_id | uuid | Quem registrou |
| from_claviculary_id | uuid | Claviculário de origem |
| from_hook_id | uuid | Gancho de origem |
| to_claviculary_id | uuid | Claviculário de destino |
| to_hook_id | uuid | Gancho de destino |
| occurred_at | timestamp | Data/hora |
| due_at | timestamp | Prazo de devolução |
| notes | text | Observações |

---

#### **asset_gift_items** — Itens de Brinde
Tipos de brindes disponíveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| name | text | Nome do item |
| category | text | Categoria (camisetas, canecas, etc.) |
| status | enum | `active`, `inactive` |

---

#### **asset_gift_batches** — Lotes de Brindes
Lotes de entrada de brindes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| gift_item_id | uuid | FK para gift_item |
| batch_code | text | Código do lote |
| acquired_at | date | Data de aquisição |
| quantity_in | int | Quantidade entrada |
| quantity_available | int | Quantidade disponível |
| campaign | text | Campanha relacionada |
| cost_center | text | Centro de custo |

---

#### **asset_gift_movements** — Movimentações de Brindes
Entradas e saídas de brindes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| gift_item_id | uuid | FK para gift_item |
| batch_id | uuid | FK para batch (opcional) |
| movement_type | enum | `in`, `out`, `adjustment` |
| quantity | int | Quantidade |
| destination_type | enum | `event`, `campaign`, `person`, `other` |
| destination_description | text | Descrição do destino |
| performed_by_user_id | uuid | Quem registrou |
| occurred_at | timestamp | Data/hora |
| notes | text | Observações |

**Regra:** Não permitir `out` se `quantity_available` insuficiente.

---

### 2.5 Módulo Integrações & IA

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

### 2.6 Módulo Automações

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
| assets | `assets.inventory.created`, `assets.inventory.movement.created`, `assets.inventory.overdue` |
| keys | `assets.keys.keyring.checked_out`, `assets.keys.keyring.returned`, `assets.keys.overdue` |
| gifts | `assets.gifts.batch.created`, `assets.gifts.movement.created`, `assets.gifts.low_stock` |
| locations | `bu.location_created`, `bu.location_updated`, `bu.location_default_changed` |

---

#### **automation_action_catalog** — Catálogo de Ações
Ações que podem ser executadas via API externa.

| Categoria | Ações |
|-----------|-------|
| kpis | `kpi.add_value` |
| krs | `kr.update_value`, `kr.add_checkin` |
| system | `system.healthcheck` |

---

### 2.7 Outras Entidades

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

#### **user_saved_links** — Links Salvos
Links personalizados por usuário/módulo com suporte a favoritos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK para profiles.id (owner do link) |
| bu_id | uuid | FK para bu_units |
| module_slug | text | Slug do módulo (okrs, tickets, etc.) |
| label | text | Nome do link (max 50 chars) |
| path | text | Path completo com query params (max 500 chars) |
| is_favorite | bool | Se é o link favorito do módulo |

**Escopo:** Por usuário + BU

**Regras críticas:**
- RLS: `user_id = my_profile_id()` (usuário só vê seus próprios links)
- Apenas **1 link favorito por módulo/BU** (trigger `ensure_single_favorite_link()`)
- Link favorito é usado como destino padrão no sidebar

**Module Slugs Registrados:**

| moduleSlug | Página | Rota |
|------------|--------|------|
| `okrs` | OKRs Dashboard | `/okrs` |
| `kpis` | KPIs Dashboard | `/kpis` |
| `kpis-evolution` | KPIs Evolução | `/kpis/evolution` |
| `assets-inventory` | Inventário de Ativos | `/assets/inventory` |
| `assets-keys` | Chaves | `/assets/keys` |
| `assets-gifts` | Brindes | `/assets/gifts` |
| `tickets` | Tickets | `/tickets` |

**Hooks canônicos:**
- `useSavedLinks({ moduleSlug })` — CRUD de links do módulo
- `useModuleFavoriteLink({ moduleSlug })` — Busca apenas o favorito (leve)
- `useFavoriteLinks()` — Busca todos os favoritos (usado pelo sidebar)

**Componentes:**
- `SavedLinksPopover` — UI para gerenciar links salvos (posicionar na `ViewOptionsBar`)
- `SaveLinkDialog` — Modal para criar novo link

---

### 2.8 Módulo Partners (Empresas Externas)

#### **external_companies** — Empresas Externas (Global)
Empresas externas que podem acessar o Hub via contatos. Substitui `partner_companies`.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | **DEPRECATED** — FK para bu_units (nullable, mantido para compatibilidade) |
| name | text | Nome fantasia |
| legal_name | text | Razão social |
| person_type | text | `pf` (pessoa física) ou `pj` (pessoa jurídica) |
| document | text | CPF ou CNPJ (único globalmente) |
| document_type | text | `cpf` ou `cnpj` |
| allowed_domains | text[] | Domínios de email permitidos para login |
| status | enum | `active`, `inactive` |
| notes | text | Observações |
| deleted_at | timestamp | Soft delete |

**Escopo:** Global (empresa é única por CPF/CNPJ no sistema)

**Mudança v2.76.0:**
- Tabela renomeada de `partner_companies` para `external_companies`
- Coluna `partner_company_id` renomeada para `external_company_id` em todas as tabelas relacionadas
- Views e RPCs atualizadas para usar nova nomenclatura

**Função SQL:**
- `find_partner_by_document(p_document text)` — Busca empresa por CPF/CNPJ normalizado

---

#### **external_company_bu_associations** — Associações de Empresas por BU
Vínculo entre empresas externas globais e BUs específicas. Substitui `partner_company_bu_associations`.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| external_company_id | uuid | FK para external_companies |
| bu_id | uuid | FK para bu_units |
| role | text | Papel da empresa: `partner`, `supplier`, `customer` |
| is_active | bool | Se associação está ativa na BU |
| notes | text | Observações da BU |
| created_by | uuid | FK para profiles (quem criou) |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras:**
- Uma empresa pode estar associada a múltiplas BUs
- Cada BU pode ativar/desativar a empresa independentemente
- RLS baseada em `is_current_bu(bu_id)` para isolamento
- Índice único: `(external_company_id, bu_id)` onde `deleted_at IS NULL`

---

#### **partner_contacts** — Contatos de Parceiros (Global)
Pessoas de contato vinculadas a empresas externas. **Globais por email** (v2.46.0).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units (DEPRECATED, usar associações) |
| external_company_id | uuid | FK para external_companies |
| profile_user_id | uuid | FK para profiles (se usuário existir) |
| name | text | Nome do contato |
| email | text | Email do contato **(UNIQUE global)** |
| phone | text | Telefone |
| status | enum | `active`, `inactive` |
| created_at | timestamp | Data de criação |
| deleted_at | timestamp | Soft delete |

**Escopo:** Global (único por email)

**Mudança v2.76.0:**
- Coluna `partner_company_id` renomeada para `external_company_id`
- FK agora aponta para `external_companies`

**Regras (v2.46.0):**
- Email é único globalmente: `UNIQUE (lower(email)) WHERE deleted_at IS NULL`
- Vínculo com BUs gerenciado via `partner_contact_bu_associations`
- Campo `bu_id` mantido para backward compatibility, será removido em versão futura
- Um contato pode estar ativo em múltiplas BUs simultaneamente
- Fluxo de cadastro: verificar email → se existir, ativar na BU → se não, criar novo

---

#### **partner_contact_bu_associations** — Associações de Contatos por BU (v2.46.0)
Tabela de vínculo N:N entre contatos de parceiros e Business Units.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| partner_contact_id | uuid | FK para partner_contacts |
| bu_id | uuid | FK para bu_units |
| is_active | bool | Se associação está ativa na BU |
| notes | text | Observações da BU |
| created_by | uuid | FK para profiles (quem criou) |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Regras:**
- Um contato pode estar associado a múltiplas BUs
- Cada BU pode ativar/desativar o contato independentemente
- RLS baseada em `is_current_bu(bu_id)` para isolamento
- Índice único: `(partner_contact_id, bu_id)`
- Login de contato requer associação ativa na BU

---

#### **partner_service_mappings** — Mapeamento de Serviços
Vínculo entre empresas externas e categorias de tickets que atendem.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| external_company_id | uuid | FK para external_companies |
| category_id | uuid | FK para ticket_categories |
| subcategory_id | uuid | FK para ticket_subcategories (nullable) |
| is_generalist | bool | Se atende todas as subcategorias da categoria |
| status | enum | `active`, `inactive` |
| deleted_at | timestamp | Soft delete |

**Escopo:** Por BU

**Mudança v2.76.0:**
- Coluna `partner_company_id` renomeada para `external_company_id`

**Regras:**
- Usado para auto-routing de tickets por categoria
- Uma empresa pode atender múltiplas categorias
- Uma categoria pode ter múltiplas empresas parceiras

---

## 3. Módulos do Hub

### 3.1 Módulos Ativos

| Módulo | Slug | Objetivo | Status |
|--------|------|----------|--------|
| **Home** | - | Dashboard pessoal com OKRs, aniversários, cultura, novos Jetimobers | ✅ Ativo |
| **OKRs** | `okrs` | Gestão de Objectives e Key Results | ✅ Ativo |
| **KPIs** | `kpis` | Indicadores de performance | ✅ Ativo |
| **Times** | `teams` | Estrutura organizacional (inclui Organogram Text Export) | ✅ Ativo |
| **Assets** | `assets` | Patrimônio (Inventário, Chaves, Brindes) | ✅ Ativo |
| **Integrações** | `integrations` | Gerenciamento de integrações e agentes IA | ✅ Ativo |
| **Automações** | `automations` | Webhooks de entrada/saída | ✅ Ativo |
| **Vic** | `vic` | Assistente de IA contextual | ✅ Ativo |
| **Tickets** | `tickets` | Sistema de tickets com routing e parceiros | ✅ Ativo |
| **BU Management** | `bu` | Gerenciamento de Business Units | ✅ Ativo (admin) |

### 3.2 Sub-módulos do Assets

| Sub-módulo | Rota | Descrição | Permissões |
|------------|------|-----------|------------|
| **Inventário** | `/assets/inventory` | Bens patrimoniais com etiqueta/QR | `inventory_admin`, `inventory_manager`, `viewer` |
| **Chaves** | `/assets/keys` | Claviculários, chaveiros, chaves | `keys_admin`, `keys_manager`, `viewer` |
| **Brindes** | `/assets/gifts` | Itens de consumo por lotes | `gifts_admin`, `gifts_manager`, `viewer` |
| **Relatórios** | `/assets/reports` | Visão agregada com deep links | Respeita permissões por sub-módulo |
| **Configurações** | `/assets/settings` | Gerenciamento de permissões | Apenas `assets_admin` |

#### URL State Parameters (Assets)

| Página | Parâmetro | Valores | Descrição |
|--------|-----------|---------|-----------|
| `/assets/inventory` | `status` | `all`, `available`, `loaned`, `maintenance`, `written_off` | Filtro por status |
| `/assets/inventory` | `overdue` | `true` | Mostrar apenas empréstimos com devolução atrasada |
| `/assets/inventory` | `category` | UUID | Filtro por categoria (hierárquico) |
| `/assets/inventory` | `holder` | UUID | Filtro por portador atual |
| `/assets/inventory` | `location` | UUID | Filtro por localização (hierárquico) |
| `/assets/keys` | `status` | `all`, `available`, `loaned`, `lost` | Filtro por status do chaveiro |
| `/assets/gifts` | `lowStock` | `true` | Mostrar apenas itens com estoque baixo |

#### Deep Links em Relatórios (v2.80.0)

A página `/assets/reports` exibe cards com métricas clicáveis que direcionam para listagens filtradas:

| Card | Métrica | Link |
|------|---------|------|
| Inventário - Disponíveis | Itens available | `/assets/inventory?status=available` |
| Inventário - Emprestados | Itens loaned | `/assets/inventory?status=loaned` |
| Inventário - Manutenção | Itens maintenance | `/assets/inventory?status=maintenance` |
| Chaves - Disponíveis | Chaveiros available | `/assets/keys?status=available` |
| Chaves - Emprestados | Chaveiros loaned | `/assets/keys?status=loaned` |
| Chaves - Extraviados | Chaveiros lost | `/assets/keys?status=lost` |
| Brindes - Estoque baixo | Itens < 10 unidades | `/assets/gifts?lowStock=true` |

#### Card de Devoluções em Atraso (v2.80.0)

Exibido no topo de `/assets/reports` quando há empréstimos com `expected_return_at` no passado:
- Destaque visual com borda e fundo `destructive`
- Lista os 5 primeiros itens com link para detalhe
- Link "Ver todos" → `/assets/inventory?status=loaned&overdue=true`

**Componentes UI implementados:**
- `AssetsLayout.tsx` - Layout com sub-navegação por tabs
- `InventoryPage.tsx`, `KeysPage.tsx`, `GiftsPage.tsx` - Páginas principais
- `InventoryCard.tsx`, `InventoryFilters.tsx`, `InventoryItemDialog.tsx` - Inventário
- `ClavicularyBoard.tsx`, `KeyringsList.tsx`, `ClavicularyDialog.tsx`, `KeyringDialog.tsx` - Chaves
- `GiftItemCard.tsx`, `GiftItemDialog.tsx` - Brindes
- `AddPermissionDialog.tsx` - Configurações de permissão

### 3.2.1 Utilitários do Módulo Teams

| Utilitário | Arquivo | Descrição |
|------------|---------|-----------|
| `organogramToText` | `src/modules/teams/utils/organogramToText.ts` | Converte organograma para ASCII tree |

**Formato de Saída (Organogram Text Export):**
- Header com nome da BU e timestamp
- Estrutura hierárquica (CEO → Áreas → Times → Subtimes → Squads → Membros)
- Respeita filtros ativos (`showMembers`, `showSquads`)
- Footer com contagem de pessoas

**Uso:** Botão de cópia nos controles do organograma (`OrganogramControls`), disponível em modo normal e fullscreen.


Módulos operacionais podem ser habilitados/desabilitados por BU através de:

- **Interface:** `/settings/modules` (aba "Configuração por BU")
- **Tabela:** `bu_module_configs`
- **RPC:** `get_enabled_modules_for_bu(p_bu_id)`

| Campo | Descrição |
|-------|-----------|
| `bu_id` | FK para bu_units |
| `module_id` | FK para modules |
| `is_enabled` | Se está habilitado na BU |
| `enabled_at` | Data de ativação |
| `disabled_at` | Data de desativação |

**Regras:**
- Módulos `global` estão sempre habilitados
- Módulos `operational` dependem de config explícita por BU
- Se não houver registro em `bu_module_configs`, módulo está desabilitado

### 3.4 Módulos em Desenvolvimento

| Módulo | Status | Descrição |
|--------|--------|-----------|
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
- Ao trocar de BU, todos os dados são recarregados (cache do TanStack Query é limpo)

### 4.2.1 BU Scope Enforcement (v2.4+)

```
⚠️ REGRA CRÍTICA: Toda operação INSERT/UPDATE/DELETE em tabelas operacionais é validada no banco.
```

#### Funções SQL de BU Scope

| Função | Descrição |
|--------|-----------|
| `current_bu_id()` | Retorna BU ativa do contexto (via header `x-current-bu-id`). **NUNCA retorna NULL** — se não há BU válida, lança `NO_BU_CONTEXT`. |
| `is_current_bu(bu_id)` | Helper para RLS: retorna `true` se `bu_id` = `current_bu_id()`, `false` em caso de erro. |
| `assert_bu_scope(bu_id)` | Valida se `bu_id` do payload corresponde ao contexto. Lança exceções se inválido. |

**Exceções lançadas por `assert_bu_scope()`:**

| Exceção | Causa |
|---------|-------|
| `MISSING_BU_ID` | Payload tem `bu_id = NULL` |
| `NO_BU_CONTEXT` | Usuário não tem BU válida no contexto |
| `BU_SCOPE_VIOLATION` | `bu_id` do payload ≠ `current_bu_id()` |

#### Triggers de Enforce BU Scope

Trigger `enforce_bu_scope_trigger` aplicado em **BEFORE INSERT/UPDATE** para:

| Módulo | Tabelas |
|--------|---------|
| **OKRs** | `okr_org_objectives`, `okr_org_key_results`, `okr_team_objectives`, `okr_team_key_results`, `okr_checkins`, `okr_initiatives` |
| **Teams** | `teams`, `squads`, `user_team_memberships` |
| **Assets** | `asset_inventory`, `asset_movements`, `asset_keyrings`, `asset_key_movements`, `asset_keys`, `asset_gift_items`, `asset_gift_batches`, `asset_gift_movements`, `asset_clavicularies` |
| **Tickets** | `tickets`, `ticket_messages`, `ticket_attachments` |
| **KPIs** | `kpi_metrics` |

#### RLS Hardening

Todas as RLS policies de tabelas operacionais incluem:

```sql
user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)
```

Isso garante que:
1. Usuário tem membership na BU do registro
2. A BU do registro é a BU ativa no contexto

#### Frontend: Header Injection

**Hook:** `useBuScopedSupabase()` em `src/integrations/supabase/useBuScopedSupabase.ts`

```typescript
// Retorna client Supabase que injeta x-current-bu-id automaticamente
const supabase = useBuScopedSupabase();

// Uso em módulos operacionais
const { data } = await supabase.from('teams').select('*');
```

**Helper para inserts/updates:**

```typescript
import { withBuId } from '@/hooks/useBuScope';

// Adiciona bu_id ao payload
await supabase.from('teams').insert(withBuId({ name: 'Time' }, currentBuId));
```

#### Scanner de Auditoria

**Script:** `scripts/audit-bu-scope.ts`  
**Comando:** `npx tsx scripts/audit-bu-scope.ts`

**Findings reportados:**
- `INSERT_MISSING_BU_ID`: Insert sem `bu_id`
- `UPDATE_MISSING_BU_ID`: Update sem `bu_id`
- `UPSERT_MISSING_BU_ID`: Upsert sem `bu_id`
- `SELECT_MISSING_BU_FILTER`: Select sem filtro de `bu_id`
- `UNKNOWN_DYNAMIC_TABLE`: Tabela dinâmica (variável)

**Exceções:** `scripts/audit-bu-exceptions.json` lista tabelas globais ignoradas.

#### View de Auditoria de bu_id

```sql
-- Verifica tabelas com bu_id NULL
SELECT * FROM v_bu_id_null_report;
```

Retorna: `table_name`, `count_null_bu_id`, `count_total`

### 4.3 Padrão de Links e URLs (v2.1+)

```
⚠️ REGRA: URLs operacionais NÃO contêm buId. BU ativa vem do contexto de sessão.
```

#### Rotas Operacionais (Sem buId na URL)

| Rota | Descrição |
|------|-----------|
| `/` | Home (BU ativa) |
| `/okrs` | Dashboard de OKRs |
| `/kpis` | Dashboard de KPIs |
| `/teams`, `/teams/:id` | Times |
| `/users`, `/users/:id` | Usuários |
| `/tickets`, `/tickets/:id` | Tickets |
| `/assets/inventory`, `/assets/inventory/:id` | Inventário |
| `/assets/keys` | Chaves |
| `/assets/gifts` | Brindes |
| `/settings/*` | Configurações |

#### Links Compartilháveis (Padrão Oficial)

```
⚠️ REGRA: TODO link externo, compartilhável, notificação ou busca global DEVE usar /go/:entity/:id
```

**Helper centralizado:** `src/lib/shareableLinks.ts`

```typescript
import { getShareableUrl, getShareableAbsoluteUrl } from '@/lib/shareableLinks';

// Retorna: /go/asset/uuid-aqui
getShareableUrl('asset', assetId);

// Retorna: https://hub.jetimob.com/go/asset/uuid-aqui  
getShareableAbsoluteUrl('asset', assetId);
```

**Entidades suportadas:**
| Entity | Rota Interna | Uso |
|--------|--------------|-----|
| `asset` | `/assets/inventory/:id` | Itens de inventário |
| `team` | `/teams/:id` | Times |
| `user` | `/users/:id` | Usuários |
| `ticket` | `/tickets/:id` | Tickets |
| `okr_org_objective` | `/okrs/org/:id` | Objetivos organizacionais |
| `okr_team_objective` | `/okrs/team/:id` | Objetivos de time |
| `okr_org_kr` | `/okrs/org/kr/:id` | KRs organizacionais |
| `okr_team_kr` | `/okrs/team/kr/:id` | KRs de time |
| `keyring` | `/assets/keys/keyring/:id` | Chaveiros |
| `gift` | `/assets/gifts/:id` | Brindes |
| `kpi` | `/kpis/:id` | KPIs |

**Onde usar:**
- ✅ Busca global (GlobalSearch)
- ✅ Notificações (context_url)
- ✅ E-mails
- ✅ Menções
- ✅ Botões "Copiar link"
- ✅ QR Codes (novos)
- ✅ Automações/webhooks

**Proibido:**
- ❌ Links diretos como `/assets/inventory/uuid` em contexto compartilhável
- ❌ Incluir buId na URL

#### Rota Resolvedora: `/go/:entity/:id`

Componente: `src/pages/ResolveContextPage.tsx`

**Fluxo:**
1. Valida entidade e ID
2. Busca `bu_id` do recurso no Supabase
3. Verifica acesso do usuário via `user_has_bu_access()`
4. Seta `currentBuId` no contexto (limpa cache do React Query)
5. Redireciona para rota interna

**Se sem acesso:** Exibe tela de erro "Sem permissão"

#### Compatibilidade com QR Codes Físicos (LEGADO)

```
⚠️ CRÍTICO: A rota /assets/:code NUNCA pode ser quebrada (etiquetas já impressas)
```

| Rota | Usuário Logado | Usuário Não Logado |
|------|----------------|-------------------|
| `/assets/0146` | Resolve BU → redireciona para `/go/asset/:uuid` | Renderiza `/p/assets/0146` (público) |
| `/p/assets/0146` | Página pública | Página pública |

**Componente:** `src/pages/PublicAssetRedirect.tsx`

**SQL Functions:**
```sql
-- Normaliza código (remove não-dígitos, aplica LPAD 4)
normalize_asset_code(code_text text) → text

-- Resolve asset por código dentro de uma BU
resolve_asset_by_code_for_bu(p_bu_id uuid, code_text text) → uuid

-- Resolve asset globalmente (retorna asset_id + bu_id)
resolve_asset_by_code_global(code_text text) → (asset_id uuid, bu_id uuid)
```

**Índice obrigatório:**
```sql
UNIQUE (bu_id, internal_code) WHERE deleted_at IS NULL
```

#### Contexto de BU (Sessão)

**Fonte única:** `BuContext` (`src/contexts/BuContext.tsx`)

- `currentBuId`: BU ativa do usuário
- `setCurrentBuId(buId)`: Troca BU e limpa cache do TanStack Query
- `availableBus`: BUs do usuário
- Persistência: `localStorage.setItem('hub.currentBuId', buId)`

**Guard:** `EnsureBuSelected` (se não há BU selecionada, redireciona para `/select-bu`)

### 4.3 Limites de OKRs

- **Máximo 3 objetivos ativos** por time
- **Máximo 3 KRs** por objetivo
- Validado via triggers no banco

### 4.4 Cálculo de Progresso de KR

```typescript
function calculateProgress(baseline, current, target, direction) {
  // Proteção contra divisão por zero
  if (baseline === target) {
    return current >= target ? 100 : 0;
  }
  
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

| Tipo | Descrição | Pode contribuir para KR Org? |
|------|-----------|------------------------------|
| `contribution` | Contribui diretamente para KR organizacional | ✅ Sim |
| `enabler` | Habilita/suporta outros KRs | ❌ Não diretamente |
| `foundational` | Fundacional para o funcionamento | ❌ Nunca |

### 4.7 Responsável (Owner) de KRs

#### Org KRs e Team KRs

Ambas as tabelas `okr_org_key_results` e `okr_team_key_results` possuem o campo `owner_user_id` (referenciando `profiles.id`):

| Tabela | Campo | FK |
|--------|-------|-----|
| `okr_org_key_results` | `owner_user_id` | `okr_org_key_results_owner_profile_fkey` |
| `okr_team_key_results` | `owner_user_id` | `okr_team_key_results_owner_profile_fkey` |

**Queries com Owner Join:**

```typescript
// OKR_FIELDS em useOkrQueries.ts inclui owner para ambos
orgObjectiveWithKrs: `..., key_results:okr_org_key_results(..., owner:profiles!okr_org_key_results_owner_profile_fkey(id, display_name, photo_url))`
teamObjectiveWithKrs: `..., key_results:okr_team_key_results(..., owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name, photo_url))`
```

### 4.8 OKR Wizards — Rituais de Gestão

O Hub implementa 5 wizards full-page para rituais de OKRs, cada um com propósito e periodicidade específicos.

| Wizard | Rota | Propósito | Frequência | Participante |
|--------|------|-----------|------------|--------------|
| **Collaborator Check-in** | `/okrs/collaborator-checkin` | Atualização individual de KRs, iniciativas e reflexão | Semanal (sextas) | Colaborador |
| **Leader Prep** | `/okrs/leader-prep` | Preparação do líder para rituais do time | Semanal (segundas) | Líder de time |
| **Team Check-in** | `/okrs/team-checkin` | Ritual síncrono de revisão coletiva | Semanal | Líder + membros |
| **Managers Check-in** | `/okrs/managers-checkin` | Alinhamento cross-time e resolução de dependências | Quinzenal/Mensal | Gestores de área |
| **C-Level Check-in** | `/okrs/clevel-checkin` | Revisão estratégica de OKRs organizacionais | Mensal | C-Level/Diretores |

**Localização:** `src/modules/okrs/components/wizards/` e `src/modules/okrs/pages/`

**Características comuns:**
- Formato full-page (modal removido em v2.27.0)
- Salvamento de draft automático
- Navegação step-based com validação
- Integração com ciclo trimestral ativo

#### Collaborator Check-in — Filtro de KRs

O wizard de check-in semanal (`/okrs/collaborator-checkin`) busca KRs onde o usuário efetivo:

1. ✅ É **owner** da KR (`owner_user_id = effectiveUserId`)
2. ✅ É **co-responsável** da KR (`co_responsibles` contém `effectiveUserId`)
3. ✅ É **owner de pelo menos uma iniciativa** vinculada à KR

**Hook:** `useUserKrsForWizard` (src/modules/okrs/hooks/useUserKrsForWizard.ts)

```typescript
// Busca KR IDs onde usuário tem iniciativas
const { data: initiativeKrIds } = await supabase
  .from('okr_initiatives')
  .select('kr_id')
  .eq('owner_user_id', effectiveUserId);

// Combina com OR condition
const conditions = [
  `owner_user_id.eq.${effectiveUserId}`,
  `co_responsibles.cs.{${effectiveUserId}}`,
  `id.in.(${krIdsFromInitiatives.join(',')})`  // Novo!
];
```

### 4.9 Vínculo KR ↔ KPI

- KR deve ter **exatamente 1 KPI primary** (obrigatório)
- KR pode ter **0..N KPIs guardrail** (alertas)
- Cálculo de progresso usa apenas KPI primary
- Guardrails geram alertas mas não afetam score

### 4.8 Check-ins

- Check-ins são obrigatórios para mover KRs
- Frequência sugerida: semanal
- Suportam menções (@usuario)
- Atualizam automaticamente `current_value` e `last_checkin_at` do KR

### 4.9 Histórico e Soft Delete

```
⚠️ REGRA: Dados críticos nunca são apagados fisicamente.
```

- Registros usam `deleted_at` para soft delete
- Audit logs registram todas as alterações
- `okr_audit_log` para OKRs, `audit_logs` para demais
- Movimentações de Assets NUNCA são apagadas

### 4.10 Modelo de Identidade (auth.users.id vs profiles.id)

⚠️ **REGRA CRÍTICA: Nunca comparar auth.uid() diretamente com colunas de domínio.**

O Hub usa dois tipos de identidade:

| Tipo | ID | Onde usar |
|------|-----|-----------|
| **Autenticação** | `auth.users.id` | Sessão, roles, memberships, RLS de auth |
| **Domínio** | `profiles.id` | Ownership, liderança, atribuição, holders |

#### Colunas de Domínio (armazenam profiles.id)

| Coluna | Tabelas |
|--------|---------|
| `owner_user_id` | okr_*, kpi_metrics, tickets, okr_initiatives |
| `leader_user_id` | teams, squads |
| `created_by_user_id` | tickets, ticket_messages, ticket_attachments |
| `current_user_id` | asset_inventory, asset_keyrings |
| `to_user_id`, `from_user_id` | asset_movements |
| `performed_by_user_id` | asset_movements, asset_key_movements, asset_gift_movements |
| `authorized_by_user_id` | asset_movements, asset_key_movements |

#### Funções Canônicas SQL

| Função | Descrição |
|--------|-----------|
| `my_profile_id()` | Retorna `profiles.id` do `auth.uid()` atual |
| `my_profile_id_strict()` | Idem, mas lança exceção se não existir |
| `profile_id_from_user_id(uuid)` | Converte `auth.users.id` → `profiles.id` |
| `user_id_from_profile_id(uuid)` | Converte `profiles.id` → `auth.users.id` |
| `is_team_leader(user_id, team_id)` | Verifica liderança (converte internamente) |
| `user_can_manage_team(user_id, team_id)` | Verifica gestão de time |
| `assert_profile_identity(uuid)` | Valida que profile existe e pertence ao usuário |

#### Regras de RLS

```sql
-- ❌ ERRADO: Comparando auth.uid() com coluna de domínio
owner_user_id = auth.uid()

-- ✅ CORRETO: Usando função canônica
owner_user_id = my_profile_id()
```

#### Frontend

```typescript
// Hook para obter profile_id do usuário logado
import { useMyProfileId } from '@/hooks/useMyProfileId';

const { profileId, isLoading } = useMyProfileId();

// Usar profileId para operações de domínio (ownership, etc.)
```

#### Prevenção de Regressão

- **View SQL:** `identity_rls_violations` detecta policies com comparações incorretas
- **Script:** `npm run audit:identity` varre código SQL/TS
- Resultado esperado: **0 violações** em módulos operacionais

> 📚 Ver detalhes completos em [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md)

### 4.11 Regras do Módulo Assets

**Inventário:**
- URL pública sanitizada: `https://hub.jetimob.com/assets/{internal_code}`
- Edge Function `get-public-asset` retorna dados sanitizados
- Visão pública NÃO exibe: nota fiscal, documentos, valor, serial, nome do colaborador
- Movimentações atualizam status automaticamente
- Campo `expected_return_at` calculado a partir de `due_at` da última movimentação de checkout ativa
- Filtro `overdue=true` exibe apenas itens com `expected_return_at < now()`

**Kits:**
- Checkout de item `primary` pode incluir acessórios `is_required = true`
- Ao emprestar primário + acessórios: todos vão para mesmo holder
- Bloqueio se acessório obrigatório estiver em posse de outro usuário/local
- Validação via função `get_kit_required_accessories(asset_id)`

**Chaves:**
- `hook_number` deve bater com `tag_number` do chaveiro ao devolver
- Override de posição apenas para admins (com justificativa)
- Histórico completo de retiradas/devoluções
- Filtro por status via URL state (`?status=available|loaned|lost`)

**Brindes:**
- Controle por lotes e quantidade
- Não possui etiqueta/QR
- OUT não gera devolução
- Validação de estoque em movimentações
- Filtro `lowStock=true` exibe itens com `availableQuantity > 0 && availableQuantity < 10`

**Relatórios (v2.80.0):**
- Métricas clicáveis redirecionam para listagens filtradas via deep links
- Card de devoluções atrasadas exibe itens com `expected_return_at` no passado
- Visibilidade dos cards respeita permissões por sub-módulo

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
| `bu.location_created` | Location completo | Nova sede |
| `bu.location_default_changed` | Location | Sede padrão alterada |
| `assets.inventory.movement.created` | Movimentação | Item movimentado |
| `assets.inventory.overdue` | Asset + due_at | Prazo expirado |
| `assets.keys.keyring.checked_out` | Keyring + user | Chaveiro retirado |
| `assets.keys.keyring.returned` | Keyring + hook | Chaveiro devolvido |
| `assets.gifts.movement.created` | Movimento | Entrada/saída registrada |

### 5.2 Ações Recebidas (Inbound)

| Ação | Payload | Resultado |
|------|---------|-----------|
| `kpi.add_value` | kpi_id, value, date | Registra valor |
| `kr.update_value` | kr_id, value | Atualiza KR |
| `kr.add_checkin` | kr_id, value, notes | Cria check-in |

### 5.3 Integrações Ativas

| Integração | Status | Uso |
|------------|--------|-----|
| SendGrid | ✅ Ativo | Emails (notificações) |
| Google Maps | ✅ Ativo | Autocomplete de endereços e cidades |
| Lovable AI | ✅ Ativo | Agentes Vic |

### 5.4 Integrações Planejadas

| Integração | Status | Uso |
|------------|--------|-----|
| Slack | 🚧 Planejado | Notificações e comandos |
| n8n | 🚧 Planejado | Automações complexas |
| Google Sheets | 🚧 Planejado | Import/export de KPIs |

---

## 6. Débito Técnico e Limitações

### 6.1 Débito Técnico Conhecido

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Tipagem parcial | Alguns componentes sem TypeScript completo | Baixa |
| Testes | Cobertura de testes ainda baixa | Alta |

### 6.2 Limitações Atuais

- **Sem SSO/SAML:** Apenas OTP Code via email
- **Sem mobile app:** Web responsivo apenas
- **Sem modo offline:** Requer conexão constante
- **Edge Functions:** Timeout de 60s

### 6.3 Decisões Temporárias

| Decisão | Motivo | Quando revisar |
|---------|--------|----------------|
| OTP Code único | Simplicidade + compatibilidade com scanners de email | Quando precisar SSO |
| Todos os módulos visíveis | Simplicidade | Quando tiver módulos pagos |

---

## 7. Storage Buckets

| Bucket | Público | Uso | Acesso |
|--------|---------|-----|--------|
| `avatars` | ✅ Sim | Fotos de perfil | Public URL |
| `bu-assets` | ✅ Sim | Logos e símbolos de BUs | Public URL |
| `agent-documents` | ❌ Não | Documentos para RAG de agentes | Signed URL |
| `ticket-attachments` | ❌ Não | Anexos de tickets e mensagens | Signed URL (1h) |

### 7.1 Bucket `ticket-attachments`

**Estrutura de path:** `{bu_id}/{ticket_id}/{message_id}/{timestamp}-{random}.{ext}`

**RLS Policies (v3):**
- **INSERT:** Usuários internos com `tickets.attachment.create:bu` **OU** contatos externos participantes do ticket
- **SELECT:** Usuários/contatos que podem visualizar o ticket (via `can_view_ticket()`)
- **DELETE:** Usuários podem deletar seus próprios uploads dentro de suas BUs

**Hooks relacionados:**
- `useAttachmentUrl()` — Gera signed URL (1 hora de validade)
- `getSignedAttachmentUrl()` — Versão async para uso fora de hooks
- `useCreateMessage()` — Processa uploads de anexos na criação de mensagens

> ⚠️ **Bucket privado:** Usar sempre `createSignedUrl()` para acessar arquivos. Nunca usar `getPublicUrl()`.
> ⚠️ **Storage path:** Armazenar apenas o path interno (ex: `{bu_id}/{ticket_id}/...`), não a URL pública.

---

## 8. Edge Functions

| Função | Descrição | Criticidade |
|--------|-----------|-------------|
| `request-magic-link` | Solicita OTP Code via Supabase Auth (nome histórico mantido) | 🔴 Crítica |
| `auth-email-hook` | Hook para customização de emails | 🔴 Crítica |
| `cron-dispatcher` | Dispatcher central para jobs agendados via pg_cron | 🔴 Crítica |
| `process-notification-outbox` | Processa fila de notificações (email, push) | 🔴 Crítica |
| `invoke-vic` | Invoca agentes Vic (IA) | 🟡 Alta |
| `search-cities` | Autocomplete de cidades (Google Maps) | 🟢 Normal |
| `search-address` | Autocomplete de endereços (Google Places) | 🟢 Normal |
| `get-place-details` | Detalhes de endereço (Google Places) | 🟢 Normal |
| `culture-message` | Gera mensagem de cultura (IA) | 🟢 Normal |
| `process-agent-document` | Processa documentos para RAG | 🟢 Normal |
| `get-tcr` | Retorna TCR para Custom GPT | 🟢 Normal |
| `global-search` | Busca multi-contexto (ver seção 8.1) | 🟢 Normal |
| `get-public-asset` | Retorna dados sanitizados de asset por `internal_code` (público, sem JWT) | 🟢 Normal |
| `okr-construction-review` | Avalia qualidade de OKRs antes do ciclo (IA) | 🟢 Normal |
| `okr-org-health-review` | Avalia saúde de OKRs organizacionais (IA) | 🟢 Normal |
| `evaluate-notification-health` | Avalia saúde do sistema de notificações | 🟢 Normal |
| `send-partner-invite` | Envia convite para parceiros externos | 🟢 Normal |
| `audit-permissions` | Auditoria de permissões (dev-only) | ⚪ Dev |

### 8.1 Global Search

A Edge Function `global-search` implementa busca agregada multi-contexto com suporte a:

**Entidades pesquisadas:**
| Tipo | Tabela | Campos buscados |
|------|--------|-----------------|
| `people` | profiles (via bu_id) | first_name, last_name, display_name, work_email |
| `teams` | teams | name, description |
| `squads` | squads | name, description |
| `okrs` | okr_org_objectives, okr_team_objectives | title |
| `krs` | okr_org_key_results, okr_team_key_results | title |
| `initiatives` | okr_initiatives | name, description |
| `kpis` | kpi_metrics | name, description |
| `locations` | bu_locations | name, formatted_address |
| `assets_inventory` | asset_inventory | name, internal_code, brand, model |
| `assets_keyrings` | asset_keyrings | name, tag_number |
| `assets_keys` | asset_keys | tag_number, description |
| `assets_gift_items` | asset_gift_items | name, category |
| `assets_gift_batches` | asset_gift_batches | batch_code, campaign |
| `assets_kits` | asset_groups | name |

**Segurança:**
- Valida JWT (usuário autenticado)
- Valida acesso à BU via `user_has_bu_access(user_id, bu_id)`
- Para Assets, verifica permissões via `has_asset_permission()`:
  - Inventário: `assets_admin`, `inventory_admin`, `inventory_manager`, `viewer`
  - Chaves: `assets_admin`, `keys_admin`, `keys_manager`, `viewer`
  - Brindes: `assets_admin`, `gifts_admin`, `gifts_manager`, `viewer`

**Input:**
```json
{
  "bu_id": "uuid",
  "q": "termo de busca",
  "limit_per_type": 5
}
```

**Output:**
```json
{
  "query": "termo",
  "groups": [
    {
      "type": "people",
      "label": "Pessoas",
      "results": [
        {
          "id": "uuid",
          "type": "people",
          "title": "Nome Completo",
          "subtitle": "Cargo",
          "meta": {},
          "url": "/profile/uuid",
          "icon": "user"
        }
      ]
    }
  ]
}
```

**Frontend:**
- Componente: `src/components/layout/GlobalSearch.tsx` (Command Palette)
- Hook: `src/hooks/useGlobalSearch.ts` (debounce 300ms + TanStack Query)
- Página expandida: `src/pages/SearchPage.tsx` (rota `/search`)
- Atalho de teclado: `⌘K` / `Ctrl+K`

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
│       ├── hooks/      # Hooks do módulo (barrel file: hooks/index.ts)
│       │   ├── queries/    # Hooks de query (opcional)
│       │   ├── mutations/  # Hooks de mutation (opcional)
│       │   └── index.ts    # BARREL FILE (re-exports tudo)
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

### 10.4 Barrel Files de Hooks (v2.31.0+)

Cada módulo DEVE ter um `hooks/index.ts` que exporta TODOS os hooks do módulo:

```typescript
// src/modules/[module]/hooks/index.ts

// ✅ CORRETO: Barrel file consolidado
export * from './queries';  // Se existir subpasta
export * from './useSpecificHook';
export type { SomeType } from './types';
```

**Regras:**
1. **Proibido** importar hooks direto do arquivo (ex: `from './hooks/useTeams'`)
2. **Obrigatório** importar do barrel (ex: `from './hooks'` ou `from '@/modules/teams/hooks'`)
3. Subpastas (`queries/`, `mutations/`) devem ter seu próprio `index.ts`
4. O barrel file do módulo re-exporta tudo de subpastas

**Módulos com barrel file consolidado:**
| Módulo | Barrel File |
|--------|-------------|
| `okrs` | `src/modules/okrs/hooks/index.ts` |
| `teams` | `src/modules/teams/hooks/index.ts` |
| `assets` | `src/modules/assets/hooks/index.ts` |
| `tickets` | `src/modules/tickets/hooks/index.ts` |
| `permissions` | `src/modules/permissions/hooks/index.ts` |
| `bu` | `src/modules/bu/hooks/index.ts` |
| `automations` | `src/modules/automations/hooks/index.ts` |
| `kpis` | `src/modules/kpis/hooks/index.ts` |
| `settings` | `src/modules/settings/hooks/index.ts` |
| `integrations` | `src/modules/integrations/hooks/index.ts` |
| `home` | `src/modules/home/hooks/index.ts` |
| `vic` | `src/modules/vic/hooks/index.ts` |

---

## 11. Versionamento

| Campo | Valor |
|-------|-------|
| **Versão do TCR** | 2.88.0 |
| **Data da última atualização** | 2026-02-04 |
| **Responsável** | Lovable AI |
| **Supabase Project ID** | oiwnghihyqdsinouwmga |
| **Status V1 Permissions** | ❌ Removido definitivamente (Wave 9) |
| **Permission Keys** | 160 |
| **Permission Templates V2** | 27 |
| **Permission Presets** | 12 |
| **Módulos com Hooks Consolidados** | 12 ✅ |
| **Módulos com Saved Links** | 3 (OKRs, Assets, Tickets) ✅ |
| **Notification Templates Ativos** | 19 (v2) ✅ |

---

## Changelog

### v2.91.0 (2026-02-04) — Google Tag Manager Integration
- **Google Tag Manager via Painel de Integrações**:
  - GTM adicionado ao catálogo de integrações (`hub_integrations_catalog`)
  - Configuração do Container ID via `/hub/integrations/google-tag-manager`
  - GA4 agora é gerenciado dentro do GTM (não mais no código)
- **Analytics Module Refatorado**:
  - `src/lib/analytics/gtag.ts` — Funções migradas para GTM `dataLayer.push()`
  - `src/lib/analytics/useGtmConfig.ts` — Hook para buscar Container ID dinamicamente
  - `initGTM(containerId)` substitui `initGA4()` (deprecated)
  - Funções mantidas (API compatível): `setTenantId`, `trackVirtualPageView`, `trackEvent`, `pushToDataLayer`, `initSessionContext`
- **Inicialização Dinâmica**:
  - `GtmInitializer` componente no `App.tsx` carrega GTM após buscar config
  - `main.tsx` limpo — GTM não é mais inicializado no bootstrap
- **Fluxo de Dados**:
  ```
  Hub → dataLayer.push() → GTM → GA4 (configurado no GTM)
  ```
- **User Property**: `tenant_id` (bu_id) enviado via `tenant_selected` event

### v2.88.0 (2026-02-04) — Listing Page Layout Standardization
- **Novo Padrão de Layout de Listagem**:
  - Estrutura hierárquica: `PageHeader` → `SummaryCards` → `ListPageFilters` → `ViewOptionsBar` → `Content`
  - Linha 1: Busca + Filtros (todos inline)
  - Linha 2: Contador de resultados (esquerda) + Toggle de visualização (direita)
- **Novo Componente `ViewOptionsBar`** (`src/components/ui/view-options-bar.tsx`):
  - Padroniza layout: contador à esquerda + controles à direita
  - Props: `resultCount`, `resultCountLabel`, `resultCountLabelSingular`, `children`
- **Refatoração de `ListPageFilters`**:
  - Removidas props: `actions`, `resultCount`, `resultCountLabel`, `resultCountLabelSingular`
  - Foco exclusivo: busca + filtros inline (children)
- **Páginas Atualizadas**:
  - `/kpis` — Novo layout com ViewOptionsBar
  - `/kpis/evolution` — Novo layout com ViewOptionsBar + tabs
  - `/users` — Breadcrumbs integrados no PageHeader
  - `/assets/inventory` — ViewOptionsBar com contador
  - `/assets/keys` — Layout inline busca + ação
  - `/assets/gifts` — Layout inline busca + ações
  - `/settings/areas` — Ação movida para PageHeader
- **Anti-patterns Novos** (UI_COMPONENTS_REGISTRY v1.4.0):
  - #12: ViewToggle dentro de ListPageFilters.actions → Usar ViewOptionsBar separado
  - #13: Contador de resultados misturado com filtros → Mover para ViewOptionsBar
- **Documentação**: UI_COMPONENTS_REGISTRY.md seções 5.3, 5.4, 5.5 atualizadas

### v2.81.0 (2026-02-03) — Remoção de health_indicator
- **Enum `kpi_indicator_type` simplificado** — Removido tipo `health_indicator`
- Sistema agora opera apenas com: `kpi` (indicador estratégico) e `metric` (medição operacional)
- Zero registros afetados (nenhum dado usava o tipo removido)
- Migration recriou o enum PostgreSQL com apenas valores válidos

### v2.80.0 (2026-02-03) — Assets Reports Deep Links + Overdue Loans Alert
- **Assets Reports Deep Links v1.0**:
  - Métricas nos cards de `/assets/reports` agora são clicáveis com deep links
  - Inventário: Total, Disponíveis, Emprestados, Em Manutenção → links para listagem filtrada
  - Chaves: Total, Disponíveis, Emprestados, Extraviados → links para listagem filtrada
  - Brindes: Total, Estoque baixo → links para listagem filtrada
  - Componente reutilizável `ReportStatItem` com suporte a Link e variantes de cor
- **Overdue Loans Alert Card v1.0**:
  - Novo card destacado em `/assets/reports` para devoluções em atraso
  - Exibe até 5 itens críticos com link para detalhe
  - Link "Ver todos" navega para `/assets/inventory?status=loaned&overdue=true`
  - Lógica baseada em `isPast(expected_return_at)`
- **URL State para Assets**:
  - `InventoryPage`: novo filtro `overdue=true` para empréstimos atrasados
  - `KeysPage`: novo filtro `status` (available|loaned|lost) via URL state
  - `GiftsPage`: novo filtro `lowStock=true` para estoque baixo
- **Documentação**: TCR seção 3.2 e 4.11 atualizadas

### v2.79.0 (2026-02-03) — KPI Evolution v2.1
- **KPI Module Evolution v2.1** — Transforma KPIs em instrumentos de gestão auditáveis:
  - **Novos Enums** (4): `kpi_indicator_type`, `kpi_lifecycle_status`, `kpi_confidence_level`, `kpi_rag_status`
  - **Expansão de Enum**: `kpi_value_source` agora inclui `api`, `webhook`, `spreadsheet`, `database`
  - **Novas Colunas em `kpi_metrics`** (4):
    - `indicator_type` — Classifica: KPI, Métrica
    - `lifecycle_status` — Ciclo de vida: Proposto, Ativo, Em Observação, Depreciado
    - `target_source` — Fonte/URL do target/benchmark
    - `recovery_protocol` — Protocolo de recuperação quando fora da meta
  - **Novas Colunas em `kpi_values`** (5):
    - `period_start`, `period_end`, `period_label` — Período ISO week aligned
    - `confidence` — Nível de confiança (high/medium/low)
    - `rag_status` — Status RAG calculado automaticamente
  - **Funções SQL**:
    - `kpi_calculate_rag(value, target, direction)` — Cálculo RAG com proteção divisão por zero
    - `kpi_calculate_period(reference_date, frequency)` — Cálculo de período ISO
  - **Trigger `trg_kpi_value_validation`**:
    - Calcula período automaticamente quando NULL
    - Calcula RAG status em INSERT/UPDATE
    - Gate: comentário obrigatório para KPIs amarelos/vermelhos
    - Default confidence baseado em source
  - **Índices de Performance** (11 novos): Otimiza queries por BU, owner, team, lifecycle, RAG
  - **Índice de Unicidade por Período**: Previne duplicidade de valores por período
  - **Frontend**:
    - `useKpisForWizard.ts` — Hook fail-safe para wizards OKR (retorna latest value, RAG, needs_update)
    - Types, labels e interfaces atualizados em `types.ts`
    - Query keys: `kpisKeys.forWizard()`, `kpisKeys.byRagStatus()`
- **Documentação**: TCR seção 2.3 atualizada com campos v2.1

### v2.78.0 (2026-02-02)
- **Organogram Text Export v1.0**:
  - Novo utilitário `organogramToText.ts` para conversão ASCII
  - Botão de exportar em `OrganogramControls` (normal + fullscreen)
  - Formato legível para análise por LLMs (GPT, Claude)
  - Respeita filtros de visualização (membros, squads)
  - Copia para clipboard com toast de confirmação
- **Dashboard Ticket Links v1.0**:
  - Contadores de tickets na home agora são clicáveis
  - Links navegam para `/tickets` com filtros pré-aplicados
  - "Abertos" → `/tickets`
  - "Vencidos" → `/tickets?overdue=true`
  - "Vence hoje" → `/tickets?due_today=true`
- **PII Security Views Update v1.0**:
  - Views `v_bu_active_profiles` e `v_profiles_directory` atualizadas
  - Removidos campos sensíveis: `whatsapp_personal`, `instagram_id`, `discord_id`
  - Views agora usam `security_invoker = on`
  - Dados PII acessíveis apenas via RPC `get_profile_with_privacy()`
- **OKR Wizards Documentation**:
  - Seção 4.8 expandida com documentação dos 5 wizards
  - Tabela com propósito, frequência e participantes de cada ritual

### v2.77.0 (2026-01-30) — Result Count Pattern + Subcategory Filter Fix
- **Padrão de Contador de Resultados**:
  - `ListPageFilters` agora aceita prop `resultCount` para exibir "X itens encontrados"
  - Props adicionais: `resultCountLabel` (plural), `resultCountLabelSingular` (singular)
  - Formatação com `toLocaleString("pt-BR")` para números grandes
  - Implementado como exemplo em `InventoryPage`
- **Correção de Filtro de Subcategoria**:
  - Filtro hierárquico de categoria em Assets corrigido
  - Lógica anterior só funcionava para categorias pai
  - Nova lógica: categoria pai inclui filhos, subcategoria requer match exato
  - Mesmo fix aplicado para localização hierárquica

### v2.76.0 (2026-01-30) — External Companies Migration
- **Migração de Nomenclatura**:
  - `partner_companies` → `external_companies`
  - `partner_company_id` → `external_company_id` em todas as tabelas
  - `partner_company_bu_associations` → `external_company_bu_associations`
- **RPCs Atualizadas**:
  - `get_partner_categories(p_external_company_id)`
  - `get_partner_subcategories(p_external_company_id, p_category_id)`
  - `search_mention_candidates(p_bu_id, p_external_company_id, ...)`
- **Joins Atualizados**:
  - Todas as queries de tickets usam `external_company:external_companies(...)`
  - Componentes de filtro e hover cards corrigidos

### v2.73.0 (2026-01-23) — Generic Messaging Reply System v1.0
- **Sistema de Reply Genérico (estilo WhatsApp)**:
  - Nova coluna `reply_to_message_id` em `ticket_messages` (FK self-referencing)
  - Índice parcial `idx_ticket_messages_reply_to` para queries eficientes
  - Suporte completo para usuários internos e externos
- **Componentes Genéricos de Mensagens** (`src/components/messaging/`):
  - Arquitetura reutilizável para futuros módulos (Projetos, etc.)
  - Interfaces: `GenericMessage`, `MessageParticipant`, `MessageThreadConfig`
  - Componentes: `MessageBubble`, `QuotedMessage`, `ReplyPreview`
  - Configs: `DEFAULT_INTERNAL_CONFIG`, `DEFAULT_EXTERNAL_CONFIG`
- **Integração com Tickets**:
  - `TicketMessageBubble` e `TicketMessageComposer` como adapters
  - Query JOIN para buscar dados do reply (`reply_to.author_user`, `reply_to.author_contact`)
  - Estado `replyingTo` em `TicketDetailPage` para modo de resposta
  - Correção de `isOwnMessage` para verificar `author_contact_id` em externos
  - `onScrollToMessage` implementado para clicar na citação e rolar
- **Documentação**:
  - Schema Reference atualizado com `reply_to_message_id`
  - Data Model Registry atualizado com FKs de `ticket_messages`
  - Memory: `generic-messaging-reply-system` criado

### v2.55.0 (2026-01-22) — Impersonation Wildcard Fix + can_view_ticket Hybrid User Support
- **Impersonation Wildcard Fix v1.0**:
  - Corrigido bug onde módulos não apareciam ao impersonar admin de BU
  - `usePermissions().isWildcard` agora reflete corretamente as permissões do usuário impersonado
  - Durante impersonação de admin BU: `isWildcard = true` (porque recebe `*` do backend)
  - Durante impersonação de colaborador comum: `isWildcard = false`
  - Atualizado `useModuleAccess.ts` e `useAssetPermissionsV2.ts` para usar `isWildcard` durante impersonação
  - Documentação `IMPERSONATION_AWARE_COMPONENTS.md` atualizada com novo comportamento
- **can_view_ticket Hybrid User Support v1.0**:
  - Corrigida função `can_view_ticket()` para suportar usuários híbridos (profile + partner_contact)
  - Usuários externos com profile que foram adicionados como participantes via `partner_contact_id` agora podem ver o ticket
  - Ordem de verificação atualizada: 1) Creator/owner, 2) Participante interno, 3) Participante externo via auth.uid, 4) Profile com partner_contact, 5) Regras de visibilidade
  - Corrigido enum `'all'` → `'bu_all'` e removido `'squads'` inexistente

### v2.89.0 (2026-02-04) — Saved Links for KPIs Evolution
- **Saved Links System v1.3**:
  - Página `/kpis/evolution` agora suporta links salvos com favoritos
  - `SavedLinksPopover` adicionado à `ViewOptionsBar` seguindo novo padrão de layout
  - moduleSlug: `kpis-evolution` para persistência de filtros de evolução
  - Módulos com Saved Links: OKRs, KPIs Dashboard, KPIs Evolution, Assets, Tickets

### v2.54.0 (2026-01-22) — Saved Links for Tickets Module
- **Saved Links System v1.2**:
  - Módulo Tickets agora suporta links salvos com favoritos
  - `SavedLinksPopover` adicionado ao `PageHeader` de `/tickets`
  - Padrão consistente com OKRs e Assets
  - Módulos com Saved Links: OKRs, Assets, Tickets

### v2.53.0 (2026-01-22) — Notification Templates v2 + Tickets UI Enhancement
- **Notification Templates v2**:
  - 19 templates de email atualizados com novo padrão de subject: `[{{bu_name}}] ... - {{current_datetime}}`
  - 35+ variáveis registradas em `notification_template_variables`
  - Triggers enriquecidos: `notify_ticket_message_created`, `notify_ticket_status_changed`, `notify_asset_checkout`, `notify_team_membership_changed`
  - Edge Function `process-notification-outbox` atualizado para resolver `actor_name` dinamicamente
  - Formato de data padronizado: `DD/MM às HH:MM`
- **Tickets Table Enhancement**:
  - Coluna "Criado por" adicionada à listagem de tickets com avatar e nome
  - Campo `created_by` já estava disponível no select, agora exibido na UI
- **External User Onboarding Fix**:
  - Corrigido loop de tela branca após onboarding de usuários externos
  - Rota `/select-bu` agora pula verificação de onboarding para evitar condição de corrida
  - Auto-redirect para single-BU users com fallback seguro

### v2.52.0 (2026-01-22) — ON CONFLICT Index Fixes

### v2.45.0 (2026-01-21) — Global Partner Companies + Home Module Access Control
- **Estrutura Global de Partner Companies**:
  - Tabela `partner_companies` agora é global (CPF/CNPJ único no sistema)
  - Nova tabela `partner_company_bu_associations` para vínculo empresa ↔ BU
  - Campos adicionados: `person_type`, `document`, `document_type`
  - Índice único em `document` para evitar duplicatas globais
  - Função SQL `find_partner_by_document(p_document text)` para busca global
  - Edge Function `request-magic-link` atualizada para validar via associações
  - Frontend `PartnerCompanyDialog` com campos PF/PJ e CPF/CNPJ mascarado
  - Hooks: `useGlobalPartners`, `usePartnerBuAssociations`
- **Controle de Acesso por Módulo na Home**:
  - Cards de OKRs (Rituais, LeaderDashboard, MyOkrsCard, OkrSummaryCard, TeamStatusCard) 
    ocultos para usuários sem acesso ao módulo `/okrs`
  - Uso de `useModuleAccess().hasModuleAccess("okrs")` para controle condicional
  - Afeta usuários internos e externos sem permissão no módulo OKRs
- **Documentação**:
  - Seção 2.8 (Módulo Partners) adicionada ao TCR
  - Critérios de OTP atualizados para refletir nova estrutura

### v2.42.0 (2026-01-16) — Team OKR/KR Linking Edit
- **Security Fixes (2 error-level issues)**:
  - RLS habilitado em `perf_metrics_snapshots` com política deny-all para authenticated
  - 3 views convertidas de SECURITY DEFINER para SECURITY INVOKER:
    - `v_pending_checkins`, `v_shared_okrs_summary`, `v_team_contributed_okrs`
- **Performance Wave P5.1 — 7 índices críticos**:
  - `idx_user_roles_user_id` — lookup por user_id (-90% seq scans)
  - `idx_user_roles_user_role` — validação has_role() composta
  - `idx_profiles_bu_active` — filtro por bu_id onde não deletado (-80% seq scans)
  - `idx_ai_agent_documents_agent` — filtro por agent_id (-100% seq scans)
  - `idx_bu_locations_bu` — filtro por bu_id onde não deletado
  - `idx_asset_movements_asset` — histórico por asset ordenado por data
  - `idx_asset_movements_bu_date` — listagem por BU ordenada por data
  - Impacto estimado: **-16M sequential scans**
- **Documentação**:
  - Novo: `docs/engineering/PERFORMANCE_ACTION_PLAN_P5.md` — Plano Wave P5
  - Atualizado: `SLOW_QUERIES_ACTION_PLAN.md` → v1.5.0

### v2.38.0 (2026-01-15) — OKR Status Filter & UI Polish
- **Filtro de status `discarded` em OKRs**:
  - Hooks `useOrgObjectives` e `useTeamObjectives` agora excluem objetivos com status `discarded` por padrão
  - Antes: apenas `cancelled` era excluído. Agora: `cancelled` E `discarded` são excluídos
  - Opção `includeAllStatuses: true` permite incluir todos os status quando necessário
  - Arquivos alterados: `src/modules/okrs/hooks/queries/useOkrQueries.ts`
- **Cards de Times com altura uniforme**:
  - `TeamCard.tsx` atualizado com `h-full flex flex-col` para altura consistente no grid
  - Footer do card agora usa `mt-auto` para alinhar ao fundo
- **Página de Permissões BU simplificada**:
  - Removido `TabsList` com única tab "Usuários" (redundante)
  - Layout simplificado mantendo funcionalidade completa
- **Organograma melhorado**:
  - Expansão padrão: CEO, Áreas e Times de primeiro nível expandidos, subtimes colapsados
  - Novo toggle "Expandir/Recolher tudo" nos controles do organograma
  - Props `expansionMode` e `expansionKey` para controle global de estado

### v2.37.0 (2026-01-15) — Areas Strategic Layer
- **Áreas (camada estratégica) implementadas**:
  - Tabela `areas` com líder, co-líder, cor, ícone e status
  - Áreas NÃO possuem OKRs (diferente de times)
  - Interface de gestão em `/settings/areas`
  - Vínculo `teams.area_id` para associar times a áreas
- **Cobertura de testes para Teams/Areas**:
  - Novos testes para `TeamCard`, `TeamForm`, `AreaForm`
  - Integração com framework de testes automatizados

### v2.36.0 (2026-01-15) — Saved Links System
- **Sistema de Links Salvos implementado**:
  - Nova tabela `user_saved_links` para armazenar links personalizados por módulo
  - Usuário pode salvar quantos links quiser com filtros preservados
  - Um link pode ser marcado como **favorito** por módulo (único por módulo/BU)
  - Link favorito torna-se o destino padrão ao clicar no menu lateral
- **Arquitetura**:
  - Tabela: `user_saved_links` (RLS por `user_id = my_profile_id()`)
  - Query Keys: `src/lib/queryKeys/savedLinks.ts`
  - Hooks: `useSavedLinks`, `useModuleFavoriteLink`, `useFavoriteLinks`
  - Componentes: `SaveLinkDialog`, `SavedLinksPopover`
  - Barrel: `src/shared/saved-links/index.ts`
- **Integração com Sidebar**:
  - `DynamicSidebar.tsx` e `MobileSidebar.tsx` usam `useFavoriteLinks()`
  - Função `getFavoriteHref(moduleSlug, defaultHref)` retorna path favorito ou fallback
- **Primeiro módulo integrado**: OKRs (`/okrs`)
- **Expansão planejada**: Tickets, KPIs, Assets, Teams

### v2.35.0 (2026-01-15) — Cancel Filter Fix
- **Filtro de cancelados corrigido em todo sistema OKRs**:
  - Views `v_shared_okrs_summary` e `v_team_contributed_okrs` atualizadas
  - RPC `get_cycle_checkins` filtrado por `cancelled_at IS NULL` e `status != 'cancelled'`
  - Hooks frontend atualizados para excluir objetivos/KRs/iniciativas cancelados

### v2.31.0 (2026-01-14) — Hooks Consolidation Wave
- **Consolidação de Hooks em todos os módulos**:
  - Criado/atualizado `hooks/index.ts` (barrel file) em 12 módulos
  - Módulos consolidados: `okrs`, `teams`, `assets`, `tickets`, `permissions`, `bu`, `automations`, `kpis`, `settings`, `integrations`, `home`, `vic`
  - Arquivos legados duplicados removidos (`useOrgObjectiveView.ts`, `useTeamContributedOkrs.ts`)
  - Imports atualizados para usar barrel files centrais
- **Estrutura padrão de hooks por módulo**:
  - `hooks/index.ts` como ponto único de export
  - Subpastas opcionais (`queries/`, `mutations/`) com seus próprios barrel files
  - Proibido import direto de arquivos (sempre via barrel)
- **OKRs Org-View Fix**:
  - `LinkedTeamObjectivesSection` exibe objetivos de times vinculados a objetivos organizacionais
  - Tipo `LinkedTeamObjective` adicionado ao módulo de queries
  - Query `useOrgObjectiveView` atualizada para buscar `linkedTeamObjectives`
- **Documentação atualizada**:
  - TCR seção 10.4 com regras de barrel files
  - DEVELOPMENT_STANDARDS seção K com imports de hooks
  - SHARED_COMPONENTS_REGISTRY atualizado

### v2.30.0 (2026-01-13) — Org KR Owner + Wizard Initiative Filter
- **Org KR Owner implementado**
- **Wizard Initiative Filter aprimorado**

### v2.52.0 (2026-01-22) — ON CONFLICT Index Fixes
- **FIX: `ticket_participants` unique index constraints**:
  - Índices `idx_ticket_participants_unique_user` e `idx_ticket_participants_unique_contact` recriados
  - Removida condição `is_active = true` que impedia `ON CONFLICT` de funcionar
  - Nova definição: `UNIQUE (ticket_id, profile_id) WHERE profile_id IS NOT NULL`
  - Corrige erro `42P10` no trigger `auto_add_ticket_mention_as_participant`
- **FIX: `notification_outbox` dedupe key index**:
  - Índice `idx_notification_outbox_dedupe_key` convertido de parcial para não-parcial
  - Permite `ON CONFLICT (dedupe_key) DO NOTHING` em `emit_notification_event()`
  - Corrige erro `42P10` no trigger `notify_ticket_message_created`
- **BU-Scoped Client JWT Fallback**:
  - `readAccessTokenFromStorage()` agora varre `localStorage` para encontrar token
  - Fallback para `sb-*-auth-token` keys se o canonical key falhar
  - Previne requests como `anon` em ambientes com storage key variável

### v2.49.0 (2026-01-21) — Tickets Module Enhancements
- **Pinned Messages v1.0**:
  - Colunas adicionadas: `is_pinned`, `pinned_at`, `pinned_by_user_id` em `ticket_messages`
  - Função `can_pin_ticket_message(p_profile_id, p_ticket_id)` valida permissão
  - Hook `usePinMessage()` + helper `canUserPinMessages()` para UI
  - Mensagens fixadas aparecem no topo da conversa com destaque visual
- **Ticket Transfer System v1.0**:
  - Hook `useTransferTicket()` para transferência entre responsáveis (interno ↔ interno, externo ↔ externo)
  - Mensagem de sistema registrada no histórico do ticket
  - Notificação `ticket.assigned` emitida para novo responsável
  - Validação: tickets internos só podem ser transferidos para usuários internos; externos só para contatos da mesma empresa
- **Attachments RLS v3 (External Access)**:
  - Nova policy `ticket_attachments_insert_v3` permite contatos externos participantes fazer upload
  - Verificação via `ticket_participants.partner_contact_id` + `partner_contacts.user_id = auth.uid()`
  - Storage path usa path interno (não URL pública) para bucket privado
- **Hook Canônico `usePartnerCompanyContacts`**:
  - Listar contatos ativos de uma empresa parceira específica
  - POST-BU compliant, queryKeys centralizadas
  - Usado em `TicketTransferModal` para seleção de contatos externos

### v2.48.0 (2026-01-21) — RLS Security Audit v1.0
- **6 Correções Críticas de RLS** (ver `docs/engineering/RLS_SECURITY_AUDIT_2026-01-21.md`):
  - Recursão infinita em `partner_contacts` ↔ `partner_contact_bu_associations`
  - Identity mismatch: `has_permission(auth.uid())` → `has_permission(my_profile_id())`
  - Self-reference bug em `partner_contacts` UPDATE policy
  - Overly permissive INSERT em tabelas de audit
- **Funções SECURITY DEFINER**:
  - `get_user_partner_contact_id(auth.uid())` — Retorna contact_id sem disparar RLS recursiva

### v2.47.0 (2026-01-21) — Mention Triggers for External Contacts
- **Triggers de Menções Ativados**:
  - `trg_auto_add_ticket_mention_as_participant` — Auto-adiciona usuário/contato mencionado como participante do ticket (role: `watcher`)
  - `trg_notify_ticket_mention` — Notifica usuário/contato mencionado via sistema centralizado (`emit_notification_event`)
- **Suporte Completo a Contatos Externos**:
  - Função `notify_ticket_mention` refatorada para usar `emit_notification_event`
  - Contatos externos são notificados por e-mail (via `notification_outbox`)
  - Contatos externos com `profile_user_id` recebem notificação in-app
  - Contatos mencionados ganham acesso automático ao ticket via RLS
- **Fluxo Completo**:
  1. Usuário menciona contato externo → Trigger cria participante (watcher)
  2. Trigger emite evento `mention.created` → Notificação e-mail + in-app
  3. Contato externo pode visualizar e responder no ticket

### v2.19.0 (2026-01-12) — Mentions Global Restoration
- **Correção Arquitetural**: Tabela `mentions` restaurada como tabela global canônica
  - A tabela `mentions` é agora a fonte única para menções em todos os módulos (tickets, OKRs, etc)
  - Usa `entity_type` + `entity_id` para identificar o contexto (ex: `ticket_message`, `ticket`, `okr`)
  - Tabela `ticket_mentions` foi removida (era específica, agora centralizado em `mentions`)
- **Código atualizado**: `useTickets.ts`, `useTicketMessages.ts` usam `mentions` com `entity_type`

### v2.18.0 (2026-01-12) — Codebase Hygiene Wave 7
- **Higienização de Banco de Dados**:
  - Função `_identity_dual_mode_deadline` removida (cutover concluído)
  - Funções de retenção criadas: `cleanup_old_agent_logs()` (90 dias), `cleanup_old_cron_logs()` (30 dias)
- **Índices de Performance**:
  - `idx_okr_team_objectives_bu_team_status` — OKR queries
  - `idx_notifications_user_read_created` — Inbox do usuário
  - `idx_notification_outbox_status_pending` — Processamento de outbox
- **Documentação**:
  - Novo documento `HYGIENE_AND_OPTIMIZATION_PLAN_2026-01.md` com roadmap completo
  - Wave 1 (Higienização Crítica) concluída
  - Waves 2-4 planejadas (centralização, refatoração OKRs, performance)

### v2.17.0 (2026-01-11) — Notification Admin RLS Hardening
- **RLS Policies corrigidas para telas administrativas de notificações**:
  - `notification_outbox` (SELECT): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.outbox.view:bu`)
  - `notification_outbox` (UPDATE): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.outbox.retry:bu`)
  - `notifications` (SELECT para admin view): agora exige `is_current_bu(bu_id)` + (`super_admin` OR `admin` OR `notifications.bu.view:bu` OR `notifications.bu.manage:bu`)
- **Permission Keys usadas** (já existentes no catálogo):
  - `notifications.outbox.view:bu` — Ver fila de envio de notificações (outbox)
  - `notifications.outbox.retry:bu` — Reprocessar notificações com falha
  - `notifications.bu.view:bu` — Ver configuração de notificações da BU
  - `notifications.bu.manage:bu` — Gerenciar canais e eventos de notificação da BU
- **Correção de padrão**: todas as policies agora usam o sufixo `:scope` canônico (ex: `:bu`) conforme TCR v2.11+

### v2.13.0 (2026-01-09) — V2-Only Mode & Governance Hardening
- **V1 Permissions completamente removido** (Wave 9 Final):
  - Todas tabelas V1 dropadas: `permission_groups`, `permission_group_permissions`, `bu_user_permission_groups`, `permission_key_aliases`
  - Funções V1 removidas: `resolve_permission_key`, `log_legacy_key_usage`, `block_v1_writes`
  - Frontend limpo: `usePermissionAliases`, `AliasesTab.tsx` removidos
  - **V2 é a única fonte de verdade para controle de acesso**
- **Wave 10 — Governance Gate Enforced**:
  - Presets inteligentes (12 configurados): `assets_viewer`, `assets_operator`, `okrs_leader`, `tickets_admin`, etc.
  - Visual Diff obrigatório antes de aplicar alterações
  - Motivo obrigatório (min 10 chars) para qualquer alteração de permissão
  - Logs de auditoria estruturados em `permission_audit_log`
  - Views de governança: `v_permission_risk_report`, `v_users_without_templates`
  - `PermissionDiffDialog` + `PermissionExplanationDrawer` no frontend
- **User Directory Global v2** consolidado:
  - View canônica `v_bu_active_profiles` como fonte única
  - Hooks: `useBuUsersDirectory`, componentes: `BuUserSelect`, `BuUserMultiSelect`
  - Regra: usuários aparecem no diretório mesmo com `profiles.user_id = NULL`
  - Audit script `audit-user-directory.ts` retorna 0 findings
- **OKR Cycle Checkins**:
  - RPC `get_cycle_checkins` com feed paginado, agregações e KRs overdue
  - Página `/okrs/checkins` com tabs Feed, Pendências, Resumo
  - Filtros por time, owner, confidence, status via URL state
- **Métricas atualizadas**:
  - Permission Keys: 160 (era 143)
  - Templates V2: 27
  - Presets: 12
  - User Assignments V2: 37

### v2.12.0 (2026-01-08) — Wave 7-9 Consolidation
- **Wave 7 — Sunset V1 (Permissions)**:
  - Modelo de permissões v1 congelado (read-only) via triggers
  - UI de edição v1 removida (apenas visualização legado)
  - Sistema de migração controlada v1 → v2 implementado
- **Wave 8-9 — DROP V1**:
  - Tabelas e funções V1 removidas definitivamente
  - Guardrail view `users_without_v2_permissions` implementado
  - Auto-assign trigger para template base V2

### v2.11.0 (2026-01-08) — Notifications & OKR Hardening
- **Central de Notificações V1 completa**:
  - Outbox Pattern implementado com retry automático
  - Templates versionados por evento/canal
  - Canais ativos: `in_app`, `email` (Slack/WhatsApp planejados)
  - Views de observabilidade: `v_notification_delivery_health`, `v_notification_failures`
- **OKR Team Scope Hardening**:
  - Função `get_manageable_teams()` para RBAC de times
  - RLS enforced para objetivos e KRs por hierarquia de times

### v2.10.0 (2026-01-08)
- **Auditoria Global completa** do Hub:
  - Relatório `docs/GLOBAL_AUDIT_REPORT.md` com 7 áreas auditadas
  - Checklist QA manual `docs/QA_GLOBAL_AUDIT.md` com 80+ testes
  - 1 débito crítico identificado (uso de supabase raw em módulos operacionais)
  - 6 débitos médios, 7 débitos baixos documentados
- **Validação de Permissões**:
  - `usePermissions()` funcionando corretamente
  - `PermissionGuard` e `RequirePermission` operacionais
  - Wildcard `['*']` para admins confirmado
- **BU Scope Audit**:
  - 15+ arquivos identificados usando supabase raw (a migrar)
  - 14 tabelas com bu_id nullable (a corrigir)
  - Tabelas de Assets/Tickets corretamente NOT NULL
- **Edge Functions**:
  - `global-search` validando BU access corretamente
  - `process-notification-outbox` funcional com retry
  - Recomendação: adicionar middleware de logging estruturado
- **Notificações V1 validado**:
  - Idempotência via dedupe_key funcionando
  - Views de observabilidade operacionais

### v2.6.0 (2026-01-07) — Central de Notificações V1 Completa
- **Complementos da Central de Notificações**:
  - Tabela `notification_templates` para templates por evento/canal
  - Coluna `dedupe_key` na `notification_outbox` com UNIQUE INDEX para idempotência
  - Views de observabilidade: `v_notification_delivery_health`, `v_notification_failures`
  - Função `emit_notification_event` atualizada para gerar `dedupe_key` automaticamente
  - Templates padrão para 10 eventos principais (email)
  - Proteção contra duplicatas in-app (5 minutos)
- **Formato dedupe_key**: `{event_slug}:{recipient_id}:{channel}:{context_type}:{context_id}`
- **Relatório completo** em `docs/NOTIFICATION_SYSTEM_REPORT.md`

### v2.5.0 (2026-01-07) — Central de Notificações Base
- **Central de Notificações** implementada (arquitetura escalável multi-canal):
  - 6 novas tabelas: `notification_events`, `notification_channels`, `bu_notification_channels`, `user_notification_preferences_v2`, `notification_outbox`, coluna `event_slug` em `notifications`
  - Governança em 3 níveis: Global (catálogo de eventos/canais), BU (configuração de canais), Usuário (preferências pessoais)
  - Função SQL `emit_notification_event(p_event_slug, p_bu_id, p_recipient_ids, p_title, p_message, p_context_type, p_context_id, p_context_url, p_metadata)`
  - Suporte a eventos obrigatórios (`is_mandatory = true`) que ignoram preferências
  - Suporte a audiência (`internal`, `external`, `both`) para controle de usuários externos
  - 5 canais configurados: `in_app`, `email`, `slack`, `whatsapp`, `webhook`
  - 18 eventos padrão em 6 módulos (core, okrs, tickets, assets, teams, kpis)
  - Edge Function `process-notification-outbox` para envio assíncrono com retry
  - RLS policies completas em todas as tabelas
- **Frontend de Notificações**:
  - `/hub/notifications` — Gerenciamento global de eventos e canais (super_admin)
  - `/settings/notifications` — Configuração de canais por BU (admin)
  - `/me/notifications` — Preferências pessoais do usuário
  - Hook `useNotificationCenter` com mutations para todas as operações
- **Preparação para canais futuros**:
  - Arquitetura desacoplada via `notification_outbox`
  - Payloads genéricos em JSONB
  - Retry automático com exponential backoff
- **QA Checklist** documentado em `docs/QA_NOTIFICATIONS.md`
- **Compliance Report** em `docs/NOTIFICATIONS_COMPLIANCE_REPORT.md`

### v2.4.0 (2026-01-07) — BU Scope Enforcement
- **BU Scope Enforcement** implementado (segurança multi-tenant):
  - `current_bu_id()` atualizado para **NUNCA retornar NULL** — lança `NO_BU_CONTEXT` se inválido
  - `is_current_bu(bu_id)` helper seguro para RLS policies
  - `assert_bu_scope(bu_id)` valida BU em triggers, lança `MISSING_BU_ID`, `NO_BU_CONTEXT`, `BU_SCOPE_VIOLATION`
  - Triggers `enforce_bu_scope_trigger` aplicados a 20+ tabelas operacionais (OKRs, Teams, Assets, Tickets, KPIs)
  - RLS policies atualizadas: `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`
  - View `v_bu_id_null_report` para auditoria de registros sem `bu_id`
- **Frontend BU Scope**:
  - Novo hook `useBuScopedSupabase()` injeta header `x-current-bu-id` automaticamente
  - Helper `createBuScopedClient(buId)` para uso fora de React
  - Helper `withBuId(payload, buId)` para inserts/updates explícitos
- **Scanner de auditoria**:
  - Script `scripts/audit-bu-scope.ts` detecta operações sem `bu_id`
  - Arquivo `scripts/audit-bu-exceptions.json` lista tabelas globais ignoradas
  - Findings: `INSERT_MISSING_BU_ID`, `UPDATE_MISSING_BU_ID`, `SELECT_MISSING_BU_FILTER`
- **QA Checklist** documentado em `docs/qa/QA_BU_SCOPE.md`

### v2.3.0 (2026-01-06) — Full Hierarchy Enforcement
- **Hierarquia de Times (Enforcement Total no Frontend)**:
  - Componentes `TeamCard`, `TeamsPage`, `TeamDetailPage`, `SquadSection` usam `canManageTeam()`
  - Botões de edição/deleção só aparecem se `canManageTeam(teamId)` retornar true
  - Regra consistente entre backend (RLS) e frontend (UI guards)
- **Links Compartilháveis na Busca Global**:
  - Edge Function `global-search` atualizada para retornar `/go/:entity/:id` em todas as URLs
  - Entidades: `user`, `team`, `ticket`, `okr_org_objective`, `okr_team_objective`, `okr_org_kr`, `okr_team_kr`, `kpi`, `asset`, `keyring`, `gift`
  - Nenhum link direto para rotas operacionais em resultados de busca
- **Remoção total de referências a "CEO"**:
  - Comentários e referências a "CEO" removidos do frontend
  - Apenas `super_admin` e `admin` são roles válidos no sistema
- **Query Keys Centralizadas**:
  - Hook `useSharedData.ts` migrado para usar `queryKeys` de `src/lib/queryKeys.ts`

### v2.2.0 (2026-01-06) — Permission & Team Hierarchy Hardening
- **Remoção definitiva do role "ceo"**:
  - Removido de `is_bu_admin()` e demais funções SQL
  - Removidas referências no frontend (useAuth, usePageTitle, useHomeDashboard)
  - Apenas `super_admin` e `admin` são roles válidos
- **Hierarquia de Times (SQL Functions)**:
  - `is_team_leader(user_id, team_id)`: verifica liderança direta
  - `team_is_ancestor(ancestor_id, team_id)`: verifica ancestralidade via CTE recursiva
  - `team_is_descendant(team_id, ancestor_id)`: verifica descendência via CTE recursiva
  - `user_can_manage_team(user_id, team_id)`: regra FINAL de gestão (líder direto OU admin)
  - `get_manageable_teams(user_id, bu_id)`: retorna IDs dos times gerenciáveis
- **Frontend Team Management**:
  - Novo hook `useTeamManagement()` em `src/hooks/useTeamManagement.ts`
  - Helper `canManageTeam(teamId)` para controle de UI
  - Array `manageableTeamIds` para filtragem
- **Regras de gestão de times documentadas**:
  - Líder gerencia APENAS próprio time e filhos diretos
  - Proibido gerenciar time pai, irmãos ou outros ramos
  - Admins e super_admins podem gerenciar qualquer time da BU

### v2.1.0 (2026-01-06) — TCR Consolidation
- **Documentação consolidada** do novo padrão de links:
  - Seção 4.3 reescrita para refletir remoção de `buId` da URL
  - Tabela completa de entidades suportadas pelo `/go/:entity/:id`
  - Documentação do helper `getShareableUrl()` e `getShareableAbsoluteUrl()`
  - Regras claras de onde usar links compartilháveis vs internos
  - Fluxo detalhado do `ResolveContextPage`
  - Documentação das SQL functions para códigos de assets
- **Contexto de BU** documentado como fonte única de verdade
- **Removidas referências obsoletas** a `/bu/:buId/` nas rotas

### v2.46.0 (2026-01-21)
- **Global Partner Contacts v1.0**:
  - Contatos de parceiros agora são globais (únicos por email)
  - Nova tabela `partner_contact_bu_associations` para vínculo N:N entre contatos e BUs
  - Constraint `UNIQUE (lower(email)) WHERE deleted_at IS NULL` em `partner_contacts`
  - Campo `bu_id` em `partner_contacts` tornado nullable (deprecated)
  - Migração automática de dados existentes para nova estrutura
  - RLS atualizada para ler contatos via tabela de associações
  - Modal de cadastro refatorado para fluxo multi-step:
    - Step 1: Verificação de email (busca global)
    - Step 2a: Contato existente → botão "Ativar nesta BU"
    - Step 2b: Contato novo → formulário completo
  - Novos hooks: `useCheckContactByEmail`, `useActivateContactInBu`, `useCreateGlobalContact`
  - Edge functions atualizadas: `send-partner-invite`, `request-magic-link`
  - Hook `useExternalUser` atualizado para buscar BUs via associações
  - Hook `usePartnerContacts` atualizado para listar via associações

### v2.0.0 (2026-01-06) — Link Standard Refactoring
- **Padrão Oficial de Links Compartilháveis**:
  - Formato único: `/go/:entity/:id` para TODOS os links externos, compartilháveis, notificações, busca
  - Entidades suportadas: `asset`, `team`, `user`, `ticket`, `okr_org_objective`, `okr_team_objective`, `okr_org_kr`, `okr_team_kr`, `keyring`, `gift`, `kpi`
  - Helper centralizado: `getShareableUrl(entity, id)` em `src/lib/shareableLinks.ts`
  - Links internos nunca incluem `buId` na URL
- **Compatibilidade com QR Codes Físicos**:
  - Rota legada `/assets/:code` mantida permanentemente (etiquetas já impressas)
  - Se usuário autenticado → resolve BU via `resolve_asset_by_code_global()` → redireciona para `/go/asset/:uuid`
  - Se não autenticado → renderiza página pública `/p/assets/:code`
- **SQL Functions para Asset Codes**:
  - `normalize_asset_code(code)`: remove não-dígitos, aplica LPAD(4)
  - `resolve_asset_by_code_for_bu(bu_id, code)`: resolve asset UUID dentro de uma BU
  - `resolve_asset_by_code_global(code)`: resolve asset UUID + bu_id globalmente (SECURITY DEFINER)
  - Índice único parcial: `(bu_id, internal_code) WHERE deleted_at IS NULL`
- **PublicAssetRedirect refatorado**:
  - Detecta autenticação antes de decidir entre público/interno
  - Usa RPC `resolve_asset_by_code_global` para normalizar código
  - Troca BU automaticamente antes de navegar
- **Edge Function `get-public-asset`**:
  - Usa `resolve_asset_by_code_global()` para normalização consistente
  - `internal_view_path` retorna `/go/asset/{uuid}` sempre
- **ResolveContextPage expandido**:
  - Novas entidades: `okr_org_kr`, `okr_team_kr`, `kpi`
  - Labels e rotas para todas entidades do Hub

### v2.15.0 (2026-01-11)
- **Auditoria Completa e Limpeza**:
  - Análise completa de DB/Backend/Frontend executada
  - Todos os componentes UI não utilizados removidos (carousel, menubar, context-menu, toggle-group, navigation-menu, input-otp, aspect-ratio, resizable, toggle)
  - Dependências npm correspondentes removidas
  - Hooks mock removidos (useMockOkrData, useMockKpiData)
  - **NOTA**: Entrada sobre `mentions` estava incorreta — ver v2.19.0 para correção
- **Relatório de Saúde Técnica**:
  - Novo documento `HEALTH_REPORT_2026-01-11.md` com status completo
  - Zero violações de padrões TCR
  - 100% compliance com standards de segurança
  - RLS em todas as tabelas operacionais
  - SECURITY INVOKER em todas as views
  - search_path fixo em todas as funções
- **Índice de Documentação Consolidado**:
  - TCR header atualizado com links para todos os docs técnicos
  - Documentação categorizada por área (Padrões, Dados, Identity, Compliance, Ops)
- **Linter Status**:
  - SECURITY DEFINER Views: falso positivo (security_invoker=true em reloptions)
  - RLS WITH CHECK(true): 4 tabelas de audit (exceção documentada)
  - Extension in public: warning aceitável

### v2.14.0 (2026-01-10)
- **Wave 8 — External User Dashboard**:
  - Dashboard dedicado para usuários externos (`employment_status = 'external'`)
  - Novo hook `useExternalUser()` para detecção e dados específicos
  - Componentes: `ExternalHero`, `ExternalTicketsSection`, `ExternalQuickActions`
  - Rota `/external` com guarda `ExternalDashboardPage`
  - RLS para tickets: contatos externos veem apenas tickets onde são `assigned_contact_id`
  - Notificações filtradas para externos
- **Performance Sweep (Wave P2.3)**:
  - 23 índices de banco adicionados para performance
  - Agregação RPC para dashboards implementada

### v2.10.0 (2026-01-08)
- **Modelo de Identidade documentado e enforced**:
  - Nova seção 4.10 "Modelo de Identidade (auth.users.id vs profiles.id)"
  - Funções canônicas: `my_profile_id()`, `my_profile_id_strict()`, `profile_id_from_user_id()`, `user_id_from_profile_id()`, `assert_profile_identity()`
  - View `identity_rls_violations` para detectar RLS policies incorretas
  - Script `npm run audit:identity` para varredura de código
  - Correção de 18 policies RLS em OKRs, Tickets, KPIs, Teams
  - Correção de 4 registros legados em Assets (auth.users.id → profiles.id)
  - Documentação completa em `docs/IDENTITY_CONVENTION.md` v2.0
  - Relatórios: `IDENTITY_FULL_SYSTEM_COMPLIANCE_REPORT.md`, `IDENTITY_PREVENTION_REPORT.md`
- **Regra de Ouro**: Colunas de domínio (`owner_user_id`, `leader_user_id`, `current_user_id`, etc.) armazenam `profiles.id`. Comparações em RLS devem usar `my_profile_id()`, nunca `auth.uid()` diretamente.

### v1.9.0 (2026-01-06)
- **BU Session Core** implementado (remoção de `buId` da URL):
  - Nova página `ResolveContextPage` (`/go/:entity/:id`) resolve BU do recurso antes de navegar
  - Entidades suportadas: `asset`, `team`, `user`, `ticket`, `okr_org_objective`, `okr_team_objective`, `keyring`, `gift`
  - Valida acesso do usuário à BU via `user_has_bu_access()` antes de redirecionar
  - Telas de loading e erro dedicadas para UX fluida
  - `BuContext.setCurrentBuId()` agora limpa cache do TanStack Query (`queryClient.clear()`)
- **Edge Function `get-public-asset`** atualizada:
  - `internal_view_path` agora aponta para `/go/asset/{id}` (resolve BU automaticamente)
  - Links externos sempre passam pelo resolver para garantir BU correta
- **Padrão de links compartilháveis**:
  - Links públicos, busca global e notificações devem usar `/go/{entity}/{id}`
  - Rotas operacionais não têm mais `buId` na URL
  - BU ativa vem exclusivamente do contexto de sessão (`currentBuId`)

### v1.8.0 (2026-01-06)
- **Permission Core** implementado:
  - Nova função SQL `get_my_permissions(bu_id)` retorna array de permission keys
  - Novo hook `usePermissions()` centralizado em `src/hooks/usePermissions.ts`
  - Novo guard `RequirePermission` em `src/components/auth/RequirePermission.tsx`
  - Admins/super_admins recebem `['*']` (wildcard)
- **Remoção do role "ceo"**:
  - Tipo `HomeDashboardData.role` agora usa `"executive" | "leader" | "collaborator"`
  - `CeoDashboardPage` renomeado para `ExecutiveDashboardPage`
  - Rota `/okrs/ceo` alterada para `/okrs/executive`
  - Removidas referências a "ceo" e "director" do frontend
- **Novas permissões no catálogo**: `hub.global.view`, `hub.global.manage`

### v1.7.0 (2026-01-06)
- **RLS para BU Admins** aprimorado:
  - **Teams/Squads**: BU admins podem gerenciar times, squads, memberships
  - **Profiles**: BU admins podem visualizar e editar perfis da sua BU
- **Sistema de Permissões (UI)**: aba "Grupos" mostra mensagem para admins de BU

### v1.6.0 (2026-01-06)
- **Kits de Inventário** implementados:
  - Novas tabelas: `asset_groups`, `asset_group_items`
  - Enums: `asset_group_type`, `asset_group_status`, `asset_group_item_role`
  - Triggers para sincronização automática de `primary_asset_id`
  - Função `get_kit_required_accessories(asset_id)` para checkout integrado
  - Componentes: `KitSection`, `CreateKitDialog`, `AddToKitDialog`, `KitCheckoutInfo`
  - Hook: `useAssetGroups` para CRUD de kits
  - Busca global inclui kits (`assets_kits`)
- **Página Pública de Assets** aprimorada:
  - Edge Function `get-public-asset` retorna dados sanitizados (sem JWT)
  - Campos públicos: name, internal_code, status, photos, holder_summary, due_at, last_moved_at
  - Dados da BU: name, legal_entity, cnpj
  - Itens relacionados (kit) sanitizados
  - Nunca expõe: serial_number, acquisition_value, documents, current_user_id, nomes
  - Rota `/assets/:code` compatível com QR codes existentes
- **BU Aware Routing** implementado:
  - Padrão de rotas: `/bu/:buId/{moduleRoute...}` para todos os módulos operacionais
  - Helper: `getBuScopedPath(buId, path)` em `src/lib/buRouting.ts`
  - Hook: `useBuRouting()` e `useRequiredBuId()` em `src/hooks/useBuRouting.ts`
  - Guard: `BuScopedRoute` valida acesso à BU e sincroniza contexto
  - Invalidação automática de TanStack Query ao trocar BU
  - Links internos sempre usam BU explícita na URL
  - Página pública monta link interno com `bu_id` do asset
  - Rotas legadas redirecionam para versão bu-scoped
  - Módulos cobertos: assets, okrs, teams, users, tickets

### v1.5.0 (2026-01-06)
- **Migração de componentes para padrão centralizado**:
  - `OkrStatusBadge`: Agora usa `StatusDot` compartilhado
  - `TeamKrListItem`: Migrado para `StatusBadge` centralizado
  - `InventoryDetailView`, `GiftItemCard`: Status badge padronizado
  - `ProtectedRoute`, `BuRequiredRoute`, `AdminRoute`: Migrados para `LoadingState`
  - `KpiDashboardPage`, `ClaviculariesTab`, `TeamContributionPage`: Loaders centralizados
  - `SearchPage`, `GlobalIntegrationsPage`: `EmptyState` e `ErrorState` padronizados
  - `OkrsPage`, `KpiDashboardPage`, `TicketsPage`, `Users`, `SearchPage`: `PageHeader` centralizado
- **Query Keys normalizadas**:
  - `useTeams`, `useTickets`, `useCategories`, `useTicketMessages`, `NotificationCenter`, `Users`: Agora usam `queryKeys.ts`
- **Componentes compartilhados documentados** (`src/components/ui/`):
  - `StatusBadge`, `StatusDot` - Status visual com variantes semânticas
  - `LoadingState`, `LoadingSpinner`, `SkeletonCard`, `SkeletonList`, `SkeletonTable` - Estados de carregamento
  - `ErrorState` - Estado de erro com retry
  - `EmptyState` - Estado vazio com CTA
  - `FilterBar`, `FilterSection` - Barra de filtros reutilizável
  - `PageHeader` - Cabeçalho de página padronizado

### v2.35.0 (2026-01-15)
- **Performance Metrics Dashboard (P4) - COMPLETO**:
  - **Nova tabela:** `perf_metrics_snapshots` - Armazena snapshots de métricas de performance
    - Campos: `id`, `bu_id`, `collected_at`, `metrics` (JSONB)
    - RLS policies para admins apenas
  - **Novas funções SQL:**
    - `collect_perf_metrics()` - Coleta métricas de todas as tabelas (scans, tuplas, índices)
    - `cleanup_old_perf_snapshots()` - Remove snapshots > 30 dias
  - **Edge Function `cron-dispatcher` atualizada:**
    - Integra coleta de métricas a cada execução (5 min)
    - Cleanup diário de snapshots antigos (1x por dia)
  - **Dashboard UI:** `/hub/performance`
    - Cards com métricas: Snapshots, Tabelas monitoradas, Taxa de índice, Scans por segundo
    - Gráficos de série temporal para table scans e index usage
    - Top 10 tabelas com mais scans
    - Hook: `usePerfMetrics.ts` para fetch de dados
  - **Navegação:** Sidebar atualizada com link para Performance (ícone Activity)
  - **Documentação:** `PERF_METRICS_DASHBOARD.md` v1.4.0
- **Data Model Registry regenerado** - 107 tabelas, 23 views, 70 enums documentados

### v2.24.0 (2026-01-12)
- **RLS V2 Migration - 100% Completo**:
  - Todas as 79 tabelas migradas para RLS V2 usando `has_permission()` e `is_profile_bu_member()`
  - **Módulos migrados**:
    | Módulo | Tabelas | Status |
    |--------|---------|--------|
    | Assets | 14 | ✅ 100% |
    | OKRs | 12 | ✅ 100% |
    | KPIs | 2 | ✅ 100% |
    | Tickets | 8 | ✅ 100% |
    | Teams | 5 | ✅ 100% |
    | Profiles | 1 | ✅ 100% |
    | Notifications | 2 | ✅ 100% |
    | Automations | 4 | ✅ 100% |
    | Partners | 4 | ✅ 100% |
    | AI/Agents | 6 | ✅ 100% |
    | BU Config | 8 | ✅ 100% |
    | Global/Infra | 13 | ✅ 100% |
  - **Funções legadas removidas**: Todas as policies agora usam `has_permission(my_profile_id(), bu_id, 'key:scope')` em vez de `has_role()`, `is_bu_admin()`, `is_platform_admin()` direto
  - **Padrão SELECT**: `is_profile_bu_member(my_profile_id(), bu_id)` para leitura
  - **Padrão INSERT/UPDATE/DELETE**: `has_permission(my_profile_id(), bu_id, 'module.entity.action:scope')`
  - Cleanup de policies legadas duplicadas

### v2.29.0 (2026-01-13)
- **Auth OTP Code Migration**:
  - Sistema de autenticação migrado de Magic Link para OTP Code (6 dígitos)
  - **Motivo**: Scanners de email corporativos invalidavam Magic Links antes do usuário clicar
  - **Fluxo novo**:
    1. Usuário insere email → validação de domínio
    2. Supabase Auth envia email com código de 6 dígitos
    3. Usuário insere código na tela de verificação
    4. Sistema verifica OTP e autentica
  - **Arquivos alterados**:
    - `supabase/functions/request-magic-link/index.ts` — Usa `signInWithOtp()` ao invés de `generateLink()`
    - `src/hooks/useAuth.tsx` — Novo método `verifyOtp()`
    - `src/pages/Auth.tsx` — UI de input de 6 dígitos com auto-focus e paste
  - **Edge Function**: Nome `request-magic-link` mantido por compatibilidade (envia OTP Code)
  - **Documentação atualizada**: TCR, GO_LIVE_CHECKLIST, MEMBERSHIP_RECOVERY_REPORT, tcr-content.ts

### v2.23.0 (2026-01-12)
- **Impersonation System v2.0** completo
- **Identity Cutover v3.0** finalizado

### v2.26.0 (2026-01-12)
- **Sistema Vic Culture — Guardião da Cultura**:
  - **Pool de mensagens reescrito**: Todas as 600+ frases agora limitadas a **60 caracteres**
  - **`useCultureMessage` hook refatorado**:
    - Usa agente IA "cultura" via `invoke("cultura", "dashboard-culture")` 
    - Cache inteligente por turno (máx 3 chamadas/dia)
    - Contexto rico: dia, turno, role, OKRs, pendências, ciclo
    - Fallback robusto com seleção contextualizada do pool
    - Truncamento automático para 60 caracteres
  - **Novo hook `useGreetingSubtext`**:
    - Gera subtexto contextualizado para saudação na home
    - Considera: dia/turno, role, liderança, times, performance, aniversários
    - Cache por turno + fallback inteligente
    - Integra com agente IA para personalização
  - **Arquivo `src/data/cultureMessages.ts`**:
    - 14 categorias temáticas (simplicidade, cultura, execução, colaboração, etc.)
    - 3 perfis (executive, leader, collaborator)
    - Mensagens por momento (segunda-sexta, início/fim de ciclo)
    - Mensagens por turno (manhã, tarde, noite)
    - Função `getContextualCultureMessage()` com pool ponderado
- **Leader Detection em Permissões**:
  - `useBuUsers` hook atualizado: inclui `is_team_leader` e `led_teams[]`
  - Badge "Líder" com tooltip mostrando times liderados
  - Query busca `teams.leader_user_id` comparando com `profile_id`
  - Ordenação: líderes aparecem mais acima na lista de permissões

### v2.25.0 (2026-01-12)
- **Wave 2 - Deprecações CONCLUÍDO**:
  - ✅ `profiles.job_title` - Coluna já removida do banco (migrado para `job_title_id`)
  - ✅ `user_notification_preferences` - Tabela já removida (migrado para v2)
  - ✅ `send-magic-link` - Edge function removida (0 chamadas em 30 dias, substituída por `request-magic-link`)
- **Cleanup de documentação**:
  - `LEGACY_CLASSIFICATION_MATRIX.md` atualizado para v2.0
  - `DEPRECATION_SEND_MAGIC_LINK.md` e `DEPRECATION_SEND_MAGIC_LINK_REPORT.md` removidos
  - Script `generate-data-model-registry.ts` atualizado
- **Tabela `mentions` global restaurada** (correção v2.19.0):
  - Modelo com `entity_type` + `entity_id` para uso multi-módulo
  - RLS V2 policies aplicadas
  - Frontend atualizado (`useTickets.ts`, `useTicketMessages.ts`)

### v2.63.0 (2026-01-22)
- **Ticket Watcher Messaging Fix v1.0**:
  - Corrigido: Watchers (mencionados) agora podem enviar mensagens
  - Problema: `TicketDetailPage` usava `profileId` em vez de `realProfileId` para mutations
  - Solução: Usar `realProfileId` do `useIdentity()` conforme IDENTITY_CONVENTION.md
- **Ticket Message Pinning RLS v3**:
  - Nova policy `ticket_messages_update_v3` permite criador/owner do ticket fixar mensagens
  - Função `can_pin_ticket_message()` valida permissão de pinagem
  - Corrigido erro "Cannot coerce result to single JSON object"
- **Tickets UI Badge Standardization v1.0**:
  - Criado `TICKET_TYPE_STYLES` em `src/lib/colors.ts` (padrão canônico)
  - `TicketsTable` agora usa estilos canônicos de `colors.ts` para tipo e status
  - Badges com dot colorido + fundo muted (consistência com detail page)
- **Assets Inventory Return Date Column v1.0**:
  - Campo `expected_return_at` adicionado ao tipo `AssetInventory`
  - Query enriquecida para buscar `due_at` da última movimentação de checkout
  - Nova coluna "Devolução" na tabela de inventário com indicadores visuais de atraso
- **System Audit Report 2026-01-22**:
  - Relatório completo de auditoria criado em `docs/audits/SYSTEM_AUDIT_2026-01-22.md`
  - Identificados débitos técnicos P1/P2/P3 e plano de ação

### v2.58.0 (2026-01-22)
- **Comprehensive Technical Audit Completion**:
  - **7 Partial Indexes para Soft-Delete**: Criados índices parciais (`WHERE deleted_at IS NULL`) para:
    - `partner_company_bu_associations`, `squad_memberships`, `squads`, `ticket_categories`
    - `ticket_messages`, `ticket_routing_rules`, `ticket_subcategories`
  - **pg_cron Cleanup Semanal**: Agendado `cleanup_old_logs()` via pg_cron (Domingo 03:00 UTC)
  - **user_team_memberships Schema Fix**: 
    - Corrigido: Tabela **não possui** coluna `is_active` (membership ativo = registro existe)
    - RPCs `user_has_permission_ctx` e `get_visible_ticket_ids_for_impersonation` atualizadas
    - Frontend `UserHoverCard.tsx` corrigido (removido filtro `.eq('is_active', true)`)
  - **18 Edge Functions Documentadas**: Todas as funções ativas catalogadas no TCR
  - **Relatório de Saúde Atualizado**: `HEALTH_REPORT_2026-01-22.md` reflete estado atual

### v2.57.0 (2026-01-22)
- **TCR Edge Functions Documentation**:
  - Documentadas 18 edge functions ativas com status e categoria
  - Adicionada seção "Edge Functions" no TCR

### v2.56.0 (2026-01-22)
- **Impersonation Ticket List External Support v1.0**:
  - Corrigida RPC `get_visible_ticket_ids_for_impersonation` para suportar usuários externos (partner_contacts)
  - Problema: Usuários externos impersonados não viam lista de tickets porque a RPC só verificava `profile_id`
  - Solução: RPC agora resolve `auth.uid` do perfil e verifica participação via `partner_contact_id`
  - Paridade com `can_view_ticket` que já suportava usuários híbridos
  - Afeta: Listagem de tickets durante impersonação de contatos externos

### v2.22.0 (2026-01-12)
- **Technical Debt Sprint P1-P3**:
  - **P1 - Crítico** (✅ 100% completo):
    - Cleanup automático de logs via `cron-dispatcher` (ai_agent_logs 90d, cron_logs 30d, wizard_sessions 7d)
    - 7 novos índices de performance criados (ai_agents, app_error_logs, cycles, okr_objective_reviews, ticket_attachments, ticket_messages, ticket_participants)
    - Documentação atualizada
  - **P2 - Importante** (✅ 75% completo):
    - `supabase/functions/_shared/response.ts` criado com helpers padronizados para respostas
    - Hooks de debounce consolidados em `src/hooks/useDebounce.ts` (useDebouncedValue, useDebouncedCallback, useDebouncedCallbackAdvanced)
    - `TicketMentionInput.tsx` removido (deprecated, substituído por MentionInput)
    - Migração text→enum adiada (views dependentes)
  - **P3 - Backlog** (✅ 100% avaliado):
    - `LegacyAssetRedirect.tsx` removido (dead code - importado sem rota)
    - `queryKeys` já modularizado em `/queryKeys/*.ts` - migração gradual
    - `ticket_subcategories` avaliado: baixo impacto (1 ticket usa), manter como está
- **Cleanup de código**:
  - Removidos arquivos: `LegacyAssetRedirect.tsx`, `TicketMentionInput.tsx`, `useDebouncedValue.ts`, `useDebouncedCallback.ts`
  - Imports atualizados para novos módulos consolidados

### v2.64.0 (2026-01-22)
- **Database Hygiene Wave — Score 10/10**:
  - `cleanup_old_logs()` atualizada para incluir `audit_logs` com retenção de 180 dias
  - Função consolidada agora gerencia 5 tabelas: `ai_agent_logs` (14d), `perf_metrics_snapshots` (14d), `cron_execution_logs` (7d), `okr_wizard_sessions` (30d), `audit_logs` (180d)
  - pg_cron já configurado para execução semanal (domingo 03:00 UTC)
- **Índices de Performance P2**:
  - `idx_ai_agent_logs_agent_id` — busca por agent_id
  - `idx_notification_deliveries_notification_id` — busca por notification_id
  - `idx_ai_agent_documents_agent_id` — busca por agent_id
  - `idx_okr_audit_log_entity_id` — busca por entity_id
- **Frontend Hygiene**:
  - `useDebounce` alias deprecated REMOVIDO de `src/hooks/useDebounce.ts`
  - Migrado `useInitiativeNameValidation.ts` para usar `useDebouncedValue`
  - Migrado `TeamOkrKrDetailStep.tsx` para usar `useDebouncedValue`
- **Audit Report atualizado**: `docs/audits/SYSTEM_AUDIT_2026-01-22.md` com todos itens P1/P2 resolvidos

### v2.28.0 (2026-01-13)
- **OKR Wizard Team Selection Fix**:
  - Wizard de criação de OKRs agora exibe seletor de times (`HierarchyContextSwitcher`) quando acessado sem `?team=` na URL
  - Antes: erro "Time não selecionado" forçava voltar para página anterior
  - Agora: usuário pode selecionar qualquer time gerenciável diretamente no wizard
  - Melhora UX para admins que não têm um time pessoal atribuído
- **OKR Dashboard Team Fallback Bugfix**:
  - Corrigido bug onde `userProfile?.team_id` de outra BU era usado como fallback
  - Novo comportamento: fallback só usa `team_id` se pertencer à BU atual (via `manageableTeamIds`)
  - Ordem de fallback: `URL param → team_id na BU atual → primeiro time gerenciável`
  - Afeta: botão "Novo Objetivo" no dashboard e empty state

### v2.27.0 (2026-01-13)
- **CheckinWizard Legacy Removido**:
  - Removido componente `CheckinWizard.tsx` (modal antigo de check-in)
  - Removido diretório `wizard/` com componentes: `WizardSetup`, `WizardKrSelection`, `WizardCheckinStep`, `WizardSummary`
  - Botão "Iniciar Check-in do Time" removido de `CycleCheckinsPage`
  - Check-ins agora usam **formato full-page** (padrão adotado para todos wizards de OKRs)
- **Correção useCycleCheckins**:
  - Hook atualizado para mapear corretamente resposta da RPC `get_cycle_checkins`
  - Mapeamento: `feed` → `checkins`, `total_count` → `total`
  - Filtro `rag_status` renomeado para `status` (alinhamento com RPC)
- **Correção useActiveCycles**:
  - Priorização de ciclos por tipo: `quarter > semester > year`
  - Ciclo default é agora o trimestre vigente (não mais o ano)
- **Documentação removida**:
  - `docs/OKR_CHECKIN_WIZARD_REPORT.md` (obsoleto)
  - `docs/qa/QA_OKR_CHECKIN_WIZARD.md` (obsoleto)

### v2.83.0 (2026-02-03)
- **OKR/KPI Wizard Integration v1.0** — Integração aprimorada entre OKRs, KPIs e Wizards:
  - **Nova tabela `kpi_data_contributors`** — Modelo de contribuidores de dados separado de owners
    - Campos: `kpi_id`, `contributor_user_id`, `role` (data_entry/reviewer)
    - RLS: Membros podem visualizar, editores podem gerenciar
    - Indexes otimizados para lookup por usuário e KPI
  - **Tipos `KpiForWizardV2`** — Classificação de KPIs por papel do usuário:
    - `userRole`: 'owner' | 'contributor' | 'viewer'
    - `displayMode`: 'editable' | 'readonly' | 'alert'
    - `isStrategic`, `isGuardrailAtRisk`, `linkedKrIds`
  - **Hook `useKpisForWizardV2`** — Retorna KPIs separados por contexto:
    - `kpisToUpdate` — KPIs onde usuário é contribuidor
    - `kpisTeamContext` — KPIs do time (read-only)
    - `kpisStrategic` — KPIs organizacionais
    - `kpisInAlert`, `guardrailsViolated`
  - **Hook `useKpiContributors`** — CRUD de contribuidores de KPI
  - **Novos componentes de wizard**:
    - `KpiContextSection` — Separação visual de KPIs por papel (update/context/strategic)
    - `KrLinkedKpiCard` — Exibição condicional de KPIs vinculados a KRs (KPI Gate)
    - `LeaderKpiAlertStep` — Nova seção "Indicadores em Atenção" no Leader Prep
    - `ManagersSystemicKpisStep` — Nova seção de indicadores sistêmicos cross-team
    - `KpiContributorsManager` — UI para gerenciar contribuidores
  - **Atualizações de wizards**:
    - `CollaboratorContextStep` — 3 seções separadas de KPIs por papel
    - `CollaboratorKpiStep` — Mensagem de clareza (contribuidor vs responsável)
    - `TeamKrReviewStep` — KPI Gate condicional (só mostra quando relevante)
    - `CLevelInsightsStep` — Dados reais de sinais estratégicos
    - `LeaderPrepPage` — Novo step 'kpi-alerts'
    - `ManagersCheckinPage` — Novo step 'systemic-kpis'
  - **Arquivos criados/modificados**: 15+ componentes e hooks

### v2.21.0 (2026-01-12)
- **Technical Debt Analysis** criado em `docs/engineering/TECHNICAL_DEBT_ANALYSIS_2026-01-12.md`
- Análise completa de higienização, refatoração, centralização e performance
- Plano de ação P1/P2/P3 documentado

### v2.12.0 (2026-01-08)
- **Wave 7 — Sunset V1 (Permissions)**:
  - Modelo de permissões v1 congelado (read-only) via triggers
  - UI de edição v1 removida (apenas visualização legado)
  - Sistema de migração controlada v1 → v2 implementado
  - Tabela `permission_migrations` para tracking de migração por usuário
  - Dashboard de migração em `/hub/permissions` (aba "Migração")
  - Script `audit-permissions-v1-usage.ts` para detectar uso residual de v1
  - Documentação: `docs/permissions/WAVE7_V1_V2_MAP.md`, `docs/permissions/WAVE7_SUNSET_V1_REPORT.md`
- **Operações**:
  - **Playbook de Backup & Restore** criado em `docs/ops/BACKUP_RESTORE_PLAYBOOK.md`
    - Estratégias: Supabase Pro backups, PITR, pg_dump
    - Procedimentos por tipo de incidente
    - Checklist pós-restore
    - Responsabilidades e boas práticas

### v1.4.0 (2026-01-06)
- **Otimização Geral do Hub** (hardening + refactor):
  - **Componentes compartilhados**: `StatusBadge`, `StatusDot`, `LoadingState`, `LoadingSpinner`, `SkeletonCard`, `SkeletonList`, `SkeletonTable`, `ErrorState`, `FilterBar`, `PageHeader`
  - **Query Keys centralizadas**: `src/lib/queryKeys.ts` com padrões consistentes por módulo
  - **Índices de banco**: 23 novos índices para performance (profiles, teams, okrs, assets, tickets, notifications, memberships)
  - **Security Hardening**: RLS policies corrigidas para exigir autenticação e membership de BU em tabelas sensíveis (profiles, ai_agents, okr_*, teams, squads, asset_inventory, kpi_*, hub_integrations_catalog)
  - **Migrações de componentes**: InventoryCard, InventoryListItem, PublicAsset, GlobalSearch agora usam StatusBadge/StatusDot centralizados
- **Findings de segurança resolvidos**:
  - Dados de profiles restritos à mesma BU
  - AI agents requerem autenticação
  - OKRs, Times, Squads restritos por BU
  - Assets inventory restrito por BU (com acesso público limitado para QR codes)
  - KPIs restritos por BU
  - Catálogo de integrações restrito a admins

### v1.3.0 (2026-01-06)
- **Home Dashboard** melhorado:
  - Cards de aniversários, jet-aniversários e novos Jetimobers agora filtram por BU
  - Novos Jetimobers mostra últimos 30 dias
  - Nomes clicáveis com link para perfil do usuário (UserLink component)
- **Busca Global** corrigida:
  - Busca de pessoas agora usa `profiles.bu_id` diretamente (sem join)
  - Adicionado `currentBuId` ao contexto BuContext
- **profiles.bu_id** passa a ser campo principal para escopo de BU (não mais via join)
- **Módulo Tickets** adicionado à lista de módulos ativos

### v1.2.0 (2026-01-05)
- **Busca Global** implementada via Edge Function `global-search`
  - Busca multi-contexto em 13 entidades diferentes
  - Suporte a Assets com validação de permissões por sub-módulo
  - Componente Command Palette com atalho ⌘K
  - Página expandida `/search` com filtros por tipo
- **UI do módulo Assets** implementada
  - Páginas: Inventário, Chaves, Brindes, Relatórios, Configurações
  - Componentes: Cards, Dialogs, Filtros, Listas
  - Sub-navegação por tabs
- **Configuração de módulos por BU** via interface
  - Nova aba em `/settings/modules` para toggle de módulos por BU
  - Toggle on/off para módulos operacionais
  - Visualização de quantas BUs têm cada módulo ativo

### v1.1.0 (2026-01-05)
- Adicionado módulo **Assets** completo (Inventário, Chaves, Brindes)
- Adicionada entidade **bu_locations** para sedes por BU
- Adicionada entidade **okr_contributions** para relações informativas
- Adicionada entidade **okr_kr_metrics** para vínculo KR ↔ KPI
- Novos tipos de KR: regras de contribuição por tipo
- Proteção contra divisão por zero no cálculo de progresso
- Novas Edge Functions: `search-address`, `get-place-details`
- Novos eventos de automação para Assets e Locations
- Documentação de permissões por sub-módulo

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
