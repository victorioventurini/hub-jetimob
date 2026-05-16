# Technical Context Registry (TCR) — Hub da Jet

> ⚠️ **ARQUIVO LEGADO — NÃO CARREGAR EM LOOPS DE TRABALHO.**
>
> Substituído pela estrutura fragmentada em `docs/canonical/core/` + `docs/canonical/modules/`:
> - **Router:** [`core/INDEX.md`](./core/INDEX.md) — mapeia pedido → arquivos mínimos
> - **Regras transversais:** [`core/TCR_CORE.md`](./core/TCR_CORE.md) (~280 linhas vs 2800 deste arquivo)
> - **Por módulo:** [`modules/<x>.md`](./modules/) — ex.: `modules/okrs.md`, `modules/projects.md`
> - **Masters em `mem://`** continuam sendo SSOT para detalhes funcionais.
>
> Este arquivo é mantido apenas como referência histórica. Conteúdo movido — fonte da verdade agora é a estrutura acima + `src/integrations/supabase/types.ts` para schema.

---

**Versão:** 3.31.1  
**Última atualização:** 2026-05-04 (v3.30.0 — **MBR v2 + Pré-MBR Hardening**: novo rito paralelo `/rituals/mbr-v2` agrupado por Org Objective + severidade (consome Pré-MBR v1 sem alteração); KPI Gate do Pré-MBR ancorado ao **mês de referência** via `classifyKpiGateBucketsFromMonthlySnapshots` + `useMbrPreTeamKpisMonthly` (elimina contaminação por valores de meses futuros); `safeProjectJustifications` em `MbrPreProjectsStep` e fallbacks `?? { projects: {}, milestones: {} }` em `MbrPrePage` para drafts antigos sem `projectJustifications`; novos docs canônicos `MBR_RITUAL.md` e `PRE_CHECKLIST.md`. v3.29.1 anterior — **KPI Input Type Rename**: valor `kpi_input_type.projection` renomeado para `partial` via `ALTER TYPE RENAME VALUE`. Semântica correta: valor parcial observado até a data antes do período fechar (não é estimativa). UI atualizada (radio "Parcial / Valor atingido até a data, antes do período fechar"), badges e legendas em chart/tabela/KPI Gate. Zero registros afetados (todos os 63 valores existentes eram `consolidated`). Funções DB e RLS preservadas. v3.29.0 anterior — **KPI Frequency Split v3.0.0** ✅: novos enums `kpi_frequency_value` (7 valores), `kpi_update_mode`, `kpi_input_type`; `kpi_metrics` ganha `consolidation_frequency`, `update_frequency`, `update_mode`, `frequency_migration_reviewed`; `kpi_values` ganha `input_type`; triggers `kpi_frequency_validation` e `trg_kpi_value_derive_confidence`; função `kpi_calculate_period_v2` com semântica formal de biweekly/semiannual; UI: 6-bucket KPI Gate, banners de migração, parcial × consolidado em chart/tabela, auditoria 100% íntegra (32/32 KPIs migrados, 63/63 valores marcados consolidated). SSOT em `mem://features/kpis/kpis-master-standard`.)
**Responsável:** Lovable AI / Equipe de Engenharia
**Status:** V2-only mode ativo | Identity Cutover v3.0 completo | RLS V2 100% migrado | **Pré-MBR Reference-Month KPI Gate ✅** | **Pré-MBR Resilient Drafts ✅** | Vic Culture System ativo | Auth Magic Link ativo | Automated Testing Framework v1.2 ativo | **AI Agents Philosophy v1.0** ✅ | **Áreas (Strategic Layer) v1.0** | **Performance Metrics Dashboard (P4)** | **Saved Links System v1.4** | **Performance Wave P5.1 COMPLETO** | **Cycle Checkins Evolution View v1.0** | **Team OKR/KR Linking Edit v1.0** | **Internal User Auth Hardening v1.0** | **Global Partner Companies v1.0** | **Global Partner Contacts v1.0** | **RLS Security Audit v1.0** | **Tickets Pinned Messages v1.0** | **Tickets Transfer System v1.0** | **Tickets Attachments RLS v3** | **Identity Hardening v2.1** | **Notification Templates v2.0** | **Impersonation Wildcard Fix v1.0** | **can_view_ticket Hybrid User Support v1.0** | **Unified Participant Layer v1.0** | **External User Identity Pattern v1.0** | **Edge Functions Error Handler v1.0** | **Hooks Barrel Consolidation v1.0** | **Documentation Hierarchy v1.0** | **SQL Functions Audit** | **Edge Functions Audit (26 funções)** | **Ticket Message Pinning RLS v3** | **Database Hygiene v1.0** | **Routes Modularization v1.0** | **Systemic Health Audit v1.0** | **Comprehensive Hygiene Audit v1.0** | **Backend Robustness Audit v2.0** | **PII Security Hardening v1.0** ✅ | **Security Scan 0 Errors** ✅ | **System Health Score 10/10** ✅ | **Módulo Projetos v1.4** ✅ | **Ritual Calendar & Cadences v1.0** ✅ | **handle_new_user Deterministic BU Fix v1.0** ✅ | **Hub Admin Deep Dive Docs v1.0** ✅ | **BU Settings Deep Dive Docs v1.0** ✅ | **QBR Rituals Enhancement v1.1** ✅ | **QBR Executive Report v1.1** ✅ | **Auth Token Refresh Deduplication v1.0** ✅ | **URL Detonation Mitigation v1.1** ✅ | **Unified Wizard Framework v4 (Ondas 1-3 ATIVAS)** ✅

> 📚 **Documentação Técnica Consolidada:**
>
> ### Padrões de Desenvolvimento
> - [DEVELOPMENT_STANDARDS.md v1.27.0](./DEVELOPMENT_STANDARDS.md) — **Padrões Obrigatórios** (PRE-BU/POST-BU, Identity, RBAC, Queries, URL State, Edge Functions)
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
> - [COMPREHENSIVE_TECHNICAL_AUDIT_2026-02-08.md](../audits/COMPREHENSIVE_TECHNICAL_AUDIT_2026-02-08.md) — **Auditoria técnica completa** ⭐ NOVO
> - [SYSTEMIC_HEALTH_AUDIT_2026-02-07.md](../audits/SYSTEMIC_HEALTH_AUDIT_2026-02-07.md) — Auditoria sistêmica de saúde
> - [COMPREHENSIVE_HYGIENE_AUDIT_2026-02-07.md](../audits/COMPREHENSIVE_HYGIENE_AUDIT_2026-02-07.md) — Auditoria de higienização
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
  6. Usuário clica no link e é redirecionado para `/auth/callback` (ou `/auth/confirm` para domínios protegidos — ver §1.2.1)
  7. `AuthCallback.tsx` verifica o `token_hash` via `supabase.auth.verifyOtp()` para estabelecer sessão
  8. Profile é criado automaticamente via trigger `handle_new_user()` (se não existir), com `user_type = 'external'` e `employment_status = 'external'` para usuários externos

> **Nota (v2.65.0):** O sistema usa Magic Link com `token_hash` no URL (não hash fragment) para evitar problemas com SendGrid click tracking que remove fragmentos de URL.

#### 1.2.1 URL Detonation Mitigation (v3.25.1)

**Problema:** Gateways corporativos de proteção de email (Mimecast, Proofpoint, Microsoft Defender ATP) escaneiam links recebidos clicando neles em sandbox **antes** de entregar a mensagem ao destinatário. Como `/auth/callback` chama `verifyOtp` automaticamente no `useEffect`, o **scanner consome o token single-use** — quando o usuário real clica, recebe `otp_expired` ou erro de rede ("Failed to fetch").

**Solução:** Fluxo dual no `request-magic-link/index.ts` baseado em uma allowlist de domínios afetados:

| Domínio | Callback URL | Comportamento |
|---------|--------------|---------------|
| Padrão | `/auth/callback` | Auto-verifica token no mount (UX inalterada) |
| Em `URL_DETONATION_DOMAINS` | `/auth/confirm` | Renderiza botão "Acessar o Hub" — só verifica após clique manual |

**Página `/auth/confirm`** (`src/pages/AuthConfirm.tsx`):
- **NÃO chama `verifyOtp` no mount**
- Renderiza botão "Acessar o Hub"
- Ao clique → navega para `/auth/callback?token_hash=...&type=magiclink&next=...` preservando query params
- Scanners automatizados não clicam no botão → token preservado para o usuário real

**Como adicionar novo domínio:**
```ts
// supabase/functions/request-magic-link/index.ts
const URL_DETONATION_DOMAINS = [
  "ferrigoloadvogados.com.br",
  // adicionar novos domínios aqui
];
```

Mudança backward-compatible: zero migração, zero impacto em outros domínios.

**Tratamento de erros em `AuthCallback.tsx`** — função `classifyError()` separa em 3 categorias:
- **`network`** (`Failed to fetch`, `NetworkError`) → "Conexão bloqueada. Tente outra rede ou modo anônimo."
- **`expired`** (`otp_expired`, `Token has expired`, `invalid_token`) → "Link expirado ou já usado."
- **`generic`** → fallback genérico

Cada categoria exibe CTAs específicos: botão "Solicitar novo link" preserva email via `?email=` ao redirecionar para `/auth`. A página `/auth` consome `?email=` via `useSearchParams` para pré-preencher o input no retry.

**Casos de uso típicos:** escritórios de advocacia, contabilidade, saúde e órgãos governamentais. Quando um usuário reportar "recebi o link mas dá erro ao clicar", classificar primeiro pelo domínio antes de investigar bugs de aplicação.

##### 1.2.1.1 Hardening defensivo (v3.25.1)

Após regressão observada em produção (rota `/auth/confirm` criada na v3.25.0 mas não montada no bootstrap, e magic links legados com `next=/auth/callback?next=...` aninhado), foram adicionadas duas camadas defensivas:

**1. Fonte única de verdade para rotas públicas**
- `src/routes/public.routes.tsx` exporta `publicRoutes` (JSX `<Route>`) e `PUBLIC_PATHS` (lista canônica).
- `src/App.tsx` consome `{publicRoutes}` em vez de hardcoded — qualquer nova rota pública (ex.: `/auth/confirm`) passa a ser montada automaticamente.
- **Regra:** novas rotas públicas DEVEM ser adicionadas exclusivamente em `src/routes/public.routes.tsx`. Editar `App.tsx` para registrar rota pública é violação.

**2. Normalização de `next` aninhado (`src/lib/authRedirect.ts`)**
- `normalizeAuthNext(raw)` recursivamente desempacota `next` que aponte para `/auth/callback` ou `/auth/confirm`, retornando o destino real (ou `/`).
- Rejeita absolutos (`http://...`) e protocol-relative (`//evil.com`) — somente paths internos `/...`.
- Aplicado em `Auth.tsx`, `AuthCallback.tsx`, `AuthConfirm.tsx` e (server-side) em `request-magic-link/index.ts` antes de montar `redirectTo`.
- Garante que mesmo bundle antigo do cliente que envie `redirectTo` aninhado gere link de email correto.



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

#### Arquitetura de Clientes (v3.23.0)

| Cliente | Arquivo | Uso | `detectSessionInUrl` | `autoRefreshToken` |
|---------|---------|-----|---------------------|---------------------|
| **Global Singleton** | `globalClient.ts` | Auth, bootstrap, pré-BU | `false` | ✅ `true` (único a renovar tokens) |
| **BU-Scoped Singleton** | `buScopedClient.ts` | Dados operacionais | `false` | ❌ `false` (sincroniza via listener do globalClient) |
| **Auto-generated** | `client.ts` | ❌ **NÃO USAR** (apenas para compatibilidade) | `false` | `true` (não importado por nenhum arquivo) |

> ⚠️ **CRÍTICO (v3.23.0 — Token Refresh Deduplication):** Apenas o `globalClient` deve ter `autoRefreshToken: true`. O `buScopedClient` escuta `TOKEN_REFRESHED` do `globalClient` e re-lê a sessão do localStorage compartilhado. Ter múltiplos clientes renovando tokens causa **tempestade de 429** no endpoint `/token`, resultando em perda de sessão.

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

> ⚠️ **REGRA INQUEBRÁVEL (v3.6.0):** Usar `useBuScopedSupabase()` **NÃO É SUFICIENTE** para isolamento. Toda query de listagem **DEVE** incluir `.eq('bu_id', currentBuId)` explicitamente, e toda query de detalhe **DEVE** validar `data.bu_id !== currentBuId` pós-fetch. A RLS permite acesso multi-BU para admins — sem filtro frontend, dados vazam entre BUs.
>
> **Referência completa:** [DEVELOPMENT_STANDARDS.md §A.3](./DEVELOPMENT_STANDARDS.md) | [BU_SCOPED_SUPABASE_RULES.md §Filtragem](./BU_SCOPED_SUPABASE_RULES.md)

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
| **Dialog Form Reset** | `useDialogFormReset()` | Reset de form APENAS quando dialog abre (closed→open), evita perda de edições por refetch |
| **Team Area (auto-inference)** | `useTeamArea()` | Busca área associada a um time para inferência automática em escopo='team' |

#### Componentes Canônicos por Domínio

| Domínio | Componente | Descrição |
|---------|------------|-----------|
| **Select de usuário** | `BuUserSelect` | Dropdown para selecionar 1 usuário. Campo opcional → exigir `allowNone` |
| **Multi-select de usuários** | `BuUserMultiSelect` | Dropdown para selecionar múltiplos usuários |
| **Select de time** | `TeamSelect` | Dropdown hierárquico de times. **Campo opcional → exigir `includeNone noneLabel="..."`** (Radix Select não limpa nativamente). Ver `mem://standards/ui/optional-select-include-none` |
| **Select de área** | `AreaSelect` | Dropdown de áreas. Mesma regra de `includeNone` para campos opcionais; quando obrigatoriedade é reativa a outro campo (ex.: `lifecycle_status === 'active'`), usar `includeNone={!isRequired}` |
| **Select de unidades** | `UnitSelect` | Dropdown categorizado para unidades de medida (KRs, KPIs, Wizards) |
| **Avatar otimizado** | `OptimizedAvatar` | Avatar com lazy loading e fallback |
| **Guard de permissão** | `PermissionGuard` | Renderiza children se permissão existe |
| **Require permissão** | `RequirePermission` | Bloqueia acesso se permissão não existe |
| **Lista + tooltip de overflow** | `EntityNamesCell` | **SSOT obrigatório** para qualquer célula/lista que mostre múltiplas entidades (Times, Usuários, Squads, KRs, ...) com truncamento e tooltip detalhado. Para novos tipos: estender o próprio componente (nova prop + grupo no tooltip), nunca criar tooltip paralelo (`title=` HTML, Tooltip ad-hoc). |

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
| job_title_id | uuid | FK para job_titles |
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
| manager_user_id | uuid | Gestor direto (**auto-atribuído** via trigger `sync_manager_from_team_leader` quando `team_id` é definido e gestor está vazio — ver §4.8) |

**Escopo:** Por BU (via bu_id)

**RLS de Visibilidade (v3.24.0):**
- `profiles_select_own_v2`: usuário sempre vê o próprio perfil (`user_id = auth.uid()`)
- `profiles_select_bu_v2`: viewer vê perfil se:
  1. É membro da BU primária do perfil (`is_profile_bu_member(my_profile_id(), profiles.bu_id)`), **OU**
  2. Compartilha qualquer BU em comum via `bu_user_memberships` (cross-BU visibility)

**Triggers de Gestão Automática (v3.7.0):**

| Trigger | Evento | Função |
|---------|--------|--------|
| `trg_sync_manager_from_team_leader` | INSERT/UPDATE em `profiles` (quando `team_id` muda) | Se `manager_user_id IS NULL` e time tem líder, preenche com `teams.leader_user_id`. Não se auto-atribui. |
| `trg_propagate_leader_change` | UPDATE em `teams` (quando `leader_user_id` muda) | Atualiza `manager_user_id` de membros que apontavam para o líder antigo. Preserva gestores manuais. |

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

**Limite:** Máximo 4 objetivos ativos por time (validado via trigger)

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

**Limite:** Máximo 4 KRs por objetivo (validado via trigger)

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
| comments | text | Comentário em texto livre. Menções (@) são processadas apenas no `CheckinDialog` do drawer `/okrs`; o Check-in Individual (wizard colaborador) grava texto puro. |
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
| owner_user_id | uuid | **Responsável (Accountable)** — dono do resultado, monitora desvios e age para "mover o ponteiro". Distinto de "Atualizado por" (ver `kpi_data_contributors` role=`data_entry`). |
| unit | text | Unidade |
| direction | enum | `up`, `down` |
| frequency | enum | `daily`, `weekly`, `monthly`, `quarterly`, `manual` |
| target_value | numeric | Meta |
| status | enum | `active`, `inactive` — **@deprecated**: mantido por trigger `trg_kpi_metrics_sync_status_lifecycle` para retrocompatibilidade. Toda lógica nova deve ler/escrever `lifecycle_status`. |
| is_global | bool | Se é global (visível para toda BU) |
| **indicator_type** | enum | `kpi`, `metric` |
| **lifecycle_status** | enum | `proposed`, `active`, `observing`, `deprecated` — **SSOT canônico** de ciclo de vida (v2.1). Sincronizado com `status` legado via trigger. |
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

#### **kpi_data_contributors** — Contribuidores operacionais (v2.83.0+)
Separa **quem é responsável pelo resultado** (`kpi_metrics.owner_user_id`) de **quem atualiza os valores** (este registro com `role='data_entry'`).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| kpi_id | uuid | FK para kpi_metrics (ON DELETE CASCADE) |
| contributor_user_id | uuid | FK para profiles |
| role | enum `kpi_contributor_role` | `data_entry` (atualiza valores) ou `reviewer` (revisa) |
| notes | text | Observações |
| bu_id | uuid | FK para bu_units (BU isolation) |
| created_by | uuid | FK para profiles |
| deleted_at | timestamptz | Soft delete |

**Unique:** `uq_kpi_contributor (kpi_id, contributor_user_id, deleted_at)` NULLS NOT DISTINCT
**Escopo:** Por BU

**Convenção UI "Atualizado por" (v2.92.0):**
- Cada KPI tem **1 único** contribuidor `data_entry` ativo, exposto na UI como campo "**Atualizado por**" ao lado de "Responsável" em Criar/Editar KPI.
- Helper canônico: `useKpiPrimaryDataEntry(kpiId)` (leitura) e `useUpsertKpiPrimaryDataEntry()` (escrita idempotente: soft-delete antigos + insert novo).
- **Obrigatório** quando `lifecycle_status='active'` (mesma regra de `owner_user_id`).
- **Backfill (2026-04-28):** todos os KPIs ativos com `owner_user_id` receberam um registro `data_entry` copiado do responsável (idempotente, respeita `uq_kpi_contributor`).
- Múltiplos contribuidores e role `reviewer` permanecem suportados no schema/RLS, mas hoje a UI canônica é single-user. Não usar `KpiContributorsManager` (componente órfão) sem decisão explícita.

**RLS:** SELECT por membro da BU; INSERT/UPDATE/DELETE para `has_permission(... 'kpis.metric.update:bu')` ou owner do KPI (`kpi_metrics.owner_user_id = my_profile_id()`).

---

### 2.4 Módulo Assets (Patrimônio)

O módulo Assets controla bens patrimoniais, chaves, brindes e linhas telefônicas com **4 sub-módulos independentes**, cada um com permissões próprias.

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

#### **asset_phone_lines** — Linhas Telefônicas
Linhas telefônicas corporativas da BU.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| bu_id | uuid | FK para bu_units |
| phone_number | text | Número de telefone (único por BU) |
| carrier | text | Operadora (ex: Vivo, Claro) |
| plan_type | text | `prepaid` ou `postpaid` |
| status | text | `available`, `loaned` |
| current_user_id | uuid | FK para profiles (quem usa atualmente) |
| responsible_user_id | uuid | FK para profiles (responsável pela linha, opcional) |
| linked_asset_id | uuid | FK para asset_inventory (vínculo opcional) |
| notes | text | Observações |

**Regras:**
- Status `loaned` exige `current_user_id` (validado via trigger `validate_phone_line_loan`)
- Unicidade de `phone_number` por BU (onde `deleted_at IS NULL`)
- Soft delete obrigatório via `deleted_at`
- `responsible_user_id` é opcional e independente do `current_user_id`

**Permissões específicas:** `phone_lines_admin`, `phone_lines_manager`, `phone_lines_viewer` + chaves granulares (view, loan, link_asset, etc.)

---

#### Trilha de Auditoria Field-Level (Padrão Assets)

O módulo Assets implementa **trilha de auditoria automática via triggers** para capturar todas as alterações de campo em entidades críticas. O padrão é escalável e deve ser usado em novos sub-módulos.

**Tabelas com audit triggers:**

| Tabela | entity_type | Trigger |
|--------|-------------|---------|
| `asset_phone_lines` | `asset_phone_line` | `trg_audit_asset_phone_lines` |
| `asset_inventory` | `asset_inventory` | `trg_audit_asset_inventory` |
| `asset_keyrings` | `asset_keyring` | `trg_audit_asset_keyrings` |

**Arquitetura:**
1. Trigger `AFTER INSERT/UPDATE/DELETE` na tabela de origem
2. Grava na tabela central `audit_logs` com `entity_type` para segmentação
3. Payload JSONB com `old_values` e `new_values` completos
4. `user_id` via `auth.uid()` (identidade de sessão)

**Frontend:**
- Hook genérico: `useAuditHistory({ entityType, entityId, queryKey })`
- Componente compartilhado: `AuditHistoryTimeline` (recebe `fieldLabels`, `valueLabels`, `ignoredFields`)
- Wrappers por módulo: `InventoryHistory`, `KeyringHistory`, `PhoneLineHistory`
- Visualização em aba "Histórico de Alterações" nos diálogos/views de detalhe

**Query Keys:** `assetsKeys.inventory.history(id)`, `assetsKeys.keys.history(id)`, `assetsKeys.phoneLines.history(id)`

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

> 📐 **Governança canônica:** A criação, reutilização e modificação de agentes seguem **obrigatoriamente** [`AI_AGENTS_PHILOSOPHY.md`](./AI_AGENTS_PHILOSOPHY.md) (v1.0.0). Adaptações contextuais usam `ai_agent_instruction_sources` (não inchar `system_prompt` base). Ver §4.12 para a matriz de decisão.

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
| **Projetos** | `projects` | Gestão de projetos com milestones, vinculação a KRs, health tracking | ✅ Ativo |

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

### 3.3.1 Módulo Projetos (v1.4)

**Tabelas:** `projects`, `project_teams`, `project_krs`, `project_milestones`, `project_milestone_dependencies`, `milestone_krs`, `project_comments`, `project_comment_attachments`

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `projects` | Projetos com owner, status, datas (start_date e due_date obrigatórias), BU scope | ✅ BU-scoped + owner/admin |
| `project_teams` | Junction project ↔ team | ✅ Herda via JOIN |
| `project_krs` | Junction project ↔ key_result com impacto (high/medium/low) | ✅ Herda via JOIN |
| `project_milestones` | Marcos do projeto com status, due_date, notes (texto livre) e owner_id (opcionais) | ✅ BU-scoped |
| `project_milestone_dependencies` | Dependências entre milestones | ✅ Herda via JOIN |
| `milestone_krs` | Junction milestone ↔ key_result com impacto (high/medium/low) — permite vinculação granular de KRs a marcos individuais (cross-area) | ✅ BU-scoped |
| `project_comments` | Comentários de projeto com body_richtext, reply, pin, soft-delete | ✅ BU-scoped + author/admin |
| `project_comment_attachments` | Arquivos anexados a comentários de projeto | ✅ BU-scoped + author |

**Enums:** `project_status` (planned, in_progress, paused, done, cancelled), `project_impact` (high, medium, low)

**Função SQL:** `calculate_project_health(project_id uuid)` → retorna `on_track`, `at_risk` ou `late` baseado em milestones atrasados

**Storage Bucket:** `project-attachments` (privado, signed URLs)

**Frontend:**
- `src/modules/projects/` — types (2 arquivos), hooks (19 hooks), utils (2 arquivos), components (16 componentes)
- **Páginas:** `/projects` (lista com filtros por URL state + toggle lista/gantt + filtros salvos), `/projects/:id` (detalhe com milestones, gantt inline, KR links, comentários)
- **Integrações aditivas:** `ProjectsSummary` nos wizards (TeamCheckin, LeaderPrep, MBR), `ProjectsForKrSection` na visão de KR, `ProjectsForKrLinkingSection` na expansão de KR no dashboard OKR, `MyProjectsCard` na Home

**Identity:** `owner_id` = `profiles.id` (convenção canônica)

**Campos obrigatórios (Projeto):** `name`, `owner_id`, `start_date`, `due_date` — validação via Zod no `ProjectDialog`
**Campos opcionais (Milestone):** `due_date`, `owner_id`, `notes` — todos opcionais

**Hooks (19):**
| Hook | Propósito |
|------|-----------|
| `useProjects` | Listagem com filtros (status, owner, team, KR link, search) |
| `useProject` | Detalhe com relações (owner, teams, KRs, milestones) |
| `useProjectMutations` | CRUD de projetos (create, update, soft-delete) |
| `useMilestones` | Listagem de milestones por projeto |
| `useMilestoneMutations` | CRUD de milestones (create, update, soft-delete) |
| `useMilestoneKrLinks` | Mutations para vincular/desvincular KRs a milestones |
| `useMilestoneKrs` | Leitura de KRs vinculadas a um milestone |
| `useMilestonesForKr` | Milestones vinculados a uma KR específica |
| `useProjectKrLinks` | Mutations para vincular/desvincular KRs a projetos |
| `useKrsForLinking` | KRs disponíveis para vincular (combobox) |
| `useProjectsForLinking` | Projetos disponíveis para vincular a KRs |
| `useProjectsForKr` | Projetos vinculados a uma KR (read) |
| `useProjectsForWizard` | Projetos para contexto de wizard |
| `useProjectPermissionsV2` | Flags de permissão (canView, canCreate, canEdit, canDelete) |
| `useGanttData` | Transforma projetos em GanttItem[] para timeline |
| `useProjectComments` | Listagem de comentários e anexos por projeto |
| `useProjectCommentMutations` | CRUD de comentários (create, edit, delete, pin) |

**Componentes (16):**
| Componente | Propósito |
|------------|-----------|
| `ProjectCard` | Card na listagem |
| `ProjectDialog` | Dialog de criação/edição com validação |
| `ProjectFiltersBar` | Filtros (status, owner, team, KR link, search) |
| `ProjectGanttChart` | Gantt de projetos + milestones (Recharts) |
| `ProjectViewToggle` | Toggle lista/gantt |
| `ProjectHealthBadge` | Badge de saúde (on_track/at_risk/late) |
| `ProjectStatusBadge` | Badge de status |
| `ProjectProgressBar` | Barra de progresso de milestones |
| `ProjectKrLinkSection` | Seção de KRs vinculadas a projeto |
| `MilestoneCreateForm` | Form inline para criar milestone com notes |
| `MilestonesTable` | Tabela de milestones (status inline, owner, datas, notas em linha-extra, menu de ações Editar/Remover com gating row-aware) |
| `MilestoneGanttChart` | Gantt de milestones dentro do projeto |
| `MilestoneKrLinkSection` | Seção de KRs vinculadas a milestone |
| `ProjectCommentsSection` | Thread de comentários com menções, reply, pin e anexos |
| `ProjectsForKrSection` | Projetos vinculados a uma KR (read + link) |
| `ProjectsSummary` | Resumo para wizards |

#### Permissões do Módulo Projects

| Template | Slug | Keys | Descrição |
|----------|------|------|-----------|
| Projetos: Gestor | `projects_manager` | 7 | Criar/editar projetos e milestones. Sem exclusão. |
| Projetos: Admin | `projects_admin` | 8 | Tudo + exclusão de projetos |

**Permission Keys:**
- `projects.project.read:bu`, `projects.project.create:bu`, `projects.project.update:bu`, `projects.project.delete:self_or_owner`
- `projects.milestone.read:bu`, `projects.milestone.create:bu`, `projects.milestone.update:bu`, `projects.milestone.delete:bu`

**Hook:** `useProjectPermissionsV2` — flags: `canViewProjects`, `canCreateProject`, `canEditProject`, `canDeleteProject`, `canViewMilestones`, `canCreateMilestone`, `canEditMilestone`, `canDeleteMilestone`, `hasFullAccess`, `isLoading` + helpers row-aware: `canEditProjectRecord`, `canDeleteProjectRecord`, `canEditMilestoneRecord`, `canDeleteMilestoneRecord`.

**Module Access:** Registrado em `MODULE_VIEW_PERMISSIONS` com keys `projects.project.read:bu` e `projects.milestone.read:bu` (sidebar + ModuleRoute guard)

##### Autoridade de Soft-Delete de Milestones (v2026-04-27)

Defesa em 4 camadas (UI → Hook → RLS → Trigger DB):

| Ação | Quem pode |
|------|-----------|
| Editar marco (todos os campos exceto `deleted_at`) | Project owner, milestone owner, líder do project owner, bu admin, `projects.milestone.update:bu` |
| Remover marco (soft-delete) | Project owner, líder do project owner, bu admin, `projects.milestone.delete:bu` |

⚠️ Milestone owner **NÃO pode remover** o próprio marco — apenas editar.

A barreira definitiva é o trigger `enforce_milestone_soft_delete_authority` (BEFORE UPDATE OF `deleted_at` em `project_milestones`), que retorna `ERRCODE 42501` com mensagem `INSUFFICIENT_PRIVILEGE: only the project owner can remove milestones` quando a lista de autorizados não inclui o ator. SSOT canônico: `mem://features/projects/milestone-permissions-row-aware`.

#### URL State Parameters (Projects)

| Página | Parâmetro | Valores | Descrição |
|--------|-----------|---------|-----------|
| `/projects` | `status` | `all`, `planned`, `in_progress`, `paused`, `done`, `cancelled` | Filtro por status |
| `/projects` | `owner` | UUID | Filtro por responsável |
| `/projects` | `teamId` | UUID | Filtro por time |
| `/projects` | `krLink` | `linked`, `not_linked` | Filtro por vinculação a KR |
| `/projects` | `q` | texto | Busca local (nome do projeto e milestone) |
| `/projects` | `view` | `list`, `gantt` | Toggle de visualização |

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

- **Máximo 4 objetivos ativos** por time
- **Máximo 4 KRs** por objetivo
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

O Hub implementa 10 wizards full-page para rituais de OKRs, cada um com propósito e periodicidade específicos.

> 🧱 **Framework Unificado (v3.26.0):** Todos os ritos canônicos de gestão são agora gerenciados pelo **Framework Unificado de Wizards** com versionamento estrutural por sessão. Detalhes técnicos em **§4.8.1** abaixo. As tabelas a seguir descrevem o **comportamento funcional** de cada rito; a estrutura interna (steps, gates, completion rules) é resolvida por dispatcher.

#### Rituais Semanais/Mensais (Check-in + MBR)

| Wizard | Rota | Propósito | Frequência | Participante |
|--------|------|-----------|------------|--------------|
| **Collaborator Check-in** | `/rituals/collaborator-checkin` | Atualização individual de KRs, iniciativas e reflexão | Semanal (sextas) | Colaborador |
| **Pré Check-in do Time** | `/rituals/team-checkin-pre` | Preparação do líder para rituais do time | Semanal (segundas) | Líder de time |
| **Team Check-in** | `/rituals/team-checkin` | Ritual síncrono de revisão coletiva | Semanal | Líder + membros |
| **Managers Check-in** | `/rituals/managers-checkin` | Alinhamento cross-time e resolução de dependências | Quinzenal/Mensal | Gestores de área |
| **C-Level Check-in** | `/rituals/clevel-checkin` | Revisão estratégica de OKRs organizacionais | Mensal | C-Level/Diretores |
| **MBR (Monthly Business Review)** | `/rituals/mbr` | Revisão estratégica mensal: KPIs mestres, OKRs por time e organizacionais, decisões | Mensal | BU Admin |

#### QBR — Quarterly Business Review (v1.1)

O QBR é um ritual trimestral de 4 fases que fecha o ciclo e prepara o próximo, com governança progressiva (líder → C-Level → reunião → formalização).

| Fase | Wizard | Rota | Propósito | Participante | Acesso |
|------|--------|------|-----------|--------------|--------|
| **1. Pré-QBR (Líderes)** | `QbrPrePage` | `/rituals/qbr-pre` | Balanço do ciclo, análise de KPIs, aprendizados, proposta de OKRs | Líder de time | `RitualRoute` |
| **2. Pré-QBR (C-Level)** | `QbrPreCLevelPage` | `/rituals/qbr-clevel` | Consolidação de scorecards, balanço do quarter, análise estratégica, calibração de OKRs, diretrizes | C-Level/BU Admin | `requiresBuAdmin` |
| **3. Reunião QBR** | `QbrMeetingPage` | `/rituals/qbr` | Scorecard + pauta C-Level, aprovação de OKRs por time com flags de calibração, decisões, compromissos, checklist dinâmico de governança | BU Admin | `requiresBuAdmin` |
| **4. Pós-QBR** | `QbrPostPage` | `/rituals/qbr-post` | Promoção de OKRs aprovados com ajuste inline, formalização de dependências, resumo automático + ata executiva | BU Admin | `requiresBuAdmin` |

**Controle de abertura:** Campo `qbr_status` na tabela `cycles` (`open`, `collecting`, `closed`). O wizard Pré-QBR só está disponível quando `qbr_status IN ('open', 'collecting')`.

**Etapas do Pré-QBR (Líderes):**
1. **Balanço do Ciclo** — Estado final de cada KR com `calculateKrState`, progresso e pace
2. **Análise de KPIs** — Revisão dos KPIs do ciclo
3. **Aprendizados** — Reflexão estruturada (continuar, parar, dívidas)
4. **Proposta de OKRs** — Sub-flow inline com 3 mini-etapas: Objetivo → Plano de KRs → Detalhamento (draft-only, via `QbrOkrProposalStep`)
5. **Resumo e Envio** — Revisão consolidada com snapshot imutável

**Etapas do Pré-QBR (C-Level):**
1. **Leitura Sistêmica** — Consolidação de scorecards e KPIs dos líderes
2. **Balanço do Quarter** — OKRs organizacionais com progresso e contribuições por time + Scorecard de entrega por time (health/contadores/tendência)
3. **Análise Estratégica** — Alinhamento, sinais e "o que não fazer"
4. **Validação de OKRs** — Calibração por time com flags (`too_conservative`, `gap`, etc.)
5. **Diretrizes** — Pauta obrigatória para a reunião
6. **Feedback do Rito** — Avaliação do processo via `MbrClosingStep`

**Etapas da Reunião QBR (v1.1):**
1. **Abertura** — Scorecard do quarter (4 metric cards: healthy/at_risk/off_track/sem submissão), pauta obrigatória do C-Level (diretrizes + vetos, com fallback se sessão C-Level não submetida), agenda visual da reunião (5 steps com indicador de progresso), KPIs em alerta
2. **Revisão de OKRs** — Gate de aprovação por time (`approved`, `discarded`, `defer`) com flags de calibração do C-Level e adendos do líder
3. **Decisões** — Registro com dono e prazo obrigatórios
4. **Compromissos** — Dependências cross-área formalizadas
5. **Encerramento** — Resumo de governança (contadores de aprovações/decisões/compromissos) + checklist dinâmico (itens habilitados condicionalmente: "OKRs revisados" requer todos os times revisados, "Decisões com dono" requer owner em todas as decisões)

**Etapas do Pós-QBR (v1.1):**
1. **Promoção de OKRs** — Seleção de OKRs aprovados para ativação, com flags de calibração do C-Level, campo de ajuste inline (`adjustmentNotes`) para OKRs aprovados "com ajuste", e indicador de dependências cross-área
2. **Decisões Complementares** — Registro adicional de decisões
3. **Compromissos Cross-Área** — Formalização com `fromTeamId`, `toTeamId` e prazo
4. **Cadência de Follow-Up** — Configuração de MBR e datas de acompanhamento
5. **Ata Executiva** — Resumo automático (OKRs promovidos por time, decisões com dono/prazo, compromissos cross-área, times sem promoção) + campo de texto para ata narrativa + checklist de governança

**Edge Functions de Resumo:**
- `qbr-pre-summary` — 3 agentes IA (analista-kpis, facilitador-decisoes, revisor-comunicacao)
- `qbr-meeting-summary` — Mesmo padrão multi-agente
- `qbr-post-summary` — Mesmo padrão, com idempotência via `summary_sent_at`

**Integração com MBR:**
- Step `MbrQbrFollowUpStep` no wizard MBR para acompanhamento de decisões e compromissos pendentes do QBR
- Tipos `qbr-followup` adicionados ao `MbrStep` e `QbrFollowUpItem[]` ao `MbrDraftData`

**Localização:** `src/modules/okrs/components/wizards/` e `src/modules/okrs/pages/`

#### QBR Executive Report (v1.1)

Relatório executivo consolidado do trimestre, acessível a **todos os usuários da BU** (sem restrição de admin).

| Componente | Rota | Propósito |
|------------|------|-----------|
| `QbrExecutiveReportPage` | `/okrs/executive/qbr-report?cycle=<id>` | Relatório completo com auto-load de cache |

**Estrutura do relatório:**
1. **Resumo Narrativo** — Gerado por IA (Gemini), narrativa estratégica do trimestre
2. **Evolução dos Indicadores** — KPI Evolution com atingimento e mini-histórico
3. **Ponto Crítico** — Tabela comparativa: MRR Churn × MRR Commit × Receita de Expansão × Orçamento Mkt & Vendas, com breakdown mensal, saldo líquido e custo por R$1 de MRR (`totalRevenue = mrrCommit + expansion`)
4. **Como Chegamos Aqui** — OKRs Organizacionais e contribuições de times

**Persistência:** `okr_wizard_sessions` com `wizard_type = 'qbr-executive-report'` — snapshot imutável em `reflection_data` (padrão wizard-snapshot-persistence).

**Auto-load:** Ao acessar a rota com `?cycle=<id>`, carrega cache automaticamente. Botão "Regenerar" disponível para nova geração.

**Localização:** `src/modules/okrs/components/qbr-report/` e `src/modules/okrs/hooks/useQbrExecutiveReport.ts`

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

#### Collaborator Check-in — Filtro de Iniciativas do Step

O step `Iniciativas` (`CollaboratorInitiativesStep`) **não** depende transitivamente do filtro de KRs acima. A lista é centrada no colaborador e busca iniciativas no ciclo trimestral ativo onde o usuário é:

1. ✅ **Owner** (`owner_user_id = effectiveUserId`), **OU**
2. ✅ **Contributor** (`contributors` contém `effectiveUserId`).

Os KRs exibidos como agrupadores são **derivados** das iniciativas retornadas (via join `okr_team_key_results!inner → okr_team_objectives!inner`, filtrando `cycle_id` e excluindo `cancelled_at` / `deleted_at`). Isso evita que iniciativas do colaborador sumam quando o KR não está no resultado de `useUserKrsForWizard` (ex.: usuário é apenas contribuidor da iniciativa, sem ownership no KR).

**Edição inline:** restrita ao owner (`init.owner_user_id === effectiveUserId`). Contributors visualizam mas não editam — coerente com RLS (`okrs.initiative.read:team_tree` cobre leitura; mutações continuam exigindo ownership).

**Query key canônica:** `queryKeys.okrs.initiativesForCollaborator(buId, cycleId, effectiveUserId)`.

**Componente:** `src/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep.tsx`.

### 4.8.1 Framework Unificado de Wizards (v3.26.0)

**Status:** ATIVO — Ondas 1, 2 e 3 em produção.

A padronização estrutural dos ritos do Hub consolida MBR, QBR e Check-ins sob um framework único, agnóstico de `wizardType`, com versionamento por sessão. O objetivo é separar **estrutura canônica** (steps, gates, regras de visibilidade, completion) de **conteúdo de step** (componentes ricos legados preservados).

#### Princípios canônicos

1. **SSOT estrutural por persona:** o mapa `STRUCTURE_VERSION_BY_WIZARD_TYPE` (`src/modules/okrs/components/wizards/shared/framework/config/structureVersions.ts`) define a versão a ser gravada em **novas sessões**. Sessões antigas preservam a versão original via coluna `okr_wizard_sessions.structure_version`.
2. **Imutabilidade de sessão:** uma vez criada, a `structure_version` da sessão **nunca muda**. Garante reprodutibilidade do snapshot e renderização determinística no histórico.
3. **Dispatcher transparente:** ao abrir um rito, o dispatcher seleciona o renderer correto:
   - `v1` → `SnapshotReportView` (renderer legado, somente leitura para sessões concluídas, ou shells legados específicos por wizard).
   - `v2+` → Framework genérico, montando steps por `STEP_DEFINITIONS[wizardType]@vN`.
4. **Componentes do framework são 100% agnósticos** — proibido `if (wizardType === ...)` em `framework/components/`. Toda divergência por rito é resolvida via configs (`stepDefinitions`, `stepCompletionRules`, `stepVisibilityRules`, `stepContentAdapters`, `RITUAL_STEP_LABELS`).
5. **Decisões inline ubíquas:** `_InlineDecisionsSlot` + `useDecisionsAggregator` permitem registrar decisões em qualquer step intermediário, agrupadas por `sourceStep` no `DecisionsStep` consolidado.
6. **Governança TCR:** flips de versão de ritos ativos só ocorrem em **Q-end** (encerramento de trimestre). Nunca trocar estrutura no meio de um ciclo vigente.

#### Estado atual das ondas

| Onda | Personas (`wizard_type`) | Versão estrutural | Status |
|------|--------------------------|-------------------|--------|
| **Onda 1** | `collaborator`, `leader-prep` | `v2` | ✅ ATIVA |
| **Onda 2** | `team-checkin`, `mbr-pre`, `qbr-pre` | `v3` | ✅ ATIVA |
| **Onda 3** | `mbr`, `qbr-meeting`, `qbr-post` | `v4` | ✅ ATIVA (Q-end flip executado) |
| Não impactados | `clevel-checkin`, `team-okr-creation`, `team-kr-creation`, `qbr-pre-clevel` | `v1` | Mantidos por escopo |
| Históricos / descontinuados | `managers-checkin`, `mbr-first`, `mbr-pre-first` | `v1` | Preservados para histórico |

#### Steps canônicos por rito (estrutura ativa)

| Rito | Versão | Steps (ordem) |
|------|--------|---------------|
| `mbr` | v4 | opening-executive → kpi-gate → teams-overview → team-analysis → org-okrs → strategic-projects → decisions → closing |
| `qbr-meeting` | v4 | opening-executive → okr-approval → decisions → closing |
| `qbr-post` | v4 | okr-promotion → decisions-adjustments → commitments-followup → closing |
| `team-checkin` | v3 | (definido em `STEP_DEFINITIONS.teamCheckinV3`) |
| `mbr-pre` / `qbr-pre` | v3 | (definido em `STEP_DEFINITIONS.*V3`) |
| `collaborator` / `leader-prep` | v2 | (definido em `STEP_DEFINITIONS.*V2`) |

> 📌 Labels exibidos seguem `RITUAL_STEP_LABELS` (`src/modules/okrs/constants/ritualLabels.ts`) — SSOT compartilhado por dispatcher, breadcrumbs e snapshot.

#### Arquivos centrais

| Arquivo | Responsabilidade |
|---------|------------------|
| `framework/config/structureVersions.ts` | Mapa persona → versão ativa + helper `getCurrentStructureVersion` |
| `framework/config/stepDefinitions.ts` | Definição canônica dos steps por `wizardType@vN` |
| `framework/config/stepCompletionRules.ts` | Gates de completude (ex: `allAtRiskKpisAddressed`, `allActiveTeamsAnalyzed`) |
| `framework/config/stepVisibilityRules.ts` | Regras de visibilidade condicional (carry-over, cross-area, projects-module, qbr-completed) |
| `framework/hooks/useDecisionsAggregator.ts` | Agrega decisões inline de todos os steps por `sourceStep` |
| `framework/components/_InlineDecisionsSlot.tsx` | Slot reutilizável para registro inline de decisões |
| `pages/SnapshotReportView.tsx` | Renderer legado para sessões `v1` concluídas |
| `constants/ritualLabels.ts` | `RITUAL_STEP_LABELS` SSOT |

#### Persistência

- **Coluna:** `okr_wizard_sessions.structure_version` (texto, gravado na criação).
- **Índice composto:** suporta queries de histórico por `(wizard_type, structure_version)`.
- **Política:** valor é `getCurrentStructureVersion(wizardType)` no momento da criação. Após gravação, **somente leitura**.

#### Cobertura de testes

**186 testes verdes** em 9 suítes:
- `structureVersions.test.ts` — mapa + helper
- `stepDefinitions.test.ts` — 45 cenários estruturais
- `stepCompletionRules.test.ts` — 57 cenários de gates
- `stepVisibilityRules.test.ts` — 23 cenários de visibilidade
- `stepContentAdapters.test.ts`, `completionEvaluator.test.ts`, `visibilityEvaluator.test.ts`, `useDecisionsAggregator.test.ts`
- `ritualLabels.test.ts` — cobertura SSOT de todos os stepIds ativos

#### Flip de versão (governança Q-end)

Procedimento documentado em `.lovable/onda-3-activation.md`. Resumo:
1. Validar pré-requisitos (sessões ativas concluídas, testes verdes, definições prontas).
2. Editar **apenas** `STRUCTURE_VERSION_BY_WIZARD_TYPE` (3 valores no caso da Onda 3).
3. Rodar suite completa + build + lint.
4. Smoke manual nas rotas dos ritos ativados + `/rituals/history` (validar fallback v1).
5. Publicar e monitorar `app_error_logs` por 24h.
6. Rollback é determinístico: reverter os mesmos 3 valores. Sessões `v4` criadas antes do rollback continuam acessíveis via dispatcher.

#### Memórias canônicas relacionadas

- `mem://architecture/wizards/structure-versioning-standard`
- `mem://features/rituals/inline-decision-ubiquity-standard`
- `mem://architecture/wizards/framework-component-editability`
- `mem://features/okrs/ritual-governance-master-standard`

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
- **Trilha de auditoria field-level** via triggers automáticos em `asset_inventory`, `asset_keyrings` e `asset_phone_lines` (ver §2.4)

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

### 4.12 Governança de Agentes de IA

**Documento canônico:** [`AI_AGENTS_PHILOSOPHY.md`](./AI_AGENTS_PHILOSOPHY.md) (v1.0.0)

Toda criação, reutilização ou modificação de agentes em `ai_agents` segue o canônico. Princípio central:

> **Reutilizar quando óbvio. Criar agente genérico quando necessário. Evitar agente específico por caso de uso.**

#### Matriz de decisão (consulta rápida)

| Situação | Decisão |
|----------|---------|
| Função idêntica a agente existente | Reutilizar sem ajuste |
| Função coberta, mas com contexto novo | Reutilizar + adicionar `ai_agent_instruction_sources` |
| Função nova e reaproveitável em múltiplos ritos | Criar agente **genérico por função cognitiva** |
| Função nova mas ainda não validada | Criar agente experimental com critério de consolidação |
| Diferença apenas de formato ou estrutura de saída | **Não criar** — parametrizar `output_format`/`output_schema` na invocação |

#### Antipadrões proibidos

1. Agente por **cadência** (`-weekly`, `-monthly`)
2. Agente por **rito específico** (`-mbr`, `-qbr`)
3. Agente por **persona** (`-leader`, `-collaborator`)
4. Agente **duplicando** função coberta
5. Agente por **formato de saída** (`-json`, `-text`)
6. Inchaço do `system_prompt` com contexto que pertence a `instruction_sources`

#### Camadas de prompt

- **`system_prompt`** → identidade permanente do agente (alteração = alto risco)
- **`ai_agent_instruction_sources`** → adaptações contextuais por caso/BU/persona (baixo risco, reversível)

#### Catálogo ativo (12 agentes, sincronizado em 2026-04-21)

`cultura`, `coach-okrs`, `validador-metodologico-okrs`, `analista-kpis`, `analista-estrategico`, `facilitador-decisoes`, `alinhamento-estrategico`, `revisor-comunicacao`, `onboarding-buddy`, `coach-produtividade`, `vic-persona`, `vic-greeting`. Todos `scope=global`, `integration_key=chatgpt`. Detalhes e distinções em [`AI_AGENTS_PHILOSOPHY.md`](./AI_AGENTS_PHILOSOPHY.md).

#### Entregáveis obrigatórios em PRs

PRs que criam/modificam agentes devem apresentar os **9 entregáveis** listados em `AI_AGENTS_PHILOSOPHY.md` §"Entregáveis obrigatórios" (função cognitiva, análise do catálogo, justificativa, posição na matriz, casos de uso, assinatura única, `system_prompt` inicial, estratégia de prompts, previsão de refinamento).

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

## 8. Edge Functions (25 funções ativas)

| Função | Descrição | Criticidade |
|--------|-----------|-------------|
| `request-magic-link` | Solicita OTP Code via Supabase Auth (nome histórico mantido) | 🔴 Crítica |
| `auth-email-hook` | Hook para customização de emails | 🔴 Crítica |
| `cron-dispatcher` | Dispatcher central para jobs agendados via pg_cron | 🔴 Crítica |
| `process-notification-outbox` | Processa fila de notificações (email, push) | 🔴 Crítica |
| `invoke-vic` | Invoca agentes Vic (IA) | 🟡 Alta |
| `health-check` | Health check do sistema | 🟡 Alta |
| `search-cities` | Autocomplete de cidades (Google Maps) | 🟢 Normal |
| `search-address` | Autocomplete de endereços (Google Places) | 🟢 Normal |
| `get-place-details` | Detalhes de endereço (Google Places) | 🟢 Normal |
| `culture-message` | Gera mensagem de cultura (IA) | 🟢 Normal |
| `process-agent-document` | Processa documentos para RAG | 🟢 Normal |
| `get-tcr` | Retorna TCR para Custom GPT | 🟢 Normal |
| `get-public-asset` | Retorna dados sanitizados de asset por `internal_code` (público, sem JWT) | 🟢 Normal |
| `okr-construction-review` | Avalia qualidade de OKRs antes do ciclo (IA) | 🟢 Normal |
| `okr-org-health-review` | Avalia saúde de OKRs organizacionais (IA) | 🟢 Normal |
| `evaluate-notification-health` | Avalia saúde do sistema de notificações | 🟢 Normal |
| `send-partner-invite` | Envia convite para parceiros externos | 🟢 Normal |
| `collaborator-checkin-summary` | Resumo de check-in do colaborador (IA) | 🟢 Normal |
| `team-checkin-summary` | Resumo de check-in do time (IA) | 🟢 Normal |
| `clevel-checkin-summary` | Resumo de check-in C-Level (IA) | 🟢 Normal |
| `mbr-summary` | Resumo do MBR (3 agentes IA) | 🟢 Normal |
| `qbr-pre-summary` | Resumo do Pré-QBR (3 agentes IA) | 🟢 Normal |
| `qbr-meeting-summary` | Resumo da Reunião QBR (3 agentes IA) | 🟢 Normal |
| `qbr-post-summary` | Resumo Pós-QBR com ata executiva (3 agentes IA) | 🟢 Normal |
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
| **Versão do TCR** | 3.13.0 |
| **Data da última atualização** | 2026-03-20 |
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

> Histórico completo em [`changelog/CHANGELOG.md`](./changelog/CHANGELOG.md). Política de retenção em [`DOCS_RETENTION_POLICY.md`](./DOCS_RETENTION_POLICY.md).
>
> Esta seção mantém apenas as **5 entradas mais recentes**. Entradas mais antigas são arquivadas trimestralmente em `changelog/CHANGELOG_<ano>Q<n>.md`.

### v3.31.0 (2026-05-16) — Assessments: Categorias e Subcategorias
- **Catálogo BU-scoped** seguindo o padrão de `ticket_categories`/`ticket_subcategories` (sem `scope` e sem `default_initial_message`):
  - Tabelas: `assessment_categories` e `assessment_subcategories` (status via enum `catalog_status`, soft delete via `deleted_at`).
  - Vínculo opcional em `assessments`: colunas `category_id` e `subcategory_id` (nullable, `ON DELETE SET NULL`).
  - Triggers `assessment_subcategory_validate_bu` e `assessment_validate_category_subcategory` garantem coerência de BU e de hierarquia.
  - Limites de nome (1..120) via **validation triggers** (sem CHECK constraints).
- **RBAC**: nova key `assessments.category.manage:bu` em **Administrador BU v2** e **Avaliações: Admin v2**.
- **Frontend**: `useAssessmentCategoriesData`, `AssessmentCategorySelect`/`SubcategorySelect`, tab "Categorias" em `/assessments`, integração nos dialogs "Nova prova" e "Editar prova".

### v3.30.1 (2026-05-04) — Remoção do MBR v2
- **MBR v2 removido por completo**: apagados arquivos do módulo, removidas entradas em rotas/labels/types/wizards, rota `/rituals/mbr-v2` redireciona para `/rituals/mbr`.
- Migration: `'mbr-v2'` removido da CHECK constraint `okr_wizard_sessions_wizard_type_check` e da função `get_public_ritual_evaluation_form`. Drafts pendentes deletados.
- MBR v1 (`/rituals/mbr`) e Pré-MBR permanecem intactos.

### v3.30.0 (2026-05-04) — Pré-MBR Hardening
- **KPI Gate ancorado ao mês de referência**: `classifyKpiGateBucketsFromMonthlySnapshots()` usa `MonthlyKpiSnapshotForGate[]`; `MbrPreKpiGateStep` migrado para `useMbrPreTeamKpisMonthly(teamId, referenceMonth)`. Elimina contaminação por valores de meses futuros.
- **Drafts resilientes**: `safeProjectJustifications` com fallback `?? {}` em `MbrPreProjectsStep`/`MbrPrePage`. Elimina `TypeError` em drafts antigos.
- Novo doc canônico `PRE_CHECKLIST.md`; `DEVELOPMENT_STANDARDS.md` v1.31.0.

### v3.13.0 (2026-03-20) — Asset Audit History v1.0
- Histórico imutável de alterações em assets via triggers de auditoria + timeline UI.

### v3.12.0 (2026-03-20) — Ticket Notification Contextualisation v1.0
- Metadata de notificações de tickets agora inclui `ticket_title`, `ticket_type`, `category_name`, `subcategory_name`, `actor_name`, `old_status`/`new_status`, `bu_name`. Bodies pt-BR com categoria/subcategoria e ator da ação.

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
