# BU Settings & Módulos Operacionais — Deep Dive Técnico

> **Versão**: 1.0.0 | **Data**: 2026-03-30  
> **Público**: Assistentes de IA, engenheiros e arquitetos  
> **Escopo**: Área acessível dentro de uma BU — `/settings/*` e todos os módulos operacionais

---

## Índice

1. [Visão Geral: Dentro da BU](#1-visão-geral-dentro-da-bu)
2. [Controle de Acesso e Guards](#2-controle-de-acesso-e-guards)
3. [BU Settings (`/settings`)](#3-bu-settings)
4. [Core Routes (Home, Perfil, Diretório)](#4-core-routes)
5. [Módulo OKRs (`/okrs`)](#5-módulo-okrs)
6. [Módulo KPIs (`/kpis`)](#6-módulo-kpis)
7. [Módulo Teams (`/teams`)](#7-módulo-teams)
8. [Módulo Assets (`/assets`)](#8-módulo-assets)
9. [Módulo Tickets (`/tickets`)](#9-módulo-tickets)
10. [Módulo Projetos (`/projects`)](#10-módulo-projetos)
11. [Módulo Events (`/events`)](#11-módulo-events)
12. [Rotas Públicas](#12-rotas-públicas)
13. [Mapa Completo de Rotas por Módulo](#13-mapa-completo-de-rotas)

---

## 1. Visão Geral: Dentro da BU

Após autenticação e seleção de BU (`/select-bu`), o usuário entra no contexto operacional de uma Business Unit. Todas as rotas são BU-scoped — dados são filtrados por `bu_id` tanto no frontend (queries) quanto no backend (RLS).

### 1.1 Ciclo de Vida do Acesso

```
/auth → Login
  → /auth/callback → Verifica onboarding
    → /onboarding (se pendente)
    → /select-bu (se múltiplas BUs)
    → / (Home da BU)
```

### 1.2 Regra Inquebrável de BU Filtering

Todas as queries frontend devem:
1. Filtrar explicitamente por `bu_id`: `.eq("bu_id", currentBuId)`
2. Condicionar habilitação: `enabled: !!currentBuId`
3. Em detail pages: validar `data.bu_id === currentBuId` pós-fetch

> **Por quê?** RLS permite que platform admins acessem dados de todas as BUs. O filtro frontend é necessário para evitar vazamento visual entre contextos.

### 1.3 Hub vs BU Settings (Recapitulação)

| Aspecto | Hub (`/hub/*`) | BU Settings (`/settings/*`) |
|---------|----------------|----------------------------|
| **Guard** | `AdminRoute` (super_admin/admin) | `BuAdminRoute` (isWildcard na BU) |
| **BU Required** | Não (`skipBuCheck`) | Sim |
| **Escopo de dados** | Cross-BU | BU selecionada |
| **Layout** | `SettingsLayout` (sidebar Hub) | `HubLayout` ou standalone |

---

## 2. Controle de Acesso e Guards

### 2.1 Hierarquia de Guards

```
┌─────────────────────────────────────────────────────────┐
│  ProtectedRoute                                          │
│  ├── skipBuCheck: não exige BU selecionada              │
│  ├── skipOnboardingCheck: não exige onboarding completo │
│  │                                                       │
│  └── BuRequiredRoute                                     │
│      ├── Exige BU selecionada no BuContext               │
│      │                                                    │
│      ├── ModuleRoute (moduleSlug)                        │
│      │   └── Verifica se módulo está ativo na BU         │
│      │       via bu_module_configs                        │
│      │                                                    │
│      └── BuAdminRoute                                    │
│          └── isWildcard (admin da BU OU platform admin)  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Componentes de Guard

| Guard | Arquivo | Verifica |
|-------|---------|----------|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.tsx` | Autenticação (JWT) |
| `BuRequiredRoute` | `src/components/auth/BuRequiredRoute.tsx` | BU selecionada no contexto |
| `ModuleRoute` | `src/components/auth/ModuleRoute.tsx` | Módulo ativo na BU |
| `BuAdminRoute` | `src/components/auth/BuAdminRoute.tsx` | `isWildcard` via `usePermissions` |
| `AdminRoute` | `src/components/auth/AdminRoute.tsx` | `isAdmin` (platform admin) |

### 2.3 Padrão de Route Helper

Cada arquivo de rotas define um helper para wrapping consistente:

```tsx
// Exemplo: OkrRoute
function OkrRoute({ children, requiresBuAdmin = false }) {
  const inner = (
    <ModuleRoute moduleSlug="okrs">
      {children}
    </ModuleRoute>
  );
  return (
    <ProtectedRoute>
      <BuRequiredRoute>
        {requiresBuAdmin ? <BuAdminRoute>{inner}</BuAdminRoute> : inner}
      </BuRequiredRoute>
    </ProtectedRoute>
  );
}
```

---

## 3. BU Settings (`/settings`)

**Arquivo de rotas**: `src/routes/settings.routes.tsx`

### 3.1 Rotas de Settings

| Rota | Página | Guard | Layout | Descrição |
|------|--------|-------|--------|-----------|
| `/settings` | `BuSettingsPage` | SettingsRoute | Standalone | Config da BU (branding, dados) |
| `/settings/permissions` | `BuPermissionsPage` | SettingsRoute | Standalone | Permissões de usuários da BU |
| `/settings/notifications` | `SettingsNotifications` | SettingsRoute | HubLayout | Notificações da BU |
| `/settings/areas` | `AreasPage` | SettingsRoute | HubLayout | Áreas estratégicas |
| `/settings/rituals` | `RitualCalendarPage` | BuAdminRoute | HubLayout | Calendário de rituais |
| `/settings/partners` | `PartnersPage` | PartnersRoute | — | Parceiros da BU |
| `/settings/partners/new` | `PartnerFormPage` | PartnersRoute | — | Novo parceiro |
| `/settings/partners/:partnerId` | `PartnerDetailPage` | PartnersRoute | — | Detalhe do parceiro |

### 3.2 SettingsRoute vs PartnersRoute

```
SettingsRoute:
  ProtectedRoute → BuRequiredRoute → [HubLayout?] → children

PartnersRoute:
  ProtectedRoute → BuRequiredRoute → ModuleRoute("partners") → children
```

A diferença é que `PartnersRoute` adicionalmente verifica se o módulo "partners" está ativo na BU.

### 3.3 BU Settings Home (`/settings`)

**Página**: `src/pages/settings/BuSettingsPage.tsx`

Configurações da Business Unit selecionada:
- **Dados gerais**: Nome, slug, descrição
- **Branding**: Logo, cor primária, cor secundária
- **Domínios**: `allowed_email_domains[]` (quais emails podem se cadastrar)
- **Membros**: Lista de `bu_user_memberships` com roles

### 3.4 BU Permissions (`/settings/permissions`)

**Página**: `src/modules/permissions/pages/BuPermissionsPage.tsx`

Gestão de permissões no escopo da BU:
- **Templates**: Associar templates de permissão a usuários
- **Overrides**: Sobrescrever permissões individuais (`bu_user_permission_overrides`)
- **Effective View**: Ver permissões efetivas de um usuário
- **Diff**: Comparar expected vs actual

### 3.5 Áreas Estratégicas (`/settings/areas`)

**Página**: `src/modules/areas/pages/AreasPage.tsx`

Áreas são agrupamentos estratégicos de times:
- CRUD de áreas com `leader_user_id` e `co_leader_user_id`
- Cor e ícone personalizáveis
- Vinculação com times para organização hierárquica
- Status: `active` / `inactive`

### 3.6 Calendário de Rituais (`/settings/rituals`)

**Página**: `src/modules/okrs/pages/RitualCalendarPage.tsx`  
**Guard**: `BuAdminRoute` (apenas admins da BU)

Duas abas:
| Aba | Função |
|-----|--------|
| Calendário | Visualização mensal com pills coloridos por rito |
| Saúde | Aderência aos rituais com filtros por período/time/rito/usuário |

Funcionalidades:
- Criação/edição de cadências (`ritual_cadences`)
- Visualização de ocorrências (`ritual_occurrences`)
- Navegação automática para próximo mês com dados
- Contagem de participantes para ritos individuais

### 3.7 Parceiros da BU (`/settings/partners`)

**Página**: `src/modules/partners/pages/PartnersPage.tsx`

Parceiros no escopo da BU (diferente do Hub que é cross-BU):
- CRUD de empresas parceiras vinculadas à BU
- Contatos vinculados com email (para Magic Link)
- Detalhe do parceiro com histórico de tickets

---

## 4. Core Routes (Home, Perfil, Diretório)

**Arquivo de rotas**: `src/routes/core.routes.tsx`

### 4.1 Rotas Core

| Rota | Página | Guard | Descrição |
|------|--------|-------|-----------|
| `/` | `Index` | BuRequired | Home/Dashboard da BU |
| `/dashboard/external` | `ExternalDashboardPage` | skipBuCheck | Dashboard para contatos externos |
| `/onboarding` | `Onboarding` | skipBu + skipOnboarding | Fluxo de onboarding |
| `/select-bu` | `SelectBu` | skipBu + skipOnboarding | Seleção de BU |
| `/profile` | `Profile` | skipBuCheck | Perfil do usuário logado |
| `/users` | `Users` | skipBuCheck | Diretório de usuários |
| `/users/:id` | `UserProfile` | BuRequired | Perfil de outro usuário |
| `/contacts/:contactId` | `PartnerContactProfilePage` | BuRequired + tickets | Perfil de contato externo |
| `/modules` | `Modules` | skipBuCheck | Catálogo de módulos |
| `/wizards` | `WizardsPage` | BuRequired | Hub de wizards (todos os rituais) |
| `/go/:entity/:id` | `ResolveContextPage` | skipBuCheck | Resolver BU de um recurso e redirecionar |
| `/kpis` | `KpiDashboardPage` | BuRequired + kpis | Dashboard de KPIs |
| `/kpis/evolution` | `KpiEvolutionPage` | BuRequired + kpis | Evolução temporal de KPIs |
| `/me/notifications` | `NotificationsPage` | BuRequired | Notificações do usuário |

### 4.2 Context Resolver (`/go/:entity/:id`)

Rota utilitária para deep links:
- Recebe uma entidade (ex: `ticket`, `objective`) e um ID
- Descobre a BU do recurso
- Redireciona para a rota correta com BU configurada

### 4.3 Wizards Page (`/wizards`)

Hub centralizado para todos os rituais de OKR:
- Lista todos os wizards disponíveis para o usuário
- Exibe status de rascunhos (in_progress)
- Agrupa por categoria (Check-ins, Criação, Estratégicos)
- Botões para iniciar novos rituais ou continuar rascunhos

### 4.4 DEV-only Routes

Disponíveis apenas em `import.meta.env.DEV`:
- `/vic-test` — Teste do assistente Vic (IA)
- `/dev/docs` — Documentação técnica interna

---

## 5. Módulo OKRs (`/okrs`)

**Arquivo de rotas**: `src/routes/okrs.routes.tsx`  
**Guard**: `OkrRoute` → `ProtectedRoute` → `BuRequiredRoute` → `ModuleRoute("okrs")`

### 5.1 Rotas de OKRs (22 rotas)

#### Dashboard & Gestão

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs` | `OkrDashboardPage` | ❌ | Dashboard principal (Leader/Executive) |
| `/okrs/manage` | `OkrsPage` | ❌ | Gestão de OKRs (CRUD) |
| `/okrs/executive` | `ExecutiveDashboardPage` | ❌ | Painel executivo |

#### Criação

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/create` | `OkrCreationPage` | ❌ | Wizard de criação de OKRs |
| `/okrs/objectives/:objectiveId/krs/create` | `TeamKrCreationPage` | ❌ | Wizard de criação de KRs |

#### Check-ins (Rituais Recorrentes)

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/collaborator-checkin` | `CollaboratorCheckinPage` | ❌ | Check-in individual (sexta) |
| `/okrs/leader-prep` | `LeaderPrepPage` | ❌ | Preparação do líder (segunda) |
| `/okrs/team-checkin` | `TeamCheckinPage` | ❌ | Check-in coletivo do time |
| `/okrs/managers-checkin` | `ManagersCheckinPage` | ❌ | Check-in de gestores |
| `/okrs/clevel-checkin` | `CLevelCheckinPage` | ❌ | Check-in C-Level |
| `/okrs/checkins` | `CycleCheckinsPage` | ❌ | Visão de check-ins do ciclo |
| `/okrs/ritual-history` | `RitualHistoryPage` | ❌ | Histórico de rituais |

#### MBR (Monthly Business Review)

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/mbr` | `MbrPage` | ✅ | Ritual mensal estratégico |

#### QBR (Quarterly Business Review)

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/qbr-pre` | `QbrPrePage` | ❌ | Pré-QBR (líderes) |
| `/okrs/qbr-pre-clevel` | `QbrPreCLevelPage` | ✅ | Pré-QBR (C-Level) |
| `/okrs/qbr` | `QbrMeetingPage` | ✅ | Reunião QBR |
| `/okrs/qbr-post` | `QbrPostPage` | ✅ | Pós-QBR (promoção de OKRs) |

#### Qualidade & Análise

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/quality` | `OkrQualityPage` | ❌ | Qualidade de OKRs |
| `/okrs/construction-review` | `OkrConstructionReviewPage` | ❌ | Revisão de construção |
| `/okrs/org-construction-review` | `OrgConstructionReviewPage` | ✅ | Revisão org de construção |
| `/okrs/analysis` | `OrgAnalysisPage` | ✅ | Análise organizacional |
| `/okrs/health` | `OkrHealthPage` | ✅ | Saúde dos OKRs |

#### Visão Organizacional

| Rota | Página | BuAdmin? | Descrição |
|------|--------|----------|-----------|
| `/okrs/org-view` | `OrgViewListPage` | ❌ | Lista de OKRs organizacionais |
| `/okrs/org-view/:objectiveId` | `OrgObjectiveViewPage` | ❌ | Detalhe de objetivo org |
| `/okrs/team-contribution/:teamId` | `TeamContributionPage` | ❌ | Contribuições do time |

### 5.2 Conceitos-Chave do Módulo

#### Ciclos e Progresso
- Ciclos (quarterly, semester, annual) contêm objetivos e KRs
- Progresso calculado via `progressCalculation.ts`
- KR State: 8 estados (`not_started`, `healthy`, `stagnant`, `at_risk`, `off_track`, `achieved`, `exceeded`, `not_achieved`)

#### Wizards e Persistência
- Shell: `FullPageWizardShell`
- Drafts: `useGenericWizardDraft` (check-ins, MBR, QBR) / `useWizardDraft` (criação)
- Sessões: `okr_wizard_sessions` com `status = in_progress | completed`
- Insights IA: `VicInsightCard`, `KrStateInsightCard`

#### Agrupamento Estratégico
Nos rituais, a visualização segue hierarquia:
```
Objetivo → Key Results → Iniciativas/Projetos/Marcos vinculados
[Seção final: Itens sem vínculo estratégico]
```

---

## 6. Módulo KPIs (`/kpis`)

**Rotas definidas em**: `src/routes/core.routes.tsx`  
**Guard**: `BuRequired` + `ModuleRoute("kpis")`

| Rota | Página | Descrição |
|------|--------|-----------|
| `/kpis` | `KpiDashboardPage` | Dashboard de indicadores |
| `/kpis/evolution` | `KpiEvolutionPage` | Evolução temporal |

### 6.1 Conceitos-Chave

- **indicator_type**: `kpi` (resultado) vs `metric` (operacional)
- **scope**: `org` (global), `area`, `team`
- **Governança**: Escopo (quem é impactado) vs Responsabilidade (quem cuida)
- **Valores**: `kpi_values` com séries temporais, metas e alertas RAG
- **Vinculação**: KPIs podem ser fonte primária de progresso para Key Results

---

## 7. Módulo Teams (`/teams`)

**Arquivo de rotas**: `src/routes/teams.routes.tsx`  
**Guard**: `TeamRoute` → `BuRequired` + `ModuleRoute("teams")`

| Rota | Página | Descrição |
|------|--------|-----------|
| `/teams` | `TeamsPage` | Lista de times |
| `/teams/:id` | `TeamDetailPage` | Detalhe do time |
| `/teams/org-chart` | `OrganogramPage` | Organograma hierárquico |
| `/squads/:id` | `SquadDetailPage` | Detalhe de squad |

### 7.1 Conceitos-Chave

- **Times**: Estrutura hierárquica com `parent_team_id`
- **Squads**: Equipes cross-funcionais (vinculam membros de múltiplos times)
- **Líder**: `leader_user_id` — determina permissões de escopo `team` e `team_tree`
- **Membros**: `team_members` com `role` (member, leader)
- **Organograma**: Visualização em árvore da hierarquia completa

---

## 8. Módulo Assets (`/assets`)

**Arquivo de rotas**: `src/routes/assets.routes.tsx`  
**Guard**: `AssetRoute` → `BuRequired` + `ModuleRoute("assets")`

### 8.1 Layout Nested

O módulo Assets usa um layout com tabs nested:

```
/assets (AssetsPage - layout container)
  ├── /assets/inventory → InventoryPage
  ├── /assets/keys → KeysPage
  ├── /assets/gifts → GiftsPage
  ├── /assets/reports → AssetsReportsPage
  ├── /assets/settings → AssetsSettingsPage
  └── /assets/phone-lines → PhoneLinesPage
```

### 8.2 Rotas Standalone

| Rota | Página | Descrição |
|------|--------|-----------|
| `/assets/inventory/recommendations` | `RecommendationsPage` | Recomendações de ativos |
| `/assets/inventory/:id` | `InventoryDetailPage` | Detalhe de ativo |
| `/assets/:code` | `PublicAssetRedirect` | Redirect de QR code (público) |

### 8.3 Subdomínios

| Subdomínio | Tabela Principal | Função |
|------------|-----------------|--------|
| **Inventário** | `asset_inventory` | Ativos físicos com rastreamento |
| **Chaves** | `asset_keyrings`, `asset_keys` | Claviculários, chaveiros e chaves |
| **Brindes** | `asset_gift_items`, `asset_gift_batches` | Itens promocionais com lotes |
| **Linhas telefônicas** | `asset_phone_lines` | Linhas e planos vinculados |
| **Recomendações** | `asset_recommendations` | Especificações por cargo/time |
| **Grupos** | `asset_groups`, `asset_group_items` | Agrupamento lógico (kits) |

### 8.4 Movimentações

Rastreamento completo de movimentação:
- **Ativos**: `asset_movements` (assign, transfer, return, maintenance, retire)
- **Chaves**: `asset_key_movements` (checkout, return, transfer)
- **Brindes**: `asset_gift_movements` (in, out, adjustment)

### 8.5 Permissões de Assets

`asset_permissions` com roles específicas:
- `viewer`, `operator`, `manager`, `admin`

---

## 9. Módulo Tickets (`/tickets`)

**Arquivo de rotas**: `src/routes/tickets.routes.tsx`  
**Guard**: `TicketRoute` → `BuRequired` + `ModuleRoute("tickets")`

### 9.1 Layout Nested

```
/tickets (TicketsPage - layout com tabs)
  ├── /tickets (index) → TicketsListPage
  └── /tickets/new → CreateTicketPage
```

### 9.2 Rotas Standalone

| Rota | Página | Descrição |
|------|--------|-----------|
| `/tickets/settings` | `TicketsSettingsPage` | Configurações do módulo |
| `/tickets/:id` | `TicketDetailPage` | Detalhe do ticket |

### 9.3 Conceitos-Chave

- **Acesso**: Via RPCs `can_view_ticket()` e `can_update_ticket_status()`
- **Roles no ticket**: Creator, Owner, Assigned Contact, Watcher (menção)
- **Watchers**: Podem ver, mensagear e anexar, mas NÃO alterar status
- **Contatos externos**: Suportados via `partner_contacts` — acesso restrito ao módulo tickets
- **Links semânticos**: `UserLink` (interno) e `ContactLink` (externo)
- **Limite de listagem**: 1000 items no `TicketsTable`

---

## 10. Módulo Projetos (`/projects`)

**Arquivo de rotas**: `src/routes/projects.routes.tsx`  
**Guard**: `ProjectRoute` → `BuRequired` + `ModuleRoute("projects")`

| Rota | Página | Descrição |
|------|--------|-----------|
| `/projects` | `ProjectsPage` | Lista de projetos |
| `/projects/:id` | `ProjectDetailPage` | Detalhe do projeto |

### 10.1 Conceitos-Chave

- Projetos são vinculáveis a Key Results como itens de suporte
- Marcos (`milestones`) de projetos podem ser exibidos inline nos wizards
- Projetos sem vínculo estratégico aparecem na seção "Itens sem vínculo"

---

## 11. Módulo Events (`/events`)

**Arquivo de rotas**: `src/routes/events.routes.tsx`  
**Guard**: `EventRoute` → `BuRequired` + `ModuleRoute("events")` + `EventsProvider`

> **Nota**: Módulo 100% mockado, sem dependência de banco de dados.

| Rota | Página | Descrição |
|------|--------|-----------|
| `/events` | `EventsDashboardPage` | Dashboard de eventos |
| `/events/participants` | `EventsParticipantsFullPage` | Lista de participantes |
| `/events/participants/:id` | `EventsParticipantDetailPage` | Detalhe do participante |
| `/events/opportunities` | `EventsOpportunitiesPage` | Oportunidades |
| `/events/webhook` | `EventsWebhookPage` | Config de webhooks |
| `/events/settings` | `EventsSettingsPage` | Configurações |
| `/events/settings/:eventId` | `EventSettingDetailPage` | Detalhe de configuração |

### 11.1 Captura Pública

Rota pública (sem autenticação): `/p/events/capture/:eventCode`  
Usada para captura de participantes em eventos via QR code ou link compartilhado.

---

## 12. Rotas Públicas

**Arquivo de rotas**: `src/routes/public.routes.tsx`

Rotas que NÃO requerem autenticação nem BuProvider:

| Rota | Página | Descrição |
|------|--------|-----------|
| `/auth` | `Auth` | Login/Signup |
| `/auth/callback` | `AuthCallback` | Callback OAuth/Magic Link |
| `/p/assets/:code` | `PublicAsset` | Visualização pública de ativo (QR code) |
| `/p/events/capture/:eventCode` | `EventsCapturePage` | Captura de evento |

**Paths públicos** (para guards ignorarem): `/auth`, `/auth/callback`, `/p/assets`, `/p/events`

---

## 13. Mapa Completo de Rotas por Módulo

### Resumo de Quantidades

| Arquivo de Rotas | Módulo | Rotas | Guard Base |
|-----------------|--------|-------|------------|
| `public.routes.tsx` | Público | 4 | Nenhum |
| `core.routes.tsx` | Core | 15 | Variável |
| `settings.routes.tsx` | BU Settings | 8 | SettingsRoute / PartnersRoute |
| `okrs.routes.tsx` | OKRs | 22 | OkrRoute |
| `teams.routes.tsx` | Teams | 4 | TeamRoute |
| `assets.routes.tsx` | Assets | 9 | AssetRoute |
| `tickets.routes.tsx` | Tickets | 4 | TicketRoute |
| `projects.routes.tsx` | Projetos | 2 | ProjectRoute |
| `events.routes.tsx` | Events | 7 | EventRoute |
| `hub.routes.tsx` | Hub Admin | 20 | HubRoute |
| **Total** | | **~95** | |

### Arquivo de Composição

**`src/routes/index.ts`**: Compõe todas as rotas em um único `<Routes>` tree.

---

## Arquivos-Chave por Módulo

### Core
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/core.routes.tsx` | Rotas core |
| `src/pages/Index.tsx` | Home da BU |
| `src/pages/SelectBu.tsx` | Seleção de BU |
| `src/pages/Onboarding.tsx` | Fluxo de onboarding |
| `src/pages/Wizards.tsx` | Hub de rituais |

### Settings
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/settings.routes.tsx` | Rotas de settings |
| `src/pages/settings/BuSettingsPage.tsx` | Config da BU |
| `src/modules/permissions/pages/BuPermissionsPage.tsx` | Permissões BU |
| `src/modules/areas/pages/AreasPage.tsx` | Áreas estratégicas |
| `src/modules/okrs/pages/RitualCalendarPage.tsx` | Calendário de rituais |

### OKRs
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/okrs.routes.tsx` | Rotas OKRs |
| `src/modules/okrs/types.ts` | Tipos base |
| `src/modules/okrs/types/wizard.ts` | WizardPersona + configs |
| `src/modules/okrs/hooks/useWizardSession.ts` | CRUD sessões |
| `src/modules/okrs/hooks/useRitualHistory.ts` | Histórico + labels |
| `src/modules/okrs/hooks/useGenericWizardDraft.ts` | Persistência drafts |
| `src/modules/okrs/utils/progressCalculation.ts` | Cálculo de progresso |

### Teams
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/teams.routes.tsx` | Rotas teams |
| `src/modules/teams/pages/TeamsPage.tsx` | Lista de times |
| `src/modules/teams/pages/TeamDetailPage.tsx` | Detalhe |
| `src/modules/teams/pages/OrganogramPage.tsx` | Organograma |

### Assets
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/assets.routes.tsx` | Rotas assets |
| `src/modules/assets/pages/AssetsPage.tsx` | Layout container |
| `src/modules/assets/pages/InventoryPage.tsx` | Inventário |
| `src/modules/assets/pages/KeysPage.tsx` | Chaves |
| `src/modules/assets/pages/GiftsPage.tsx` | Brindes |

### Tickets
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/tickets.routes.tsx` | Rotas tickets |
| `src/modules/tickets/pages/TicketsPage.tsx` | Layout com tabs |
| `src/modules/tickets/pages/TicketDetailPage.tsx` | Detalhe |
| `src/modules/tickets/pages/TicketsSettingsPage.tsx` | Config |

### Projetos
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/projects.routes.tsx` | Rotas projetos |
| `src/modules/projects/pages/ProjectsPage.tsx` | Lista |
| `src/modules/projects/pages/ProjectDetailPage.tsx` | Detalhe |

### Events
| Arquivo | Propósito |
|---------|-----------|
| `src/routes/events.routes.tsx` | Rotas events |
| `src/modules/events/context/EventsContext.tsx` | Provider |
| `src/modules/events/pages/EventsDashboardPage.tsx` | Dashboard |
