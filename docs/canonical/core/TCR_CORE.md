# TCR Core — Hub da Jet

**Versão:** 1.0.0 · **Atualizado:** 2026-05-16
**Função:** regras arquiteturais transversais (não-módulo).
**Carregar quando:** mudança multi-módulo OU primeira tarefa não-trivial da sessão.
**Substitui:** §1, §4, §5, §10 do `TECHNICAL_CONTEXT_REGISTRY.md`.

> Para mudanças dentro de 1 módulo, ler `modules/<x>.md` em vez deste arquivo.

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind + shadcn/ui |
| Estado | TanStack Query |
| Roteamento | React Router DOM v6 |
| Backend | Supabase (Lovable Cloud) |
| Banco | PostgreSQL |
| Auth | Supabase Auth (Magic Link) |
| Storage | Supabase Storage |
| Serverless | Supabase Edge Functions (Deno) |
| IA | Lovable AI Gateway (Gemini / OpenAI) |

---

## 2. Auth (Magic Link)

- Login via email; domínio validado contra BU ativa (`bu_units.allowed_email_domains` ou `partner_contacts` global).
- Magic Link com `token_hash` no URL (não fragment) — compatível com SendGrid click tracking.
- `handle_new_user()` cria profile automaticamente.
- **Usuários internos** precisam de profile pré-cadastrado.

### 2.1 URL Detonation Mitigation

Domínios em `URL_DETONATION_DOMAINS` (Mimecast, Proofpoint, Defender ATP) recebem callback `/auth/confirm` (clique manual) em vez de `/auth/callback` (auto-verify) — evita scanners consumirem o token. Adicionar domínio: editar `supabase/functions/request-magic-link/index.ts`.

### 2.2 Rotas públicas

SSOT: `src/routes/public.routes.tsx` exporta `publicRoutes` + `PUBLIC_PATHS`. `App.tsx` consome — nunca registrar rota pública direto no `App.tsx`.

### 2.3 Normalização de `next`

`src/lib/authRedirect.ts` → `normalizeAuthNext(raw)` desempacota `next` aninhado, rejeita URLs absolutas.

Master: `mem://features/auth/url-detonation-mitigation`, `mem://auth/identity-rbac-master`.

---

## 3. Multi-BU

- Plataforma multi-tenant; cada BU isola usuários, OKRs, KPIs, etc.
- Usuário pode pertencer a múltiplas BUs (`bu_user_memberships`), com 1 default.
- Isolamento garantido por: RLS + filtro frontend `.eq('bu_id', currentBuId)` + trigger `enforce_bu_scope_trigger`.

### 3.1 Conceito de Áreas (v2.33)

```
BU → Área (estratégico, sem OKRs próprios) → Time → Subtime → Pessoas
```

Áreas têm apenas líder/co-líder, não possuem OKRs nem backlog.

### 3.2 BU Scope Enforcement

| Função | Uso |
|---|---|
| `current_bu_id()` | Lê header `x-current-bu-id` — nunca NULL (lança `NO_BU_CONTEXT`) |
| `is_current_bu(bu_id)` | Helper para RLS |
| `assert_bu_scope(bu_id)` | Valida payload (`MISSING_BU_ID`, `BU_SCOPE_VIOLATION`) |

Trigger `enforce_bu_scope_trigger` em BEFORE INSERT/UPDATE de tabelas operacionais (OKRs, Teams, Assets, Tickets, KPIs).

RLS padrão: `user_has_bu_access(auth.uid(), bu_id) AND is_current_bu(bu_id)`.

Auditoria: `scripts/audit-bu-scope.ts` + `v_bu_id_null_report`.

Master: `mem://standards/bu-isolation-master`.

---

## 4. Supabase Clients

| Cliente | Arquivo | Uso | autoRefreshToken |
|---|---|---|---|
| Global Singleton | `globalClient.ts` | Auth, bootstrap, pré-BU, Realtime | ✅ `true` (único) |
| BU-Scoped Singleton | `buScopedClient.ts` via `useBuScopedSupabase()` | TODOS os dados operacionais | ❌ `false` |
| Auto-generated | `client.ts` | ❌ NUNCA usar | — |

⚠️ Apenas `globalClient` renova tokens; `buScopedClient` escuta `TOKEN_REFRESHED`. Múltiplos renovadores → tempestade 429 → perda de sessão.

`useBuScopedSupabase()` injeta `x-current-bu-id` automaticamente.

**Regra inquebrável:** `useBuScopedSupabase()` não basta — toda query DEVE filtrar `.eq('bu_id', currentBuId)` explicitamente e detail queries DEVEM validar `data.bu_id !== currentBuId` pós-fetch.

Master: `mem://architecture/auth/supabase-client-sync-standard`.

---

## 5. Identity & RBAC

### 5.1 Identity

`useIdentity()` retorna:
- `userId` / `profileId` → usuário **visualizado** (com impersonation aplicado, para leitura)
- `realUserId` / `realProfileId` → usuário **real** (para mutations, evita RLS 42501)

⚠️ Mutations sob impersonation DEVEM usar `realProfileId`.

### 5.2 Roles globais

- `super_admin` / `admin` → wildcard `['*']` em todas as BUs.

### 5.3 Roles por BU

- `admin` (admin local da BU), `collaborator` (acesso via grupos).

### 5.4 Funções SQL principais

| Função | Uso |
|---|---|
| `is_platform_admin(user_id)` | super_admin OU admin global |
| `is_bu_admin(user_id, bu_id)` | Admin local da BU |
| `user_has_bu_access(user_id, bu_id)` | Membership na BU |
| `has_role(user_id, role)` | Role específica |
| `get_my_permissions(bu_id)` | Array de permission keys |
| `my_profile_id()` | Atalho RLS para profile do usuário atual |

### 5.5 Hierarquia de times

| Função | Regra |
|---|---|
| `user_can_manage_team(user_id, team_id)` | Líder DIRETO OU admin/super_admin |
| `get_manageable_teams(user_id, bu_id)` | Lista de IDs gerenciáveis |

Líder pode gerenciar apenas próprio time + filhos diretos. **NÃO** pode gerenciar pai/irmãos/outros ramos.

### 5.6 Impersonação

- Apenas `super_admin` ativa.
- Visual (leitura) — mutations seguem com `realProfileId`.
- Funções: `get_user_role_for_impersonation()`, `get_leader_teams_for_impersonation()`.

Master: `mem://auth/identity-rbac-master` + `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md` + `RBAC_TEMPLATES_V3.md`.

---

## 6. Hooks & Componentes Canônicos

### 6.1 Hooks

| Domínio | Hook |
|---|---|
| Identidade | `useIdentity()`, `useProfileId()` |
| Permissões | `usePermissions()` |
| Cliente BU | `useBuScopedSupabase()`, `useOptionalBuScopedSupabase()` |
| BU context | `useBu()` |
| Impersonação | `useImpersonation()`, `useOptionalImpersonation()` |
| Listagem usuários | `useBuUsersDirectory()`, `useBuUserSelectOptions()` |
| Radix focus | `useRadixFocusRecovery()` (UMA vez no App.tsx) |
| Wizards KPIs | `useKpisForWizard()` |
| Dialog reset | `useDialogFormReset()` |
| Auto-area | `useTeamArea()` |

### 6.2 Componentes

| Domínio | Componente | Regra |
|---|---|---|
| User select | `BuUserSelect` / `BuUserMultiSelect` | Opcional → `allowNone` |
| Team select | `TeamSelect` | Opcional → `includeNone noneLabel="..."` |
| Área select | `AreaSelect` | Mesma regra; reativo → `includeNone={!isRequired}` |
| Unidade | `UnitSelect` | Categorizado |
| Avatar | `OptimizedAvatar` | Lazy load + fallback |
| Permissões | `PermissionGuard`, `RequirePermission` | — |
| Overflow lists | `EntityNamesCell` | **SSOT obrigatório** — nunca tooltip ad-hoc |

---

## 7. Links e URLs

### 7.1 Rotas operacionais — sem `buId`

`/`, `/okrs`, `/kpis`, `/teams`, `/tickets`, `/assets/*`, `/settings/*` — BU ativa vem do contexto.

### 7.2 Links compartilháveis — `/go/:entity/:id`

**SSOT:** `src/lib/shareableLinks.ts` → `getShareableUrl(entity, id)`.

Entidades suportadas: `asset`, `team`, `user`, `ticket`, `okr_org_objective`, `okr_team_objective`, `okr_org_kr`, `okr_team_kr`, `keyring`, `gift`, `kpi`.

**Uso obrigatório em:** GlobalSearch, notificações, emails, menções, "Copiar link", QR codes novos, automações.

`/go/:entity/:id` → `ResolveContextPage.tsx`: busca `bu_id`, valida acesso, troca BU se necessário, redireciona.

### 7.3 QR Codes legados

`/assets/:code` (4 dígitos) — **NUNCA quebrar** (etiquetas impressas). Logado → resolve para `/go/asset/:uuid`. Não logado → `/p/assets/:code` (público).

SQL: `normalize_asset_code()`, `resolve_asset_by_code_for_bu()`, `resolve_asset_by_code_global()`.

### 7.4 BU Context

SSOT: `BuContext` (`src/contexts/BuContext.tsx`). `setCurrentBuId(buId)` limpa cache do TanStack Query. Persistência em `localStorage['hub.currentBuId']`. Guard: `EnsureBuSelected`.

---

## 8. Convenções de Código

### 8.1 Estrutura

```
src/
├─ modules/<module>/  → pages, hooks, components, types, utils
├─ integrations/supabase/  → globalClient, buScopedClient, types.ts
├─ contexts/  → BuContext, etc.
├─ lib/queryKeys/  → SSOT de query keys (NUNCA inline)
└─ routes/  → public.routes.tsx + agrupadores
```

### 8.2 Regras inquebráveis (espelham `mem://index.md` Core)

1. ✅ PRE-BU vs POST-BU → cliente correto
2. ❌ `auth.uid()` vs colunas de domínio → use `my_profile_id()`
3. ✅ Todo dado operacional é BU-scoped (RLS + trigger + filtro frontend)
4. ❌ `select('*')` proibido — listar colunas
5. ✅ Query keys SOMENTE via `src/lib/queryKeys/*.ts`
6. ✅ RBAC via permission keys — nunca hardcode de role
7. ✅ Filtros/busca/paginação → URL state
8. ✅ Edge Functions validam JWT + BU + correlation-id
9. ✅ Navegação SPA usa `<Link>` (nunca `onClick + navigate` para rotas)
10. ❌ `CHECK` constraints proibidas — usar Validation Triggers / ENUMs
11. ❌ `manualChunks` em `vite.config.ts` proibido — quebra TDZ em produção
12. ✅ `React.memo` mandatório em list/card components
13. ✅ Soft delete: filtrar `.is("deleted_at", null)` e `.is("cancelled_at", null)` — exceto `okr_initiatives` e `project_milestones` (só `deleted_at`)

---

## 9. Storage Buckets

| Bucket | Visibilidade | Uso |
|---|---|---|
| `avatars` | Público | Fotos de perfil |
| `bu-logos` | Público | Logos de BU |
| `asset-photos` | Privado | Fotos de itens de inventário |
| `ticket-attachments` | Privado | Anexos de tickets |
| `project-attachments` | Privado | Anexos de comentários de projetos |
| `ai-uploads` | Privado | Uploads para análise IA |

Acesso a buckets privados via signed URLs.

---

## 10. Eventos e Integrações

- **Webhooks de saída:** módulo `automations` (configuráveis por BU).
- **Webhooks de entrada:** edge functions específicas com validação de assinatura.
- **Realtime:** apenas onde necessário (NotificationCenter, ticket messages).
- **Edge Functions:** 25+ funções ativas (auth, AI, summaries, integrações). Padrão: factory + middleware + structured logs + correlation-id. Master: `mem://backend/edge-function-standard-v4`.

---

## 11. Débito Técnico Conhecido

Registrar em `docs/canonical/changelog/CHANGELOG.md` quando novo débito for descoberto. Itens críticos devem virar memória em `mem://`.

---

## 12. Referências cruzadas

- Router de docs: `docs/canonical/core/INDEX.md`
- Pré-checklist: `docs/canonical/PRE_CHECKLIST.md`
- Schema completo: `src/integrations/supabase/types.ts`
- Changelog histórico: `docs/canonical/changelog/CHANGELOG.md`
- TCR completo (legado, evitar): `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md`
