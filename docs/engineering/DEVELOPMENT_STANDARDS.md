# Padrões de Desenvolvimento — Hub da Jet

**Versão:** 1.0.1  
**Última atualização:** 2026-01-08  
**Status:** Normativo

---

## Índice

- [A. Arquitetura e Contextos](#a-arquitetura-e-contextos)
- [B. Identidade (auth vs profiles)](#b-identidade-auth-vs-profiles)
- [C. Permissões (RBAC)](#c-permissões-rbac)
- [D. Queries, Performance e DX](#d-queries-performance-e-dx)
- [E. URL State](#e-url-state)
- [F. Edge Functions](#f-edge-functions)
- [G. Banco de Dados](#g-banco-de-dados)
- [H. Checklist de PR](#h-checklist-de-pr)
- [I. Anti-patterns (Proibidos)](#i-anti-patterns-proibidos)
- [B. Identidade (auth vs profiles)](#b-identidade-auth-vs-profiles)
- [C. Permissões (RBAC)](#c-permissões-rbac)
- [D. Queries, Performance e DX](#d-queries-performance-e-dx)
- [E. URL State](#e-url-state)
- [F. Edge Functions](#f-edge-functions)
- [G. Banco de Dados](#g-banco-de-dados)
- [H. Checklist de PR](#h-checklist-de-pr)

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
// Hook para profile_id do usuário logado
import { useMyProfileId } from "@/hooks/useMyProfileId";

const { profileId, isLoading } = useMyProfileId();

// Usar profileId para ownership
await supabase.from("okr_initiatives").insert({
  owner_user_id: profileId, // profiles.id
  ...data,
});
```

### B.6 Colunas de Domínio (armazenam profiles.id)

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

### C.6 RLS: Usar has_permission()

```sql
-- ✅ CORRETO: Verificar permissão via função
CREATE POLICY "Users with create permission"
ON public.okr_initiatives FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), current_bu_id(), 'okrs.initiative.create')
);

-- ❌ ERRADO: Verificar role diretamente
WITH CHECK (
  role_in_bu = 'admin' -- Hardcode!
);
```

> 📚 Ver: [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md)

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

> 📚 Ver: [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md)

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

### F.1 Estrutura Padrão

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-current-bu-id, x-correlation-id",
};

serve(async (req) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. Correlation ID (para logs)
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();

  // 3. Validar JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: authData, error: authError } = await supabase.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !authData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Extrair BU (se necessário)
  const buId = req.headers.get("x-current-bu-id");
  if (!buId) {
    return new Response(JSON.stringify({ error: "Missing BU context" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5. Lógica da função
  try {
    const result = await processRequest(req, supabase, buId, authData.claims);

    console.log(`[${correlationId}] Success`);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${correlationId}] Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### F.2 Idempotência

Para operações que podem ser duplicadas (webhooks), usar `dedupe_key`:

```typescript
// Verificar se já processou
const { data: existing } = await supabase
  .from("processed_events")
  .select("id")
  .eq("dedupe_key", dedupeKey)
  .single();

if (existing) {
  return { success: true, duplicate: true };
}

// Processar e registrar
await supabase.from("processed_events").insert({ dedupe_key: dedupeKey });
```

### F.3 Config TOML

```toml
# supabase/config.toml
[functions.my-function]
verify_jwt = false  # Validar manualmente com getClaims()
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

### H.1 Audits Obrigatórios

| Check | Comando | Esperado |
|-------|---------|----------|
| BU Scope | `npx tsx scripts/audit-bu-scope.ts` | 0 críticos |
| Query Keys | `npx tsx scripts/audit-querykeys.ts` | 0 violações |
| Identity | `npx tsx scripts/audit-identity-usage.ts` | 0 violações |
| RBAC | `npx tsx scripts/audit-rbac.ts` | 0 erros |
| URL State | `npx tsx scripts/audit-url-state.ts` | 0 novas violações |
| Overfetch | `npx tsx scripts/audit-overfetch.ts` | 0 novos select(*) |
| Supabase Client | `npx tsx scripts/audit-supabase-client.ts` | 0 erros |

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
- [ ] **Documentação**: TCR/docs atualizados se necessário?

### H.3 Report de Compliance

Ao finalizar trabalho significativo, gerar report:

```bash
# Executar todos os audits e gerar report
npx tsx scripts/audit-bu-scope.ts > /tmp/bu.txt
npx tsx scripts/audit-querykeys.ts > /tmp/qk.txt
npx tsx scripts/audit-identity-usage.ts > /tmp/id.txt
# ... consolidar em docs/qa/<MODULE>_COMPLIANCE_REPORT.md
```

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

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | Visão completa do sistema |
| [IDENTITY_CONVENTION.md](../IDENTITY_CONVENTION.md) | Convenção auth vs profiles |
| [RBAC_TEMPLATES_V3.md](../RBAC_TEMPLATES_V3.md) | Sistema de permissões |
| [URL_STATE_STANDARD.md](../URL_STATE_STANDARD.md) | Padrão de URL state |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase |
| [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) | Padrão de query keys |
