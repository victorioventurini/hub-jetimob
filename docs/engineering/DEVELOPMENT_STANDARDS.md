# Padrões de Desenvolvimento — Hub da Jet

**Versão:** 1.9.0  
**Última atualização:** 2026-01-15  
**Status:** Normativo (V2-only mode ativo) | RLS 100% V2 | Hooks Consolidados | **Testes Automatizados Ativos**
**Referência:** TCR v2.32.0

---

## Índice

- [A. Arquitetura e Contextos](#a-arquitetura-e-contextos)
- [B. Identidade (auth vs profiles)](#b-identidade-auth-vs-profiles)
- [C. Permissões (RBAC V2-only)](#c-permissões-rbac)
- [D. Queries, Performance e DX](#d-queries-performance-e-dx)
- [E. URL State](#e-url-state)
- [F. Edge Functions](#f-edge-functions)
- [G. Banco de Dados](#g-banco-de-dados)
- [H. Checklist de PR](#h-checklist-de-pr)
- [I. Anti-patterns (Proibidos)](#i-anti-patterns-proibidos)
- [J. User Directory Global](#j-user-directory-global)
- [K. Hooks e Barrel Files](#k-hooks-e-barrel-files)
- [L. Layout e Estados de Página](#l-layout-e-estados-de-página)
- [M. Limites de Código e Sustentabilidade](#m-limites-de-código-e-sustentabilidade)
- [N. Testes Automatizados](#n-testes-automatizados)

---

## A. Arquitetura e Contextos

### A.1 PRE-BU vs POST-BU

O Hub opera em dois contextos distintos baseados na seleção de BU:

| Contexto | Quando | Client Supabase | Exemplos |
|----------|--------|-----------------|----------|
| **PRE-BU** | Antes de `BuProvider` inicializar ou BU ser selecionada | `supabase` global ou `useOptionalBuClient()` | Auth, onboarding, bootstrap de BUs |
| **POST-BU** | Após BU ativa estar disponível | `useBuScopedSupabase()` obrigatório | Todos os módulos operacionais |

#### Regras PRE-BU

```typescript
// ✅ CORRETO: Usando cliente global para auth
import { supabase } from "@/integrations/supabase/client";
await supabase.auth.signInWithOtp({ email });

// ✅ CORRETO: Usando hook opcional com gating
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";

function MyPreBuComponent() {
  const { client, isReady, buId } = useOptionalBuClient();
  
  const { data } = useQuery({
    queryKey: ["my-data", buId],
    queryFn: async () => {
      if (!client || !buId) return null; // Gating
      return client.from("table").select("id, name, status"); // ✅ Campos explícitos
    },
    enabled: isReady && !!buId,
  });
}
```

#### Regras POST-BU

```typescript
// ✅ CORRETO: Módulos operacionais
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

function MyOperationalComponent() {
  const supabase = useBuScopedSupabase();
  // Todas as queries incluem x-current-bu-id automaticamente
}

// ❌ PROIBIDO: Cliente global em módulo operacional
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("tickets").select("*"); // BUG!
```

#### Exceções Autorizadas (Cliente Global)

| Arquivo/Contexto | Justificativa |
|------------------|---------------|
| `useAuth.tsx` | Operações de auth não têm BU |
| `useUserBus.ts`, `useExternalUser.ts` | Bootstrap antes do BuProvider |
| `NotificationCenter.tsx` | Realtime subscription global (ver regras abaixo) |
| `validateDomain.ts` | Validação pré-auth |

#### Regras para NotificationCenter (Realtime)

O `NotificationCenter` é exceção autorizada mas DEVE seguir regras rígidas:

```typescript
// ✅ CORRETO: Gating obrigatório antes de conectar realtime
const channel = useMemo(() => {
  if (!buId) return null; // ⚠️ Não conectar sem BU
  
  return supabase
    .channel(`notifications:${buId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
      // ⚠️ Ignorar payload sem bu_id
      if (!payload.new?.bu_id) return;
      
      // ⚠️ Ignorar payload de outra BU
      if (payload.new.bu_id !== buId) return;
      
      // Processar notificação
      handleNotification(payload.new);
    })
    .subscribe();
}, [buId]);

// ✅ Query de notifications também precisa de gating
const { data } = useQuery({
  queryKey: ["notifications", buId],
  queryFn: () => supabase.from("notifications").select("id, title, body, read_at, created_at"),
  enabled: !!buId, // ⚠️ Obrigatório
});
```

### A.2 BU Scope Enforcement

```
⚠️ REGRA INQUEBRÁVEL: Todo dado operacional é escopado por BU.
```

#### Funções SQL Obrigatórias

| Função | Uso |
|--------|-----|
| `current_bu_id()` | Retorna BU do contexto. NUNCA retorna NULL. |
| `is_current_bu(bu_id)` | Helper para RLS: verifica se bu_id = contexto |
| `assert_bu_scope(bu_id)` | Trigger: valida bu_id do payload |

#### Frontend: Helper para Inserts

```typescript
import { withBuId } from "@/hooks/useBuScope";

// ✅ CORRETO
await supabase.from("teams").insert(withBuId({ name: "Time" }, currentBuId));

// ❌ ERRADO: Insert sem bu_id explícito
await supabase.from("teams").insert({ name: "Time" }); // Falha no trigger!
```

---

## B. Identidade (auth vs profiles)

### B.1 Regra de Ouro

```
❌ NUNCA comparar auth.uid() diretamente com colunas de domínio.
✅ SEMPRE converter usando my_profile_id() ou funções canônicas.
```

### B.2 Dois Tipos de ID

| Identificador | Tabela | Uso |
|---------------|--------|-----|
| `user_id` (auth) | `auth.users.id` | Autenticação, sessão, roles globais |
| `profile_id` (domínio) | `profiles.id` | Ownership, liderança, atribuição |

### B.3 Funções Canônicas SQL

| Função | Descrição |
|--------|-----------|
| `my_profile_id()` | Retorna `profiles.id` do usuário logado |
| `my_profile_id_strict()` | Idem, mas lança exceção se não existir |
| `profile_id_from_user_id(uuid)` | Converte `auth.users.id` → `profiles.id` |
| `user_id_from_profile_id(uuid)` | Converte `profiles.id` → `auth.users.id` |

### B.4 Padrão em RLS Policies

```sql
-- ❌ ERRADO
owner_user_id = auth.uid()

-- ✅ CORRETO
owner_user_id = my_profile_id()
```

### B.5 Padrão no Frontend

```typescript
// Hook canônico para identidade (suporta impersonação)
import { useIdentity } from "@/hooks/useIdentity";

const { 
  userId,           // auth.users.id do usuário efetivo (impersonado ou real)
  profileId,        // profiles.id do usuário efetivo (impersonado ou real)
  realUserId,       // auth.users.id do usuário REAL (sempre o logado)
  realProfileId,    // profiles.id do usuário REAL (sempre o logado)
  isLoading 
} = useIdentity();

// ✅ CORRETO: Usar profileId para LEITURA (respeita impersonação)
const { data } = useQuery({
  queryKey: ["my-okrs", profileId],
  queryFn: () => supabase.from("okr_initiatives").select("*").eq("owner_user_id", profileId),
});

// ✅ CORRETO: Usar realProfileId para MUTATIONS (sempre o usuário real)
await supabase.from("okr_initiatives").insert({
  owner_user_id: realProfileId, // Sempre o usuário real para criação
  ...data,
});
```

### B.6 Impersonação e Identidade

```typescript
// ❌ ERRADO: Usar useAuth().user.id para dados de domínio
import { useAuth } from "@/hooks/useAuth";
const { user } = useAuth();
// user.id é auth.users.id, ignora impersonação

// ✅ CORRETO: Usar useIdentity() para tudo
import { useIdentity } from "@/hooks/useIdentity";
const { profileId, realProfileId } = useIdentity();
// profileId respeita impersonação, realProfileId é sempre o real
```

### B.7 Colunas de Domínio (armazenam profiles.id)

Todas estas colunas, apesar do nome `_user_id`, armazenam `profiles.id`:

| Coluna | Tabelas |
|--------|---------|
| `owner_user_id` | okr_*, kpi_metrics, tickets |
| `leader_user_id` | teams, squads |
| `current_user_id` | asset_inventory, asset_keyrings |
| `to_user_id`, `from_user_id` | asset_movements |
| `performed_by_user_id` | asset_*, ticket_messages |
| `authorized_by_user_id` | asset_movements |
| `created_by_user_id` | tickets |

> 📚 Ver: [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md)

---

## C. Permissões (RBAC)

### C.1 Regras Fundamentais

```
⚠️ PROIBIDO: Hardcode de roles no frontend.
✅ OBRIGATÓRIO: Usar usePermissions() + guards.
```

### C.2 Verificação de Permissões

```typescript
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { has, hasAny, hasAll, isWildcard, isLoading } = usePermissions();

  // Verificar permissão específica
  if (has("okrs.objective.create")) { /* ... */ }

  // Verificar se tem pelo menos uma
  if (hasAny(["okrs.objective.create", "okrs.kr.create"])) { /* ... */ }

  // Verificar se tem todas
  if (hasAll(["okrs.objective.create", "okrs.objective.update"])) { /* ... */ }

  // Admin/super_admin recebem wildcard ['*']
  if (isWildcard) { /* Acesso total */ }
}
```

### C.3 PermissionGuard

```typescript
import { PermissionGuard } from "@/components/guards/PermissionGuard";

<PermissionGuard require="okrs.objective.create" fallback={<AccessDenied />}>
  <CreateObjectiveButton />
</PermissionGuard>
```

### C.4 Templates Somáveis

Usuários recebem templates que somam permissões:

| Camada | Template | Descrição |
|--------|----------|-----------|
| Base | `collaborator_base` | Todo colaborador interno |
| Base | `external_contact_base` | Contatos externos |
| Admin | `bu_admin` | Acesso total na BU |
| Responsabilidade | `okrs_team_manager` | Gestão de OKRs do time |
| Responsabilidade | `inventory_manager` | Movimentação de inventário |

### C.5 Padrão para Permission Keys

O Hub usa o padrão:

```
<module>.<entity>.<action>:<scope>
```

#### Componentes

| Componente | Descrição | Exemplos |
|------------|-----------|----------|
| `module` | Módulo do sistema | `okrs`, `teams`, `tickets`, `assets` |
| `entity` | Entidade/recurso | `objective`, `team_kr`, `org_objective`, `squad` |
| `action` | Ação CRUD ou especial | `read`, `create`, `update`, `delete`, `manage`, `assign` |
| `scope` | Alcance da permissão | `bu`, `team`, `team_tree`, `self_or_owner` |

#### Scopes Suportados

| Scope | Significado |
|-------|-------------|
| `bu` | Acesso a todos da BU |
| `team` | Apenas do próprio time |
| `team_tree` | Time + sub-times |
| `self_or_owner` | Apenas recursos próprios (criador/owner) |

#### Exemplos Reais do Catálogo

```typescript
// OKRs
"okrs.org_objective.read:bu"           // Ver objetivos organizacionais da BU
"okrs.team_objective.create:team"      // Criar objetivo no próprio time
"okrs.team_kr.update:self_or_owner"    // Editar KR que é owner
"okrs.checkin.create:self_or_owner"    // Criar check-in próprio

// Teams
"teams.team.update:bu"                 // Editar times da BU
"teams.squad.update:bu"                // Editar squads da BU

// Tickets
"tickets.ticket.assign:bu"             // Atribuir tickets na BU
"tickets.ticket.update:self_or_owner"  // Editar ticket próprio
```

#### Verificação no Frontend

```typescript
// O hook has() faz match exato da key
if (has("okrs.team_objective.create:team")) {
  // Pode criar objetivo no próprio time
}

// Para verificar qualquer scope de uma ação:
if (hasAny([
  "okrs.team_objective.update:bu",
  "okrs.team_objective.update:team",
  "okrs.team_objective.update:self_or_owner"
])) {
  // Pode editar de alguma forma
}
```

> ⚠️ O escopo real é aplicado por RLS + funções como `user_can_manage_team()`. A permission key indica a intenção, RLS garante o enforcement.

### C.6 RLS: Usar has_permission() — 100% V2 Migrado

Todas as 79 tabelas do Hub agora usam RLS V2:

```sql
-- ✅ CORRETO V2: SELECT com membership check
CREATE POLICY "Members can view"
ON public.okr_initiatives FOR SELECT
USING (is_profile_bu_member(my_profile_id(), bu_id));

-- ✅ CORRETO V2: INSERT/UPDATE/DELETE com permission check
-- IMPORTANTE: Usar my_profile_id(), NÃO auth.uid()!
CREATE POLICY "Users with create permission"
ON public.okr_initiatives FOR INSERT
WITH CHECK (
  has_permission(my_profile_id(), bu_id, 'okrs.initiative.create:bu')
);

-- ❌ ERRADO (LEGADO - NÃO USAR MAIS):
WITH CHECK (is_bu_admin(auth.uid(), bu_id));  -- Função legada!
WITH CHECK (has_role(auth.uid(), 'admin'));   -- Função legada!
WITH CHECK (role_in_bu = 'admin');            -- Hardcode!
```

#### Padrão de Permission Keys em RLS

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| BU-scoped | `module.entity.action:bu` | `okrs.initiative.create:bu` |
| Team-scoped | `module.entity.action:team` | `okrs.team_kr.update:team` |
| Self/Owner | `module.entity.action:self_or_owner` | `okrs.checkin.create:self_or_owner` |
| Global | `module.entity.action:global` | `admin.settings.manage:global` |

> 📚 Ver: [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md)
> 📚 Ver: [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md)
> 📚 Ver: [IMPERSONATION_AWARE_COMPONENTS.md](./IMPERSONATION_AWARE_COMPONENTS.md) — **OBRIGATÓRIO para dialogs de edição**

---

## D. Queries, Performance e DX

### D.1 Query Keys Centralizadas

```
⚠️ OBRIGATÓRIO: Importar de src/lib/queryKeys.ts
❌ PROIBIDO: Arrays inline como queryKey
```

```typescript
// ✅ CORRETO
import { queryKeys } from "@/lib/queryKeys";

useQuery({
  queryKey: queryKeys.okrs.teamObjectives(buId, teamId),
  queryFn: /* ... */,
});

// ❌ ERRADO
useQuery({
  queryKey: ["okr-team-objectives", buId, teamId], // Hardcoded!
  queryFn: /* ... */,
});
```

### D.2 Proibir select("*")

```typescript
// ❌ ERRADO: Overfetch
const { data } = await supabase.from("profiles").select("*");

// ✅ CORRETO: Campos explícitos
const { data } = await supabase.from("profiles").select("id, first_name, last_name, photo_url");
```

### D.3 Paginação Obrigatória

```typescript
// ✅ CORRETO: Listas com paginação
const { data } = await supabase
  .from("tickets")
  .select("id, title, status", { count: "exact" })
  .range((page - 1) * pageSize, page * pageSize - 1)
  .order("created_at", { ascending: false });

// ❌ ERRADO: Sem paginação em lista grande
const { data } = await supabase.from("tickets").select("*");
```

### D.4 RPCs/Views para Dashboards

Para dashboards com múltiplas agregações, usar RPC ou view ao invés de múltiplas queries:

```sql
-- Criar função agregadora
CREATE FUNCTION get_okr_dashboard_summary(p_bu_id uuid, p_team_id uuid)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'total_objectives', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending_checkins', (SELECT COUNT(*) FROM okr_team_key_results WHERE ...)
  )
  FROM okr_team_objectives WHERE bu_id = p_bu_id AND team_id = p_team_id;
$$ LANGUAGE sql STABLE;
```

### D.5 Scripts de Auditoria Obrigatórios

| Script | Comando | Verifica |
|--------|---------|----------|
| `audit-bu-scope.ts` | `npx tsx scripts/audit-bu-scope.ts` | Inserts/updates sem bu_id |
| `audit-overfetch.ts` | `npx tsx scripts/audit-overfetch.ts` | select("*") |
| `audit-querykeys.ts` | `npx tsx scripts/audit-querykeys.ts` | QueryKeys hardcoded |
| `audit-identity-usage.ts` | `npx tsx scripts/audit-identity-usage.ts` | Violações de identity convention |
| `audit-url-state.ts` | `npx tsx scripts/audit-url-state.ts` | useState para filtros/paginação |
| `audit-rbac.ts` | `npx tsx scripts/audit-rbac.ts` | Hardcode de roles |
| `audit-supabase-client.ts` | `npx tsx scripts/audit-supabase-client.ts` | Cliente global em módulos operacionais |
| `audit-prebu-buscoped.ts` | `npx tsx scripts/audit-prebu-buscoped.ts` | useBuScopedSupabase em contexto PRE-BU |
| `audit-user-directory.ts` | `npx tsx scripts/audit-user-directory.ts` | INNER JOIN memberships em listagem de usuários |
| `audit-docs-vs-tcr.ts` | `npx tsx scripts/audit-docs-vs-tcr.ts` | Documentação contradizendo TCR |
| `audit-sql-against-registry.ts` | `npx tsx scripts/audit-sql-against-registry.ts` | **Referências a tabelas/funções inexistentes** |

> 📚 Ver: [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md)
> 📚 Ver: [DOCS_CONSISTENCY_RULES.md](./DOCS_CONSISTENCY_RULES.md)
> 📚 Ver: [DATA_MODEL_REGISTRY_AUDIT.md](./DATA_MODEL_REGISTRY_AUDIT.md)

### D.6 Data Model Registry (OBRIGATÓRIO)

```
⚠️ REGRA INQUEBRÁVEL: É proibido inventar nomes de tabela/view/função.
✅ OBRIGATÓRIO: Usar exclusivamente o DATA_MODEL_REGISTRY.
```

- **Fonte única:** `docs/engineering/DATA_MODEL_REGISTRY.md` + `.json`
- **Regenerar:** `npx tsx scripts/generate-data-model-registry.ts`
- **Quando:** Após cada migration

> 📚 Ver: [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md)

---

## E. URL State

### E.1 Quando Usar

| ✅ Vai para URL | ❌ NÃO vai para URL |
|-----------------|---------------------|
| Busca (`q`) | Dados sensíveis |
| Filtros (`status`, `teamId`) | Drafts de formulário |
| Paginação (`page`, `pageSize`) | Estados efêmeros (hover) |
| Ordenação (`sort`, `dir`) | IDs secretos |
| Tabs (`tab`) | |
| Período (`start`, `end`) | |

### E.2 Hooks Padrão

```typescript
import { useUrlState, useUrlTab, useUrlSearch, useUrlStates } from "@/shared/url";

// Parâmetro único
const [search, setSearch] = useUrlState({ key: "q", defaultValue: "", debounceMs: 300 });

// Tab
const [activeTab, setActiveTab] = useUrlTab<"overview" | "details">("overview");

// Busca com debounce
const [search, setSearch] = useUrlSearch("", 300);

// Múltiplos parâmetros
const { values, set, resetAll, hasActiveFilters } = useUrlStates(schema);
```

### E.3 Convenção de Nomes

| Parâmetro | Uso |
|-----------|-----|
| `q` | Busca textual |
| `status` | Filtro de status |
| `page` | Página atual |
| `pageSize` | Itens por página |
| `sort` | Campo de ordenação |
| `dir` | Direção (asc/desc) |
| `tab` | Aba ativa |
| `teamId` | Filtro de time |
| `year` | Ano selecionado |

### E.4 API de Migração (Wave 2 → Wave 3)

```
⚠️ Hooks antigos podem ser mantidos como compatibility wrappers até Wave 3.
❌ Novas páginas NÃO PODEM usar API tuple [value, setValue].
✅ Novas páginas DEVEM usar API object { value, set, ... }.
```

#### Hooks Legados (src/hooks/useUrlState.ts)

Os hooks em `src/hooks/useUrlState.ts` retornam tuple para compatibilidade:

```typescript
// ⚠️ LEGADO - Apenas para código existente
const [search, setSearch] = useUrlState({ key: "q", defaultValue: "" });
```

#### Hooks Novos (@/shared/url)

Novos hooks retornam objeto com métodos adicionais:

```typescript
// ✅ NOVO PADRÃO - Para código novo
const { value, set, clear } = useUrlState({ key: "q", defaultValue: "" });
```

#### Prazo de Remoção

- **Wave 3:** Migrar todas as páginas existentes para `@/shared/url`
- **Pós-Wave 3:** Remover `src/hooks/useUrlState.ts`

> 📚 Ver: [URL_STATE_STANDARD.md](../URL_STATE_STANDARD.md)

---

## F. Edge Functions

### F.1 Limites Obrigatórios

```
⚠️ LIMITE: Edge Functions não devem exceder 500 linhas.
```

| Métrica | Limite | Ação se exceder |
|---------|--------|-----------------|
| Linhas por função | ≤500 | Extrair para `_shared/` |
| Handlers por arquivo | ≤3 | Dividir em funções separadas |
| Imports externos | Minimizar | Preferir `_shared/` |

### F.2 Usar `withMiddleware` (Padrão Canônico)

```typescript
// ✅ CORRETO: Usar middleware compartilhado
import { withMiddleware } from "../_shared/withMiddleware.ts";
import { createJsonResponse } from "../_shared/responseUtils.ts";

Deno.serve(async (req) => {
  const middlewareResult = await withMiddleware(req);
  if (!middlewareResult.success) {
    return middlewareResult.error;
  }

  const { supabase, user, correlationId } = middlewareResult;

  try {
    const result = await processRequest(req, supabase, user);
    return createJsonResponse({ success: true, data: result });
  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return createJsonResponse({ error: error.message }, 500);
  }
});
```

### F.3 Restrição de Acesso por Role

```typescript
// ✅ CORRETO: Restringir funções dev-only
const middlewareResult = await withMiddleware(req);
if (!middlewareResult.success) return middlewareResult.error;

const { supabase, user } = middlewareResult;

// Verificar se é platform admin
const { data: isAdmin } = await supabase.rpc("is_platform_admin", {
  p_user_id: user.id
});

if (!isAdmin) {
  return createJsonResponse({ error: "Forbidden" }, 403);
}
```

### F.4 Idempotência

Para operações que podem ser duplicadas (webhooks), usar `dedupe_key`:

```typescript
const { data: existing } = await supabase
  .from("processed_events")
  .select("id")
  .eq("dedupe_key", dedupeKey)
  .single();

if (existing) {
  return { success: true, duplicate: true };
}

await supabase.from("processed_events").insert({ dedupe_key: dedupeKey });
```

### F.5 Config TOML

```toml
# supabase/config.toml
[functions.my-function]
verify_jwt = false  # Validar manualmente via middleware
```

---

## G. Banco de Dados

### G.1 RLS 100% Obrigatório

```
⚠️ TODA tabela operacional DEVE ter RLS habilitado e policies configuradas.
```

```sql
-- Template básico
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view within BU"
ON public.my_table FOR SELECT
USING (
  user_has_bu_access(auth.uid(), bu_id) 
  AND is_current_bu(bu_id)
);
```

### G.2 Trigger enforce_bu_scope

Toda tabela com `bu_id` deve ter o trigger:

```sql
CREATE TRIGGER enforce_bu_scope_my_table
BEFORE INSERT OR UPDATE ON public.my_table
FOR EACH ROW
EXECUTE FUNCTION enforce_bu_scope();
```

### G.3 Soft Delete

```sql
-- Toda tabela operacional deve ter deleted_at
ALTER TABLE public.my_table ADD COLUMN deleted_at timestamptz;

-- Índice parcial para performance
CREATE INDEX idx_my_table_active ON public.my_table (bu_id)
WHERE deleted_at IS NULL;
```

### G.4 Checklist Completo para Novas Tabelas Operacionais

Toda nova tabela operacional (dados de BU) DEVE ter:

| Requisito | Exemplo |
|-----------|---------|
| `bu_id uuid NOT NULL` | FK para bu_units |
| `deleted_at timestamptz` | Para soft delete |
| `RLS ENABLED` | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| Trigger `enforce_bu_scope` | Valida bu_id no INSERT/UPDATE |
| Policy SELECT com `is_current_bu(bu_id)` | Isolamento de contexto |
| Policy WRITE com `is_bu_admin` ou permission key | Controle de acesso |
| Índice `(bu_id)` | Performance |
| Índice parcial `WHERE deleted_at IS NULL` | Queries ativas |

**Exemplo: squad_memberships (Wave 5)**
```sql
-- Estrutura
CREATE TABLE squad_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES squads(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  role squad_role NOT NULL DEFAULT 'member',
  deleted_at timestamptz,
  UNIQUE(squad_id, user_id)
);

-- Triggers
CREATE TRIGGER trg_set_bu_id BEFORE INSERT ...
CREATE TRIGGER trg_enforce_bu_scope BEFORE INSERT OR UPDATE ...

-- RLS
CREATE POLICY "view" FOR SELECT USING (
  deleted_at IS NULL AND is_current_bu(bu_id) AND user_has_bu_access(...)
);
CREATE POLICY "manage" FOR ALL USING (is_bu_admin(...));
```
WHERE deleted_at IS NULL;
```

### G.4 Migrations Idempotentes

```sql
-- ✅ CORRETO: Verificar antes de criar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'my_enum') THEN
    CREATE TYPE my_enum AS ENUM ('a', 'b', 'c');
  END IF;
END $$;

-- ✅ CORRETO: IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.my_table (...);
CREATE INDEX IF NOT EXISTS idx_my_table ON public.my_table (...);

-- ❌ ERRADO: Assumir que não existe
CREATE TYPE my_enum AS ENUM (...); -- Falha se já existe
```

### G.5 Comentários Obrigatórios

```sql
-- Documentar colunas com identificadores
COMMENT ON COLUMN public.my_table.owner_user_id IS 
  'profiles.id do owner (ver IDENTITY_CONVENTION.md)';
```

---

## H. Checklist de PR

Antes de considerar qualquer mudança completa, verificar:

### H.1 Compliance Baseline (Obrigatório)

```bash
# Executar TODOS os audits de uma vez
npx tsx scripts/run-compliance-checks.ts
```

> 📚 **Fonte de verdade:** [COMPLIANCE_BASELINE.md](./COMPLIANCE_BASELINE.md)

O Compliance Baseline inclui **12 audits obrigatórios**:

| # | Audit | Severidade | Descrição |
|---|-------|------------|-----------|
| 1 | BU Scope | BLOCKING | Valida bu_id em operações |
| 2 | Identity Convention | BLOCKING | auth.uid() vs profile_id |
| 3 | User Directory | BLOCKING | Listagem inclui profiles sem login |
| 4 | RBAC V2 | BLOCKING | Sistema de permissões V2-only |
| 5 | Supabase Client | BLOCKING | Uso correto por contexto |
| 6 | Query Keys | BLOCKING | Keys de queryKeys.ts |
| 7 | Data Model Registry | BLOCKING | Referências válidas no registry |
| 8 | Docs vs TCR | BLOCKING | Documentação consistente |
| 9 | Overfetch | WARNING | Sem select("*") |
| 10 | URL State | WARNING | Filtros na URL |
| 11 | Permission Keys | BLOCKING | Formato correto |
| 12 | PRE-BU vs POST-BU | BLOCKING | Cliente por fase |

```
⚠️ REGRA INVIOLÁVEL: PR não pode ser mergeada se qualquer audit BLOCKING falhar.
```

### H.2 Checklist Manual

- [ ] **BU Scope**: Toda query operacional usa `useBuScopedSupabase()`?
- [ ] **Identity**: Colunas de domínio usam `profileId`, não `user.id`?
- [ ] **RLS**: Novas tabelas têm RLS + policies?
- [ ] **Triggers**: Tabelas com bu_id têm `enforce_bu_scope`?
- [ ] **Soft Delete**: Tabelas operacionais têm `deleted_at`?
- [ ] **Query Keys**: Todas de `src/lib/queryKeys.ts`?
- [ ] **Select Fields**: Sem `select("*")` em novas queries?
- [ ] **URL State**: Filtros/paginação usam `useUrlState`?
- [ ] **Permissions**: Usando `usePermissions()`, não hardcode?
- [ ] **URL State**: Não usar wrapper legado (`src/hooks/useUrlState.ts`)
- [ ] **User Directory**: Selects de usuários usam `v_bu_active_profiles` / `useBuUsersDirectory`?
- [ ] **User Directory**: Não usa `bu_user_memberships` para listar pessoas?
- [ ] **Documentação**: TCR/docs atualizados se necessário?

### H.3 CI Gate

O workflow `.github/workflows/compliance-all.yml` executa automaticamente em PRs que tocam:
- `supabase/migrations/**`
- `supabase/functions/**`
- `docs/engineering/**`
- `docs/TECHNICAL_CONTEXT_REGISTRY.md`

PR é **bloqueada** automaticamente se qualquer audit BLOCKING falhar.

---

## I. Anti-patterns (Proibidos)

Os seguintes padrões são **PROIBIDOS** no Hub da Jet. Não há exceções.

| # | Anti-pattern | Razão |
|---|--------------|-------|
| 1 | `select("*")` | Overfetch, performance, exposição de dados |
| 2 | Cliente global (`supabase`) em módulo operacional | Bypass de BU scope |
| 3 | `auth.uid()` comparado com coluna de domínio | Viola identity convention (usar `my_profile_id()`) |
| 4 | QueryKey hardcoded (`["tickets", buId]`) | Dificulta invalidação, erro de cache |
| 5 | Filtros/paginação em `useState` | Não compartilhável, não bookmarkável |
| 6 | RLS policy `USING (true)` em tabela operacional | Expõe dados de outras BUs |
| 7 | Tabela operacional sem `bu_id` + trigger `enforce_bu_scope` | Dados órfãos, vazamento cross-BU |
| 8 | Disparo de email direto por módulo (sem outbox) | Sem retry, sem auditoria, sem rate limit |
| 9 | Hardcode de role (`role === 'admin'`) no frontend | Bypass do sistema de permissões |
| 10 | Insert sem `bu_id` explícito | Falha no trigger, dado sem escopo |
| 11 | `INNER JOIN bu_user_memberships` para listar usuários | Exclui usuários sem primeiro login (`user_id NULL`) |
| 12 | Query em `profiles` filtrando por `user_id IS NOT NULL` | Idem acima, usar `v_bu_active_profiles` |

### I.1 User Directory Global — Contrato Inquebrável

```
⚠️ REGRA GLOBAL: Listas de usuários internos vêm de profiles (domínio), não de memberships (auth).
```

| ✅ CORRETO | ❌ PROIBIDO |
|------------|-------------|
| `v_bu_active_profiles` | `INNER JOIN bu_user_memberships` para listar pessoas |
| `useBuUsersDirectory()` | Filtro `user_id IS NOT NULL` em listagem |
| `BuUserSelect` / `BuUserMultiSelect` | Query direta em `profiles` + `memberships` |

**Um usuário DEVE aparecer no diretório mesmo com `profiles.user_id = NULL`.**

O único motivo para exclusão:
- `employment_status = 'terminated'`
- `deleted_at IS NOT NULL`

> 📚 Ver: [QA_USER_DIRECTORY_GLOBAL_v2.md](../qa/QA_USER_DIRECTORY_GLOBAL_v2.md)

---

## J. User Directory Global

### J.1 View Canônica

A fonte única de verdade para listagem de usuários é `v_bu_active_profiles`:

```sql
-- View que inclui TODOS os usuários ativos, mesmo sem login (user_id NULL)
SELECT * FROM v_bu_active_profiles WHERE bu_id = current_bu_id();
```

### J.2 Hooks e Componentes

| Artefato | Uso |
|----------|-----|
| `useBuUsersDirectory()` | Hook canônico para listar usuários da BU |
| `BuUserSelect` | Componente de seleção única de usuário |
| `BuUserMultiSelect` | Componente de seleção múltipla |

### J.3 Regras Invioláveis

- ✅ Usuários aparecem no diretório mesmo com `profiles.user_id = NULL`
- ✅ Exclusão apenas por `employment_status = 'terminated'` ou `deleted_at IS NOT NULL`
- ❌ **PROIBIDO**: `INNER JOIN bu_user_memberships` para listar pessoas
- ❌ **PROIBIDO**: Filtro `user_id IS NOT NULL` em listagem

> 📚 Ver: [QA_USER_DIRECTORY_GLOBAL_v2.md](../qa/QA_USER_DIRECTORY_GLOBAL_v2.md)

---

## K. Hooks e Barrel Files

### K.1 Regra Fundamental

```
⚠️ REGRA INQUEBRÁVEL: Imports de hooks DEVEM vir do barrel file do módulo.
❌ PROIBIDO: Import direto do arquivo de hook.
```

### K.2 Estrutura Padrão

Cada módulo com hooks DEVE ter um `hooks/index.ts` que exporta todos os hooks:

```
src/modules/[module]/
├── hooks/
│   ├── index.ts          # ⭐ BARREL FILE (obrigatório)
│   ├── queries/          # Opcional: subpasta para queries
│   │   ├── index.ts      # Barrel da subpasta
│   │   └── useMyQuery.ts
│   ├── mutations/        # Opcional: subpasta para mutations
│   │   ├── index.ts      # Barrel da subpasta
│   │   └── useMyMutation.ts
│   └── useOtherHook.ts   # Hooks soltos
```

### K.3 Import Pattern

```typescript
// ✅ CORRETO: Import do barrel file
import { useTeams, useTeam, TeamWithRelations } from "@/modules/teams/hooks";
import { useOrgObjective, OrgObjectiveWithKrs } from "@/modules/okrs/hooks";

// ❌ PROIBIDO: Import direto do arquivo
import { useTeams } from "@/modules/teams/hooks/useTeams";
import { useOrgObjective } from "@/modules/okrs/hooks/queries/useOkrQueries";
```

### K.4 Módulos com Barrel Files Consolidados (v2.31.0+)

| Módulo | Barrel File | Conteúdo |
|--------|-------------|----------|
| `okrs` | `hooks/index.ts` | Queries, mutations, aggregates, types |
| `teams` | `hooks/index.ts` | Teams, squads, memberships |
| `assets` | `hooks/index.ts` | Inventory, keys, gifts, categories, permissions |
| `tickets` | `hooks/index.ts` | Tickets, messages, partners, categories, routing |
| `permissions` | `hooks/index.ts` | Catalog, BU permissions, users, governance |
| `bu` | `hooks/index.ts` | BU queries, memberships, branding, locations |
| `automations` | `hooks/index.ts` | Events, actions, connections, tokens, logs |
| `kpis` | `hooks/index.ts` | KPI data queries |
| `settings` | `hooks/index.ts` | Job titles |
| `integrations` | `hooks/index.ts` | Integrations, agents, documents, sources |
| `home` | `hooks/index.ts` | Dashboard queries |
| `vic` | `hooks/index.ts` | Vic agent, stream, feedback |

### K.5 Criando Novo Módulo

1. Criar `src/modules/[module]/hooks/index.ts`
2. Exportar todos os hooks via re-export:
   ```typescript
   // hooks/index.ts
   export * from './useMyQuery';
   export * from './useMyMutation';
   export type { MyType } from './types';
   
   // Se tiver subpastas:
   export * from './queries';
   export * from './mutations';
   ```
3. Documentar no TCR seção 10.4

### K.6 Anti-pattern

```typescript
// ❌ PROIBIDO: Múltiplos imports do mesmo módulo
import { useTeams } from "@/modules/teams/hooks/useTeams";
import { useSquads } from "@/modules/teams/hooks/useSquads";
import { useTeam } from "@/modules/teams/hooks/useTeamDetail";

// ✅ CORRETO: Import único do barrel
import { useTeams, useSquads, useTeam } from "@/modules/teams/hooks";
```

---

## K2. Padrões de Nome e Saudações

### K2.1 Regra Universal: Primeiro Nome Apenas

Em saudações e contextos informais, **SEMPRE usar apenas o primeiro nome**. Ninguém diz "Olá, Nome Sobrenome".

```typescript
// ✅ CORRETO
"Olá, Victorio!"
"Bom dia, Maria."
"Buenas, João!"

// ❌ ERRADO
"Olá, Victorio Venturini!"
"Bom dia, Maria Silva Costa."
```

### K2.2 Implementação

Use a função utilitária `getFirstName` de `@/lib/nameUtils.ts`:

```typescript
import { getFirstName, getGreetingName } from '@/lib/nameUtils';

// A partir de display_name
const firstName = getFirstName(profile.display_name); // "Victorio"

// Com fallback seguro
const greeting = getGreetingName(profile.first_name, profile.display_name);
```

### K2.3 Prioridade de Fontes

1. `profile.first_name` (preferido)
2. Primeiro token de `profile.display_name`
3. Fallback genérico (sem nome)

### K2.4 Instruções para IAs

Todos os agentes de IA que geram saudações devem:

1. Usar `user.first_name` quando disponível
2. Se não, extrair primeiro token de `user.full_name` ou `user.display_name`
3. Nunca usar nome completo em saudações
4. Usar saudação neutra se nome não estiver disponível

---

## L. Layout e Estados de Página

### L.1 Regra de Ouro: HubLayout Obrigatório

**Toda página top-level DEVE renderizar `HubLayout` em TODOS os estados possíveis:**

- Estado de loading
- Estado de erro
- Estado de "não encontrado"
- Estado de sucesso

Isso garante que o menu lateral e header estejam sempre visíveis, proporcionando UX consistente.

### L.2 Padrão para Páginas Top-Level

```typescript
// ✅ CORRETO: HubLayout em todos os estados
export default function MyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useMyData(id);

  // Loading state - COM HubLayout
  if (isLoading) {
    return (
      <HubLayout>
        <LoadingState text="Carregando..." />
      </HubLayout>
    );
  }

  // Error state - COM HubLayout
  if (error) {
    return (
      <HubLayout>
        <ErrorState 
          title="Erro ao carregar"
          description="Não foi possível carregar os dados."
        />
      </HubLayout>
    );
  }

  // Not found state - COM HubLayout
  if (!data) {
    return (
      <HubLayout>
        <ResourceNotFoundState
          resourceType="item"
          resourceId={id}
          moduleRoot="/my-module"
        />
      </HubLayout>
    );
  }

  // Success state - COM HubLayout
  return (
    <HubLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* conteúdo da página */}
      </div>
    </HubLayout>
  );
}
```

### L.3 Anti-pattern: Estados sem Layout

```typescript
// ❌ PROIBIDO: Retornar estado sem HubLayout
if (isLoading) {
  return <LoadingState text="Carregando..." />; // Perde menu e header!
}

if (!data) {
  return (
    <div className="p-6">
      <ErrorState title="Erro" /> {/* Perde menu e header! */}
    </div>
  );
}
```

### L.4 Exceções Permitidas

Componentes que são **filhos** de páginas já com layout podem retornar estados diretamente:

```typescript
// ✅ OK para componentes internos (ex: tabs, views dentro de páginas)
function MyTabContent() {
  if (isLoading) {
    return <LoadingState text="Carregando..." />; // OK - pai já tem layout
  }
  // ...
}

// Usado em:
function MySettingsPage() {
  return (
    <HubLayout> {/* Layout está no nível de página */}
      <Tabs>
        <TabsContent value="tab1">
          <MyTabContent /> {/* Componente interno, pode retornar direto */}
        </TabsContent>
      </Tabs>
    </HubLayout>
  );
}
```

### L.5 Componentes de Estado Disponíveis

| Componente | Uso | Arquivo |
|------------|-----|---------|
| `LoadingState` | Carregamento de dados | `src/components/ui/loading-state.tsx` |
| `ErrorState` | Erros genéricos com retry | `src/components/ui/error-state.tsx` |
| `ResourceNotFoundState` | Recurso não encontrado (404) | `src/components/ui/resource-not-found-state.tsx` |
| `EmptyState` | Lista vazia (não é erro) | `src/components/ui/empty-state.tsx` |

### L.6 Checklist para Novas Páginas

- [ ] `HubLayout` envolve estado de loading
- [ ] `HubLayout` envolve estado de erro
- [ ] `HubLayout` envolve estado de "não encontrado"
- [ ] `HubLayout` envolve estado de sucesso
- [ ] Componente usa `usePageTitle()` para título dinâmico
- [ ] Botão "Voltar" usa `useSafeBack()` ou link apropriado

---

## M. Limites de Código e Sustentabilidade

### M.1 Limites por Tipo de Arquivo

```
⚠️ REGRA: Arquivos que excedem limites DEVEM ser refatorados antes de adicionar funcionalidade.
```

| Tipo | Limite | Ação se exceder |
|------|--------|-----------------|
| Hooks (`use*.ts`) | ≤200 linhas | Extrair sub-hooks ou funções |
| Edge Functions | ≤500 linhas | Extrair para `_shared/` |
| Componentes | ≤300 linhas | Dividir em sub-componentes |
| Páginas | ≤400 linhas | Extrair seções para componentes |
| Utils/Helpers | ≤150 linhas | Agrupar por domínio |

### M.2 Sinais de Complexidade

Refatorar quando:

- Hook mistura queries, mutations e side effects
- Componente tem mais de 5 `useState`
- Função tem mais de 4 níveis de indentação
- Arquivo tem mais de 10 imports

### M.3 Padrão de Extração

```typescript
// ❌ ANTES: Hook monolítico (400+ linhas)
export function useNotificationCenter() {
  // queries
  // mutations
  // handlers
  // side effects
}

// ✅ DEPOIS: Hooks compostos
export function useNotificationCenter() {
  const queries = useNotificationQueries();
  const mutations = useNotificationMutations();
  const handlers = useNotificationHandlers(queries, mutations);
  
  return { ...queries, ...mutations, ...handlers };
}
```

### M.4 Cleanup Automático de Logs

O Hub possui função de cleanup para tabelas de log:

```sql
-- Executar semanalmente (via cron ou admin)
SELECT * FROM cleanup_old_audit_logs(90);
-- Retorna contagem de registros deletados por tabela
```

Tabelas limpas automaticamente:
- `audit_logs` (retenção: 90 dias)
- `ai_agent_logs` (retenção: 90 dias)

---

## N. Testes Automatizados

O Hub implementa uma estratégia completa de testes seguindo roadmap de 6 fases:

### N.1 Stack de Testes

| Tipo | Ferramenta | Propósito |
|------|------------|-----------|
| Unit | Vitest | Funções puras, utils, validações |
| Integration | Vitest + MSW | Hooks, React Query, API mocks |
| Component | Vitest + Testing Library | Componentes React |
| E2E | Playwright | Fluxos críticos completos |

### N.2 Estrutura de Arquivos

```
src/
├── test/
│   ├── mocks/
│   │   ├── fixtures/     # Dados de teste (OKRs, profiles)
│   │   ├── handlers.ts   # MSW handlers para Supabase
│   │   └── supabase.ts   # Mock do cliente Supabase
│   ├── setup.ts          # Setup global do Vitest
│   └── test-utils.tsx    # Providers e helpers
├── **/*.test.ts          # Testes unitários e integração

e2e/
├── fixtures/             # Fixtures E2E
├── *.spec.ts            # Testes Playwright
└── README.md            # Docs E2E
```

### N.3 Comandos

```bash
# Unit/Integration tests
npm run test              # Watch mode
npm run test -- --run     # Single run
npm run test -- --coverage # Com cobertura

# E2E tests
npx playwright test       # Todos os testes
npx playwright test --ui  # Modo interativo
```

### N.4 Metas de Cobertura

| Área | Meta | Prioridade |
|------|------|------------|
| Pure Utils | 90% | Alta |
| Validation Logic | 85% | Alta |
| Business Hooks | 80% | Alta |
| Components | 70% | Média |

### N.5 CI/CD

Workflows configurados em `.github/workflows/`:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `test.yml` | Push/PR para main/develop | unit-tests, e2e-tests, lint, type-check |
| `test-quick.yml` | Push em feature branches | unit-tests, type-check |

### N.6 Padrões de Teste

```typescript
// ✅ Unit test
import { describe, it, expect } from 'vitest';
import { validateKrTitle } from './krValidation';

describe('validateKrTitle', () => {
  it('should reject empty titles', () => {
    const result = validateKrTitle('');
    expect(result.isValid).toBe(false);
  });
});

// ✅ Hook test com MSW
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

it('should fetch data', async () => {
  const { result } = renderHook(() => useMyHook(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

// ✅ E2E test
import { test, expect } from '@playwright/test';

test('should complete login flow', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

> 📚 **Guia Completo:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | Visão completa do sistema |
| [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md) | Convenção auth vs profiles |
| [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md) | Sistema de permissões V2 |
| [URL_STATE_STANDARD.md](../URL_STATE_STANDARD.md) | Padrão de URL state |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase |
| [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) | Padrão de query keys |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Guia de testes automatizados |
| [SYSTEM_HEALTH_AUDIT_2026-01-13.md](./SYSTEM_HEALTH_AUDIT_2026-01-13.md) | Auditoria sistêmica |
| [SYSTEM_HEALTH_AUDIT_2026-01-13.md](./SYSTEM_HEALTH_AUDIT_2026-01-13.md) | Auditoria sistêmica |
