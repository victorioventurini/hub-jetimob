# Technical Context Registry (TCR) — Hub da Jet

**Versão:** 2.14.0  
**Última atualização:** 2026-01-10
**Responsável:** Lovable AI / Equipe de Engenharia
**Status:** V2-only mode ativo (V1 removido definitivamente) | Identity Cutover v3.0 completo

> 📚 **Documentação Complementar:**
> - [DEVELOPMENT_STANDARDS.md v1.1.0](./engineering/DEVELOPMENT_STANDARDS.md) — **Padrões de Desenvolvimento** (PRE-BU/POST-BU, Identity, RBAC, Queries, URL State, Edge Functions, DB, Checklist PR)
> - [DATA_MODEL_REGISTRY.md](./engineering/DATA_MODEL_REGISTRY.md) — **Fonte única de verdade para schema** (tabelas, views, funções, enums, identity map)
> - [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) — Convenção de identidade (`user_id` vs `profile_id`)
> - [RBAC_TEMPLATES_V3.md](./RBAC_TEMPLATES_V3.md) — Sistema de permissões e templates V2
> - [URL_STATE_STANDARD.md](./URL_STATE_STANDARD.md) — Padrão de URL state
> - [engineering/QUERY_KEYS_STANDARD.md](./engineering/QUERY_KEYS_STANDARD.md) — Padrão de query keys
> - [engineering/BU_SCOPED_SUPABASE_RULES.md](./engineering/BU_SCOPED_SUPABASE_RULES.md) — Regras de cliente Supabase
> - [engineering/PERMISSIONS_AND_RBAC_MODEL.md](./engineering/PERMISSIONS_AND_RBAC_MODEL.md) — Modelo de permissões e RBAC
> - [engineering/SYSTEM_STATE_FINAL_REPORT.md](./engineering/SYSTEM_STATE_FINAL_REPORT.md) — Relatório final do estado do sistema
> - [engineering/FINAL_COMPLIANCE_CHECKLIST.md](./engineering/FINAL_COMPLIANCE_CHECKLIST.md) — Checklist de conformidade
> - [ops/BACKUP_RESTORE_PLAYBOOK.md](./ops/BACKUP_RESTORE_PLAYBOOK.md) — Playbook oficial de backup e restore
> - [ops/GO_LIVE_CHECKLIST.md](./ops/GO_LIVE_CHECKLIST.md) — Checklist oficial de go-live

> ⚠️ **Data Model Registry (Canonical)**
> - Arquivo: `docs/engineering/DATA_MODEL_REGISTRY.md` (humano) + `.json` (máquina)
> - Regra: **NUNCA inventar nomes de tabela/view/função**. Usar exclusivamente o registry.
> - Regenerar: `npx tsx scripts/generate-data-model-registry.ts`

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

---

### 1.5 Supabase Client Usage

O Hub utiliza dois tipos de clientes Supabase com regras estritas de uso:

#### `useBuScopedSupabase()` — Cliente BU-Scoped (OBRIGATÓRIO)
**Obrigatório para todos os dados operacionais.** Injeta automaticamente o header `x-current-bu-id` em todas as requisições.

```typescript
const supabase = useBuScopedSupabase();
// Todas as queries incluem x-current-bu-id header
```

**Onde usar:**
- ✅ Todos os módulos operacionais (OKRs, KPIs, Tickets, Assets, Teams, etc.)
- ✅ Qualquer query que acessa dados escopados por BU
- ✅ Mutations em tabelas com `bu_id`

**Guard de segurança:** Lança erro se chamado antes de `BuProvider` inicializar.

#### `supabase` (Cliente Global) — USO RESTRITO
**Permitido APENAS para cenários específicos:**

| Cenário | Justificativa |
|---------|---------------|
| **Auth** | Operações de login/logout não têm BU |
| **Membership Bootstrap** | `useUserBus`, `useExternalUser` rodam ANTES do BuProvider |
| **Realtime** | `NotificationCenter` precisa de subscription global |
| **Pré-BU Hooks** | Hooks que populam o BuContext |

```typescript
// ✅ Correto: Auth
import { supabase } from "@/integrations/supabase/client";
await supabase.auth.signInWithOtp({ email });

// ❌ ERRADO: Dados operacionais com cliente global
const { data } = await supabase.from("tickets").select("*"); // BUG!
```

**Qualquer uso do cliente global fora dos cenários acima é considerado BUG.**

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
| year | int | Ano do objetivo |
| owner_user_id | uuid | Responsável |
| status | enum | Status do objetivo |
| bu_id | uuid | FK para bu_units |

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

## 3. Módulos do Hub

### 3.1 Módulos Ativos

| Módulo | Slug | Objetivo | Status |
|--------|------|----------|--------|
| **Home** | - | Dashboard pessoal com OKRs, aniversários, cultura, novos Jetimobers | ✅ Ativo |
| **OKRs** | `okrs` | Gestão de Objectives e Key Results | ✅ Ativo |
| **KPIs** | `kpis` | Indicadores de performance | ✅ Ativo |
| **Times** | `teams` | Estrutura organizacional | ✅ Ativo |
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
| **Relatórios** | `/assets/reports` | Visão agregada | Respeita permissões por sub-módulo |
| **Configurações** | `/assets/settings` | Gerenciamento de permissões | Apenas `assets_admin` |

**Componentes UI implementados:**
- `AssetsLayout.tsx` - Layout com sub-navegação por tabs
- `InventoryPage.tsx`, `KeysPage.tsx`, `GiftsPage.tsx` - Páginas principais
- `InventoryCard.tsx`, `InventoryFilters.tsx`, `InventoryItemDialog.tsx` - Inventário
- `ClavicularyBoard.tsx`, `KeyringsList.tsx`, `ClavicularyDialog.tsx`, `KeyringDialog.tsx` - Chaves
- `GiftItemCard.tsx`, `GiftItemDialog.tsx` - Brindes
- `AddPermissionDialog.tsx` - Configurações de permissão

### 3.3 Configuração de Módulos por BU

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

### 4.7 Vínculo KR ↔ KPI

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

**Kits:**
- Checkout de item `primary` pode incluir acessórios `is_required = true`
- Ao emprestar primário + acessórios: todos vão para mesmo holder
- Bloqueio se acessório obrigatório estiver em posse de outro usuário/local
- Validação via função `get_kit_required_accessories(asset_id)`

**Chaves:**
- `hook_number` deve bater com `tag_number` do chaveiro ao devolver
- Override de posição apenas para admins (com justificativa)
- Histórico completo de retiradas/devoluções

**Brindes:**
- Controle por lotes e quantidade
- Não possui etiqueta/QR
- OUT não gera devolução
- Validação de estoque em movimentações

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
| SendGrid | ✅ Ativo | Emails (magic link, notificações) |
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
| `search-address` | Autocomplete de endereços (Google Places) |
| `get-place-details` | Detalhes de endereço (Google Places) |
| `culture-message` | Gera mensagem de cultura (IA) |
| `invoke-vic` | Invoca agentes Vic |
| `process-agent-document` | Processa documentos para RAG |
| `get-tcr` | Retorna TCR para Custom GPT |
| `global-search` | Busca multi-contexto (ver seção 8.1) |
| `get-public-asset` | Retorna dados sanitizados de asset por `internal_code` (público, sem JWT) |

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
| **Versão do TCR** | 2.13.0 |
| **Data da última atualização** | 2026-01-09 |
| **Responsável** | Lovable AI |
| **Supabase Project ID** | oiwnghihyqdsinouwmga |
| **Status V1 Permissions** | ❌ Removido definitivamente (Wave 9) |
| **Permission Keys** | 160 |
| **Permission Templates V2** | 27 |
| **Permission Presets** | 12 |

---

## Changelog

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
