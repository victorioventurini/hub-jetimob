# Hub Admin — Deep Dive Técnico

> **Versão**: 1.0.0 | **Data**: 2026-03-30  
> **Público**: Assistentes de IA, engenheiros e arquitetos  
> **Escopo**: Área administrativa `/hub` — configuração global da plataforma

---

## Índice

1. [Visão Geral e Filosofia](#1-visão-geral-e-filosofia)
2. [Layout e Navegação](#2-layout-e-navegação)
3. [Home do Hub](#3-home-do-hub)
4. [Business Units](#4-business-units)
5. [Módulos](#5-módulos)
6. [Configurações de OKRs — Vínculos com Rituais](#6-configurações-de-okrs--vínculos-com-rituais)
7. [Integrações](#7-integrações)
8. [Automações](#8-automações)
9. [Permissões](#9-permissões)
10. [Cargos](#10-cargos)
11. [Usuários](#11-usuários)
12. [Parceiros](#12-parceiros)
13. [Notificações](#13-notificações)
14. [Performance](#14-performance)
15. [UI Catalog](#15-ui-catalog)
16. [Mapa OKR ↔ Rituais (Seção Especial)](#16-mapa-okr--rituais)

---

## 1. Visão Geral e Filosofia

O `/hub` é o **painel de controle global da plataforma** — o ambiente onde super_admins e admins configuram Business Units, módulos, integrações, permissões e tudo que transcende uma BU individual.

> **O Hub é onde a plataforma é configurada. BU Settings é onde cada unidade é personalizada.**

### 1.1 Hub vs BU Settings

| Aspecto | Hub (`/hub/*`) | BU Settings (`/settings/*`) |
|---------|----------------|----------------------------|
| **Acesso** | `super_admin` + `admin` | Admin da BU (`isWildcard`) |
| **Escopo** | Global / cross-BU | BU selecionada |
| **BU Required** | Não (`skipBuCheck`) | Sim |
| **Layout** | `SettingsLayout` | `HubLayout` ou standalone |
| **Guard** | `AdminRoute` | `BuAdminRoute` / `BuRequiredRoute` |

### 1.2 Controle de Acesso

```
┌──────────────────────────────────────────────────┐
│          GUARD: HubRoute                          │
│                                                    │
│  ProtectedRoute (skipBuCheck)                      │
│  └── AdminRoute (super_admin || admin)             │
│      └── SettingsLayout (sidebar de navegação)     │
│          └── Conteúdo da página                    │
└──────────────────────────────────────────────────┘
```

**Componente `HubRoute`** (`src/routes/hub.routes.tsx`):
```tsx
function HubRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute skipBuCheck>
      <AdminRoute>
        <SettingsLayout>{children}</SettingsLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}
```

**`AdminRoute`** (`src/components/auth/AdminRoute.tsx`):
- Verifica `isAdmin` via `useAuth()`
- `isAdmin = true` quando `user_roles.role` é `super_admin` ou `admin`
- Redireciona para `/` se não for admin

**`BuAdminRoute`** (`src/components/auth/BuAdminRoute.tsx`):
- Usado em rotas de BU Settings (não no Hub)
- Verifica `isWildcard` via `usePermissions()`
- `isWildcard = true` para platform admins E admins da BU

---

## 2. Layout e Navegação

### 2.1 SettingsLayout

**Arquivo**: `src/components/settings/SettingsLayout.tsx`

Estrutura responsiva:
- **Desktop (≥ lg)**: `HubGlobalSidebar` fixa à esquerda (colapsável: 64px ↔ 256px)
- **Mobile (< lg)**: `HubGlobalMobileSidebar` com sheet lateral
- Header com breadcrumbs e botão menu (mobile)

### 2.2 HubGlobalSidebar

**Arquivo**: `src/components/layout/HubGlobalSidebar.tsx`

Organização em 3 seções:

**Início**:
| Item | Rota | Ícone |
|------|------|-------|
| Início | `/hub` | `Home` |

**Plataforma** (11 itens):
| Item | Rota | Ícone |
|------|------|-------|
| Unidades de Negócio | `/hub/business-units` | `Building2` |
| Módulos | `/hub/modules` | `Blocks` |
| Integrações | `/hub/integrations` | `Puzzle` |
| Automações | `/hub/automations` | `Workflow` |
| Permissões | `/hub/permissions` | `Shield` |
| Cargos | `/hub/job-titles` | `Briefcase` |
| Usuários | `/hub/users` | `Users` |
| Parceiros | `/hub/partners` | `Handshake` |
| Notificações | `/hub/notifications` | `Bell` |
| Performance | `/hub/performance` | `Activity` |
| Catálogo UI | `/hub/ui` | `Palette` |

**Recursos** (links externos):
| Item | URL | Ícone |
|------|-----|-------|
| Conhecimento | `https://docs.jetimob.com` | `BookOpen` |

### 2.3 Mapa Completo de Rotas (19 rotas)

| # | Rota | Página | Descrição |
|---|------|--------|-----------|
| 1 | `/hub` | `SettingsHome` | Dashboard do Hub |
| 2 | `/hub/business-units` | `SettingsBusinessUnits` | Gestão de BUs |
| 3 | `/hub/modules` | `SettingsModules` | Catálogo de módulos |
| 4 | `/hub/modules/okrs/settings` | `OkrsSettingsPage` | Config OKRs (ciclos, rituais, limites) |
| 5 | `/hub/integrations` | `SettingsIntegrations` | Catálogo de integrações |
| 6 | `/hub/integrations/cron-job` | `CronJobConfigPage` | Config de cron jobs |
| 7 | `/hub/integrations/:integrationKey` | `GlobalIntegrationDetailPage` | Detalhe da integração |
| 8 | `/hub/integrations/:integrationKey/agents/new` | `AgentFormPage` | Criar agente IA |
| 9 | `/hub/integrations/:integrationKey/agents/:agentId` | `AgentFormPage` | Editar agente IA |
| 10 | `/hub/integrations/:integrationKey/agents` | `AgentsListPage` | Lista de agentes IA |
| 11 | `/hub/integrations/:integrationKey/logs` | `AgentLogsPage` | Logs de execução |
| 12 | `/hub/performance` | `PerfDashboardPage` | Dashboard de performance |
| 13 | `/hub/automations` | `AutomationsPage` | Automações |
| 14 | `/hub/permissions` | `GlobalPermissionsPage` | Permissões RBAC |
| 15 | `/hub/job-titles` | `JobTitlesPage` | Cargos |
| 16 | `/hub/notifications` | `HubNotifications` | Notificações |
| 17 | `/hub/users` | `GlobalUsersPage` | Usuários |
| 18 | `/hub/ui` | `SettingsUiCatalog` | Catálogo de componentes |
| 19 | `/hub/partners` | `HubPartnersPage` | Parceiros |
| 20 | `/hub/partners/:partnerId` | `HubPartnerDetailPage` | Detalhe do parceiro |

> **Nota**: A rota `/agents/new` deve vir ANTES de `/agents/:agentId` para evitar match incorreto.

---

## 3. Home do Hub (`/hub`)

**Página**: `src/pages/settings/SettingsHome.tsx`

Dashboard com:
- **Stats cards**: Total de BUs, módulos ativos, integrações configuradas, usuários globais
- **Quick access cards**: Atalhos para seções mais usadas
- **Atividade recente**: Últimas ações administrativas

---

## 4. Business Units (`/hub/business-units`)

**Página**: `src/pages/settings/SettingsBusinessUnits.tsx`

### 4.1 CRUD de BUs

Cada BU possui:
- **Branding**: logo, cores primária/secundária
- **Domínios**: `allowed_email_domains[]` — determina quais emails podem se cadastrar
- **Módulos**: `bu_module_configs` — quais módulos estão ativos
- **Membros**: via `bu_user_memberships`

### 4.2 Resolução de Domínio

Função `get_bu_by_email_domain(email)`:
- Extrai domínio do email
- Busca BU com domínio correspondente em `allowed_email_domains`
- **IMPORTANTE**: Cada domínio deve existir em apenas UMA BU para resolução determinística

### 4.3 Trigger handle_new_user

```
Novo signup (auth.users) 
  → handle_new_user() trigger
    → Verifica partner_contacts (externo?)
    → Resolve BU via domínio
    → Cria/vincula profile
    → Cria bu_user_membership (role: member, is_default: true)
```

**Comportamento com profile pré-existente** (importado por admin):
- O `bu_id` do profile NÃO é sobrescrito pelo domínio
- Apenas `user_id`, `onboarding_completed` e `user_type` são atualizados
- O membership usa o `bu_id` já existente no profile

### 4.4 Roles na BU

`bu_user_memberships.role_in_bu`:
- `member` — colaborador padrão
- `admin` — administrador da BU (recebe wildcard `*` em permissões)

---

## 5. Módulos (`/hub/modules`)

**Página**: `src/pages/settings/SettingsModules.tsx`

### 5.1 Tabs

| Tab | Descrição |
|-----|-----------|
| Configuração por BU | Toggle de módulos por BU (`bu_module_configs`) |
| Catálogo | Lista de todos os módulos disponíveis |

### 5.2 Módulos Operacionais

Módulos que podem ser ativados/desativados por BU:
- OKRs, Tickets, Assets (Inventário, Chaves, Brindes), Projetos, etc.

### 5.3 Módulos Globais (sempre ativos)

- Notificações, Perfil, Diretório

### 5.4 Sub-rota: OKRs Settings

**Rota**: `/hub/modules/okrs/settings`  
**Página**: `src/modules/okrs/pages/OkrsSettingsPage.tsx`

Quatro abas:

| Aba | Componente | Função |
|-----|-----------|--------|
| Ciclos | `CyclesTab` | CRUD de ciclos (trimestre, semestre, anual) |
| Rituais | `RitualsTab` | Máquina de estados QBR, abertura/fechamento |
| Limites | `LimitsTab` | MAX_OBJECTIVES, MAX_KRS, MAX_CONTRIBUTIONS |
| Regras | `RulesInfoTab` | Regras de vínculo (contribution, enabler, foundational) |

---

## 6. Configurações de OKRs — Vínculos com Rituais

Esta seção detalha a relação entre o módulo de OKRs e o sistema de rituais (wizards).

### 6.1 Ciclos (Cycles)

Tabela `cycles`:
- `name`, `start_date`, `end_date`, `type` (quarterly, semester, annual)
- `qbr_status` — estado do rito QBR para o ciclo
- `bu_id` — scoped por BU

### 6.2 QBR Status Machine

```
 closed ──► open ──► collecting ──► reviewing ──► ready ──► done
   ▲                                                          │
   └──────────────────── reset ◄──────────────────────────────┘
```

| Status | Descrição | Quem atua |
|--------|-----------|-----------|
| `closed` | QBR não iniciado | — |
| `open` | QBR aberto, líderes podem submeter | Líderes |
| `collecting` | Líderes submeteram, dados sendo coletados | Sistema |
| `reviewing` | C-Level revisando propostas | C-Level |
| `ready` | Relatório pronto, reunião liberada | Admin |
| `done` | QBR concluído | Sistema |

**Gerenciamento**: Aba "Rituais" em `/hub/modules/okrs/settings`  
**Componente**: `src/modules/okrs/components/settings/RitualsTab.tsx`

### 6.3 Fases do QBR (4 Wizards)

O rito QBR é composto por 4 wizards sequenciais, cada um vinculado a um `requiredStatus`:

| Fase | wizard_type | Persona | requiredStatus | Descrição |
|------|-------------|---------|----------------|-----------|
| 1 | `qbr-pre` | Líder de time | `open` | Proposta de OKRs do time para próximo ciclo |
| 2 | `qbr-pre-clevel` | C-Level | `reviewing` | Revisão das propostas dos líderes |
| 3 | `qbr-meeting` | Facilitador | `ready` | Reunião presencial do QBR |
| 4 | `qbr-post` | Admin | `done` | Promoção atômica de OKRs propostos → ativos |

### 6.4 Cadências de Rituais

```
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE CALENDARIZAÇÃO                       │
│                                                              │
│  ritual_cadences (configuração)                              │
│  ├── wizard_type: qual rito                                  │
│  ├── frequency: weekly|biweekly|monthly|quarterly|semester   │
│  ├── team_id: time vinculado                                 │
│  ├── anchor_day: dia de referência                           │
│  └── is_active: boolean                                      │
│                                                              │
│  ritual_occurrences (instâncias geradas)                     │
│  ├── planned_date: data planejada                            │
│  ├── status: scheduled|completed|missed|skipped              │
│  ├── session_id: vínculo com okr_wizard_sessions             │
│  └── participants_count: contagem (ritos individuais)        │
│                                                              │
│  okr_wizard_sessions (execuções reais)                       │
│  ├── wizard_type, team_id, cycle_id, bu_id                   │
│  ├── status: in_progress|completed                           │
│  ├── reflection_data: JSON com dados do ritual               │
│  ├── decisions: array de decisões                            │
│  └── ai_insights_shown: insights IA exibidos                 │
└─────────────────────────────────────────────────────────────┘
```

**Associação automática**: Ao completar uma sessão, o sistema busca a ocorrência mais próxima na cadência usando uma janela dinâmica:

| Frequência | Janela de matching |
|------------|--------------------|
| Semanal | ±7 dias |
| Quinzenal | ±10 dias |
| Mensal | ±15 dias |
| Trimestral | ±30 dias |
| Semestral | ±45 dias |

---

## 7. Integrações (`/hub/integrations`)

**Página**: `src/pages/settings/SettingsIntegrations.tsx`

### 7.1 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE INTEGRAÇÕES                           │
│                                                              │
│  hub_integrations_catalog (catálogo global)                   │
│  ├── integration_global_configs (config global)               │
│  └── bu_integration_configs (override por BU)                 │
│                                                              │
│  ai_agents (agentes de IA)                                    │
│  ├── scope: global | bu                                       │
│  ├── ai_agent_instruction_sources (fontes de instrução)       │
│  │   ├── API (fetch periódico de URLs)                        │
│  │   ├── Document (documentos carregados)                     │
│  │   ├── Hub Context (dados de OKRs/KPIs/Times)              │
│  │   └── Template (template de texto)                         │
│  ├── ai_agent_documents (documentos anexados)                 │
│  └── ai_agent_logs (logs de execução com tokens/latência)     │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Config Mode

- `use_global`: BU herda configuração global
- `override`: BU tem configuração própria

### 7.3 Rotas de Integrações (7 sub-rotas)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/hub/integrations` | `SettingsIntegrations` | Catálogo |
| `/hub/integrations/cron-job` | `CronJobConfigPage` | Cron jobs |
| `/hub/integrations/:integrationKey` | `GlobalIntegrationDetailPage` | Detalhe |
| `/hub/integrations/:integrationKey/agents` | `AgentsListPage` | Lista agentes |
| `/hub/integrations/:integrationKey/agents/new` | `AgentFormPage` | Criar agente |
| `/hub/integrations/:integrationKey/agents/:agentId` | `AgentFormPage` | Editar agente |
| `/hub/integrations/:integrationKey/logs` | `AgentLogsPage` | Logs |

---

## 8. Automações (`/hub/automations`)

**Página**: `src/modules/automations/pages/AutomationsPage.tsx`

### 8.1 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE AUTOMAÇÕES                           │
│                                                              │
│  OUTBOUND (Hub → Externo):                                   │
│  automation_event_catalog → eventos disponíveis              │
│  automation_connections → webhooks de saída                   │
│  automation_connection_events → quais eventos disparam       │
│                                                              │
│  INBOUND (Externo → Hub):                                    │
│  automation_action_catalog → ações disponíveis               │
│  automation_incoming_tokens → tokens de autenticação         │
│                                                              │
│  automation_logs → logs de todas as execuções                │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Outbound

- **Eventos**: Disparados por ações no Hub (`users.created`, `okrs.kr_updated`, etc.)
- **Connections**: Webhooks com retry, timeout e auth configuráveis
- **Escopo**: `global` ou `bu`-scoped

### 8.3 Inbound

- **Actions**: Ações que podem ser executadas via API
- **Tokens**: Tokens de autenticação com rate limiting
- **Payload Schema**: JSON Schema para validação

---

## 9. Permissões (`/hub/permissions`)

**Página**: `src/modules/permissions/pages/GlobalPermissionsPage.tsx`

### 9.1 RBAC V3 — Nomenclatura

```
módulo.recurso.ação:escopo
```

Exemplo: `okrs.objectives.edit:team`

### 9.2 Escopos (PermissionScope)

| Scope | Significado |
|-------|-------------|
| `self` | Próprio usuário |
| `self_or_owner` | Próprio ou proprietário |
| `team` | Time direto |
| `team_tree` | Time e sub-times |
| `squad` | Squad |
| `bu` | Business Unit inteira |
| `global` | Todas as BUs |
| `public` | Público |

### 9.3 Tabs (6 abas)

| Tab | Descrição |
|-----|-----------|
| Catálogo | Lista de todas as permission keys |
| Templates V2 | Templates de permissão associáveis a usuários |
| Presets | Conjuntos pré-definidos de permissões |
| Governance | Diff, risk report, audit logs, usuários sem template |
| Surfaces | Pontos de verificação de permissão na UI |
| Audit | Logs de mudanças de permissão |

### 9.4 Fluxo de Verificação

```
usePermissions()
  → RPC get_my_permissions(p_bu_id)
  → Retorna string[] de permission keys
  → isWildcard = permissions.includes('*')
  → has(key), hasAny(keys), hasAll(keys)
```

### 9.5 Hooks Disponíveis

| Hook | Módulo | Propósito |
|------|--------|-----------|
| `usePermissionCatalog` | Catálogo | Listar/filtrar permissões |
| `usePermissionTemplatesV2` | Templates | CRUD de templates |
| `useTemplateItemsV2` | Templates | Items de um template |
| `useUserTemplatesV2` | Templates | Templates de um usuário |
| `useEffectivePermissionsV2` | Effective | Permissões efetivas |
| `usePermissionPresets` | Governance | Presets |
| `usePermissionDiff` | Governance | Diff entre expected/actual |
| `usePermissionRiskReport` | Governance | Relatório de risco |
| `usePermissionAuditLogs` | Governance | Logs de auditoria |
| `usePermissionAudit` | Audit | Auditoria completa |
| `useBuUserOverrides` | BU | Overrides por usuário/BU |
| `useUserEffectivePermissions` | BU | Permissões efetivas do usuário |

---

## 10. Cargos (`/hub/job-titles`)

**Página**: `src/modules/settings/pages/JobTitlesPage.tsx`

- CRUD de cargos com campo `bu_ids[]` para associação multi-BU
- Contagem de uso por cargo
- **Tipos**: `src/modules/settings/types.ts`

---

## 11. Usuários (`/hub/users`)

**Página**: `src/modules/users-global/pages/GlobalUsersPage.tsx`

### 11.1 Filtros Disponíveis

| Filtro | Valores |
|--------|---------|
| Tipo | `internal`, `external` |
| BU | Dropdown com todas as BUs |
| Onboarding | Completo / Pendente |
| Status | `active`, `vacation`, `terminated`, `external` |

### 11.2 Sheet de Detalhes

Ao clicar em um usuário, abre sheet lateral com:
- Informações do profile
- BUs vinculadas e roles
- Permissões efetivas
- Status de onboarding

---

## 12. Parceiros (`/hub/partners`)

**Página**: `src/pages/settings/HubPartnersPage.tsx`

### 12.1 Empresas Parceiras

- Tipo de pessoa: PF (CPF) ou PJ (CNPJ)
- Contatos vinculados (`partner_contacts`)
- Associações multi-BU via `partner_bu_associations`

### 12.2 Rotas

| Rota | Página |
|------|--------|
| `/hub/partners` | `HubPartnersPage` |
| `/hub/partners/:partnerId` | `HubPartnerDetailPage` |

### 12.3 Fluxo de Acesso Externo

```
Partner Contact com email registrado
  → Signup via Magic Link (allowed_magic_link_domains)
  → handle_new_user detecta partner_contact
  → Cria profile com user_type = 'external'
  → Vincula à BU via partner_contact_bu_associations
```

---

## 13. Notificações (`/hub/notifications`)

**Página**: `src/pages/hub/HubNotifications.tsx`

- Configuração de eventos notificáveis
- Canais de entrega (in-app, email, push)
- Templates de notificação
- Configuração de delivery por tipo de evento

---

## 14. Performance (`/hub/performance`)

**Página**: `src/modules/integrations/pages/PerfDashboardPage.tsx`

- Métricas de latência de agentes IA
- Consumo de tokens (input/output)
- Status de integrações
- Métricas de banco de dados (tamanho de tabelas, índices)

---

## 15. UI Catalog (`/hub/ui`)

**Página**: `src/pages/settings/SettingsUiCatalog.tsx`

Referência visual do design system — exibe componentes do shadcn/ui customizados com tokens semânticos do projeto.

---

## 16. Mapa OKR ↔ Rituais

### 16.1 Tabela Completa dos 12 Wizard Types

| # | wizard_type | Label | Persona | Frequência | Recorrente | QBR Phase | requiredStatus |
|---|-------------|-------|---------|------------|------------|-----------|----------------|
| 1 | `collaborator` | Check-in Colaborador | Colaborador individual | Semanal (sexta) | ✅ | — | — |
| 2 | `leader-prep` | Preparação do Líder | Líder de time | Semanal (segunda) | ✅ | — | — |
| 3 | `team-checkin` | Check-in do Time | Líder + time | Semanal | ✅ | — | — |
| 4 | `managers-checkin` | Check-in de Gestores | C-Level + líderes | Mensal | ✅ | — | — |
| 5 | `clevel-checkin` | Check-in C-Level | Diretoria | Mensal | ✅ | — | — |
| 6 | `team-okr-creation` | Criação de OKRs | Líder de time | Sob demanda | ❌ | — | — |
| 7 | `team-kr-creation` | Criação de KRs | Líder de time | Sob demanda | ❌ | — | — |
| 8 | `mbr` | MBR | C-Level / Diretoria | Mensal | ✅ | — | — |
| 9 | `qbr-pre` | Pré-QBR (Líder) | Líder de time | Trimestral | ✅ | Phase 1 | `open` |
| 10 | `qbr-pre-clevel` | Pré-QBR (C-Level) | C-Level | Trimestral | ✅ | Phase 2 | `reviewing` |
| 11 | `qbr-meeting` | Reunião QBR | Facilitador | Trimestral | ✅ | Phase 3 | `ready` |
| 12 | `qbr-post` | Pós-QBR | Admin | Trimestral | ✅ | Phase 4 | `done` |

### 16.2 Rituais Recorrentes vs Sob Demanda

**Recorrentes** (10): Todos exceto `team-okr-creation` e `team-kr-creation`. Estes podem ter cadências (`ritual_cadences`) e geram ocorrências planejadas (`ritual_occurrences`).

**Sob demanda** (2): `team-okr-creation` e `team-kr-creation` são acionados manualmente quando necessário, sem cadência fixa.

### 16.3 Cadeia de Dados: Cadence → Session → Report

```
┌──────────────┐     gera      ┌───────────────────┐
│ ritual_       │──────────────►│ ritual_            │
│ cadences      │               │ occurrences        │
│               │               │                    │
│ wizard_type   │               │ planned_date       │
│ frequency     │               │ status             │
│ team_id       │               │ session_id ────────┼──┐
│ anchor_day    │               │ participants_count │  │
│ is_active     │               │                    │  │
└──────────────┘               └───────────────────┘  │
                                                       │
                    ┌──────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────┐
│ okr_wizard_sessions            │
│                                │
│ wizard_type                    │
│ team_id                        │
│ cycle_id                       │
│ bu_id                          │
│ started_by                     │
│ status (in_progress|completed) │
│ reflection_data (JSON) ───────┼──► SnapshotReportView
│ decisions[]                    │    (renderização visual)
│ ai_insights_shown              │
│ meeting_notes                  │
└───────────────────────────────┘
```

### 16.4 Tabelas Envolvidas e Relações

| Tabela | Papel | FK Principal |
|--------|-------|-------------|
| `cycles` | Ciclos (quarter/semester/annual) + `qbr_status` | `bu_id` |
| `ritual_cadences` | Config de recorrência por rito/time | `bu_id`, `wizard_type` |
| `ritual_occurrences` | Instâncias planejadas | `cadence_id`, `session_id` |
| `okr_wizard_sessions` | Execuções reais dos wizards | `bu_id`, `cycle_id`, `team_id` |
| `objectives` | OKRs ativos | `cycle_id`, `team_id`, `bu_id` |
| `key_results` | KRs vinculados a objectives | `objective_id` |
| `kr_checkins` | Check-ins de progresso de KRs | `key_result_id` |
| `kpi_indicators` | KPIs e métricas | `bu_id`, `team_id` |
| `kpi_values` | Valores históricos de KPIs | `indicator_id` |

### 16.5 Agrupamento Estratégico nos Wizards

Nos rituais de check-in (Team, Collaborator), MBR e QBR Pre, a visualização segue hierarquia:

```
Objetivo
  └── Key Result (borda colorida)
        ├── Iniciativas vinculadas
        ├── Projetos vinculados
        │     └── Marcos inline (✓ ou tachado)
        └── Progresso + RAG + Confiança

[Seção final: Itens sem vínculo estratégico]
```

### 16.6 Persistência de Drafts

| Tipo de Wizard | Hook de Draft | Storage |
|----------------|--------------|---------|
| Check-ins, MBR, QBR | `useGenericWizardDraft` | `okr_wizard_sessions.reflection_data` |
| Criação de OKRs/KRs | `useWizardDraft` | `okr_wizard_sessions.reflection_data` |

> **Nota**: A tabela `okr_wizard_session_drafts` **não existe**. Todos os rascunhos são armazenados diretamente em `okr_wizard_sessions` com `status = 'in_progress'`.

### 16.7 Histórico e Relatórios

**Rota**: `/okrs/ritual-history`  
**Motor de relatórios**: `SnapshotReportView`

Despacho por `wizard_type` para renderizadores especializados:
- `CollaboratorReport`, `LeaderPrepReport`, `TeamCheckinReport`
- `ManagersCheckinReport`, `ClevelCheckinReport`
- `MbrReport`, `QbrPreReport`, `QbrPreClevelReport`
- `QbrMeetingReport`, `QbrPostReport`

---

## Arquivos-Chave

| Arquivo | Propósito |
|---------|-----------|
| `src/routes/hub.routes.tsx` | Todas as rotas do Hub |
| `src/components/settings/SettingsLayout.tsx` | Layout com sidebar |
| `src/components/layout/HubGlobalSidebar.tsx` | Sidebar de navegação |
| `src/components/auth/AdminRoute.tsx` | Guard de admin |
| `src/components/auth/BuAdminRoute.tsx` | Guard de BU admin |
| `src/hooks/usePermissions.ts` | Hook de permissões |
| `src/modules/okrs/types/wizard.ts` | Tipos WizardPersona + configs |
| `src/modules/okrs/hooks/useRitualHistory.ts` | Hook + labels dos wizards |
| `src/modules/okrs/hooks/useWizardSession.ts` | CRUD de sessões |
| `src/modules/okrs/components/settings/RitualsTab.tsx` | QBR state machine UI |
| `src/modules/okrs/components/settings/CyclesTab.tsx` | CRUD de ciclos |
| `src/modules/okrs/components/settings/LimitsTab.tsx` | Limites OKR |
| `src/modules/okrs/components/wizards/index.ts` | Barrel export dos 12 wizards |
| `src/modules/permissions/types.ts` | Tipos de permissões |
| `src/modules/permissions/hooks/index.ts` | Barrel export hooks permissões |
| `src/modules/integrations/types.ts` | Tipos de integrações |
| `src/modules/automations/types.ts` | Tipos de automações |
| `src/modules/users-global/types.ts` | Tipos de usuários globais |
| `src/modules/partners/types.ts` | Tipos de parceiros |
| `src/modules/settings/types.ts` | Tipos de cargos |
