
# Plano — Internal Directory (API + UI administrativa)

## Decisões confirmadas pelo usuário

1. **Slugs:** adicionar coluna `slug` em `bu_units`, `areas`, `teams` (com backfill + trigger).
2. **UI `/internal-directory`:** gate apenas para `super_admin` (via `AdminRoute` + `is_platform_admin`).
3. **Token (POC):** validar Bearer contra secret `INTERNAL_API_TOKEN`. A tabela `internal_api_tokens` fica modelada (vazia) para o próximo ciclo.

**Convenção de nomes (instrução do usuário):** nada de "Next" em URLs/arquivos. Uso de `internal-api`, `internal_api_tokens`, módulo `internal-directory`, key `next_user_id` apenas no payload JSON (alias de `profiles.id`) como contrato externo.

---

## Reaproveitamento do schema existente (não duplicar)

| Prompt sugeria criar | Já existe | Uso |
|---|---|---|
| `users` | `profiles` | `display_name`, `email`/`work_email`, `employment_status`, `photo_url`, soft delete |
| `business_units` | `bu_units` | `name`, `cnpj`, `logo_url`, `primary_color`, `allowed_email_domains` |
| `areas` | `areas` | BU-scoped |
| `teams` | `teams` | BU-scoped + hierarquia + `area_id` |
| `user_business_units` | `bu_user_memberships` | `is_default` = `is_primary`, `role_in_bu`, `job_title_id` |
| `role_title` | `job_titles` (+ `bu_user_memberships.job_title_id`) | cargos reutilizáveis |
| view cross-BU | `v_bu_active_profiles` | já une primária + memberships |

Criar tabelas paralelas quebraria BU Isolation, RLS, Magic Link e Identity Convention. Mantemos as canônicas e expomos via API com o shape do contrato.

---

## 1. Migration única

**1.1. Slugs** (idempotente):
- `ALTER TABLE bu_units ADD COLUMN slug text` + UNIQUE (`slug`).
- `ALTER TABLE areas ADD COLUMN slug text` + UNIQUE (`bu_id, slug`).
- `ALTER TABLE teams ADD COLUMN slug text` + UNIQUE (`bu_id, slug`).
- Function `public.slugify(text)` (lower, regex, trim).
- Backfill: `UPDATE ... SET slug = slugify(name) WHERE slug IS NULL` resolvendo colisões com sufixo numérico em PL/pgSQL DO block.
- Trigger `BEFORE INSERT OR UPDATE` em cada tabela: se `NEW.slug IS NULL` → derivar de `NEW.name`.
- `ALTER TABLE ... ALTER COLUMN slug SET NOT NULL` após backfill.

**1.2. `internal_api_tokens`** (modelada, ainda não usada):

```sql
CREATE TABLE public.internal_api_tokens (
  id uuid PK default gen_random_uuid(),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,         -- sha256 do plaintext
  allowed_system text NOT NULL,            -- ex: 'flow'
  status text NOT NULL DEFAULT 'active',
  scopes text[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT ALL ON public.internal_api_tokens TO service_role;
GRANT SELECT ON public.internal_api_tokens TO authenticated;  -- via policy só super_admin
ALTER TABLE public.internal_api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY internal_api_tokens_select_admin ON public.internal_api_tokens
  FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));
```

Validation trigger (não CHECK):
- `status IN ('active','inactive','revoked','expired')`.
- `expires_at IS NULL OR expires_at > created_at`.

Trigger `update_internal_api_tokens_updated_at` reutilizando `update_updated_at_column()`.

> Sem `verify_internal_api_token` / `generate_internal_api_token` agora — fica para o ciclo de produção do token.

---

## 2. Edge Function `internal-api`

`supabase/functions/internal-api/index.ts` — uma função com roteador interno por `url.pathname`.

`supabase/config.toml`:
```toml
[functions.internal-api]
verify_jwt = false
```

**Middleware:**
1. `OPTIONS` → CORS preflight (`npm:@supabase/supabase-js@2/cors`).
2. `Authorization: Bearer <token>` → comparar com `Deno.env.get('INTERNAL_API_TOKEN')` usando comparação constant-time.
3. Falha → 401 `{ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing internal API token.' } }`.
4. Rota `/health` ignora auth.
5. Cliente Supabase com **service role** dentro da função (chamador já autenticado como sistema).
6. Sempre filtra `deleted_at IS NULL` e `employment_status <> 'terminated'`.
7. Resposta de erro padronizada (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_ERROR`).

**Rotas:**

| Método + Path | Query | Fonte |
|---|---|---|
| `GET /internal-api/health` | — | constante |
| `GET /internal-api/users` | `business_unit_slug, area_slug, team_slug, status, search, include_inactive, page, limit` | `profiles` + `bu_user_memberships` + `bu_units` + `areas` + `teams` + `job_titles` |
| `GET /internal-api/users/:id` | — | idem agregado por user |
| `GET /internal-api/users/by-email` | `email` (required) | match em `profiles.email` OR `profiles.work_email` |
| `GET /internal-api/business-units` | `status, search` | `bu_units` |
| `GET /internal-api/areas` | `business_unit_slug, status, search` | `areas` JOIN `bu_units` |
| `GET /internal-api/teams` | `business_unit_slug, area_slug, status, search` | `teams` JOIN `areas` + `bu_units` |

**Mapeamento de campos para o contrato:**
- `next_user_id` = `profiles.id`
- `full_name` = `profiles.display_name`
- `preferred_name` = `profiles.first_name`
- `email` = COALESCE(`profiles.email`, `profiles.work_email`)
- `avatar_url` = `profiles.photo_url`
- `business_units[].is_primary` = `bu_user_memberships.is_default`
- `business_units[].role_title` = `job_titles.name`
- `business_units[].status` = derivado de `bu_user_memberships.deleted_at`
- `business_units[].area` / `team` = via `teams.area_id` e `profiles.team_id` (vínculo primário) — fora do vínculo primário, usar última associação conhecida ou null se não houver

**Paginação:** `page` default 1, `limit` default 20, máx 100. Total via `count: 'exact'` na primeira query.

---

## 3. Front-end — módulo `Internal Directory`

```
src/modules/internal-directory/
  pages/InternalDirectoryPage.tsx
  components/
    DirectoryOverviewCards.tsx
    DirectoryUsersTab.tsx
    DirectoryUserDetailDialog.tsx
    DirectoryBusTab.tsx
    DirectoryAreasTeamsTab.tsx
    DirectoryApiDocsTab.tsx
  hooks/
    useDirectoryOverview.ts
    useDirectoryUsers.ts
    useDirectoryBus.ts
    useDirectoryAreasTeams.ts
  index.ts
src/lib/queryKeys/internalDirectory.ts
```

- Rota: `/internal-directory` em `src/routes/core.routes.tsx` envolta em `<AdminRoute>`.
- Item de menu: adicionar em `HubGlobalSidebar` / `HubGlobalMobileSidebar` na seção admin, visível só para super_admin (`useAuth().isAdmin`).
- **Lê do Supabase direto** (RLS já permite a super_admin) — não bate na edge function (essa é p/ sistemas externos).
- Filtros (`bu`, `area`, `team`, `status`, `search`) via `src/shared/url/` (URL state).
- shadcn/ui: Tabs, Table, Card, Dialog, Badge, Input.
- `OptimizedAvatar`, `EntityNamesCell` (para múltiplas BUs).
- `React.memo` em linhas/cards. Loading/empty/error states. Responsivo (table → cards no mobile).
- Sem `select('*')`; colunas explícitas em cada query.

**Tabs:**
1. **Visão geral** — 6 cards: total usuários, ativos, BUs ativas, áreas, times, usuários multi-BU. Counts via `count: 'exact', head: true`.
2. **Usuários** — tabela + filtros + busca; clique abre Dialog de detalhe.
3. **Business Units** — lista + contagem de membros (via `bu_user_memberships`).
4. **Áreas e Times** — árvore BU → Área → Time → Pessoas (accordion + lazy).
5. **API interna** — documentação estática (endpoints + exemplos `curl`), link para Cloud → Secrets explicando que o token está em `INTERNAL_API_TOKEN`.

---

## 4. Seeds (insert tool, dev)

Antes de inserir, ler IDs reais via `read_query` para idempotência.

1. BU `Jetimob` (já existe) → setar `slug='jetimob'`, garantir `allowed_email_domains` contém `jetimob.com`. Criar `Jet Experience` (slug `jet-experience`) e `Next` (slug `next`) se não existirem.
2. Áreas Jetimob (7) com slugs do prompt.
3. Times Jetimob (10) com `area_id` correto.
4. `job_titles` faltantes: CEO, Líder de CS, Coordenadora de G&G, Product Manager, Coordenador de Marketing, Coordenador Comercial, Advisor CS, Advisor de Eventos.
5. `profiles` (7) sem `user_id` (padrão "pré-cadastrado"), `employment_status='active'`, `bu_id` primária = Jetimob, `team_id` correspondente, `job_title_id` correspondente.
6. `bu_user_memberships` (8) — incluindo o Multi-BU em Jetimob (`is_default=true`) e Jet Experience (`is_default=false`).

---

## 5. Documentação canônica

- `docs/canonical/modules/internal-directory.md` (template dos outros módulos): tabelas reutilizadas, endpoints da edge, gate de UI, mapeamento de campos.
- Adicionar linha em `docs/canonical/core/INDEX.md`.
- Atualizar `docs/canonical/modules/bu.md` mencionando coluna `slug`.
- Memory: `mem://features/internal-directory/internal-directory-master`.

---

## 6. Secret a configurar

`INTERNAL_API_TOKEN` (runtime secret via Lovable Cloud) — vou pedir via `add_secret` no momento da implementação, **depois** que migration e edge function estiverem prontas.

---

## Ordem de execução

1. Migration (slugs + `internal_api_tokens` + triggers).
2. Seeds (insert tool).
3. Edge function `internal-api` + `config.toml`.
4. `add_secret` `INTERNAL_API_TOKEN`.
5. Front-end (`src/modules/internal-directory/*`, query keys, rota, item de menu).
6. Documentação canônica + memory.
7. QA: `curl` em cada endpoint com e sem token; abrir `/internal-directory` validando 6 cards, filtros, detalhe multi-BU.

---

## Fora de escopo

- Implementar Flow ou qualquer consumidor real.
- Ativar a tabela `internal_api_tokens` (criar/revogar via UI) — fica para ciclo seguinte.
- Renomear identificadores existentes ("Hub"/"Next") em código.
