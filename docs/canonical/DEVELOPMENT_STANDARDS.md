# Padrões de Desenvolvimento — Hub da Jet

**Versão:** 1.26.0  
**Última atualização:** 2026-02-23  
**Status:** Normativo (V2-only mode ativo) | RLS 100% V2 | Hooks Consolidados | **Testes Automatizados Ativos** | **Internal Auth Hardening v1.0** | **Identity Hardening v2.1** | **P1/P2 Refatorações Concluídas** | **Context Resilience Pattern v1.0** | **useOptionalBuClient Stricter Gating v1.0** | **React Router forwardRef Fix v1.0** | **Supabase Client Singleton Pattern v1.0** | **Responsibility Transfer System (RTS) v1.0** | **Soft-Delete Filters Standard v1.1** | **PII Security Hardening v1.0** | **100% Query Keys Compliance** | **Query Key Prefixes v1.0** | **useDialogFormReset Standard v1.0** | **UnitSelect Canonical Component v1.0** | **Frontend BU Isolation Enforcement v1.0** | **Null-Safe Sort Standard v1.0** | **Progress Overachievement Display v1.0** | **MBR Ritual v1.0**
**Referência:** TCR v3.9.0

---

## Índice

- [A. Arquitetura e Contextos](#a-arquitetura-e-contextos)
  - [A.1 PRE-BU vs POST-BU](#a1-pre-bu-vs-post-bu)
  - [A.2 Context Resilience Pattern](#a2-context-resilience-pattern-v1150)
  - [A.3 BU Scope Enforcement](#a3-bu-scope-enforcement)
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
- [O. Responsabilidades e Migração](#o-responsabilidades-e-migração)

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
// ✅ CORRETO: Usando cliente global SINGLETON para auth
import { supabase } from "@/integrations/supabase/globalClient";
await supabase.auth.signInWithOtp({ email });

// ❌ ERRADO: Import do client auto-gerado (causa múltiplas instâncias)
import { supabase } from "@/integrations/supabase/client"; // NÃO USAR!

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
import { supabase } from "@/integrations/supabase/globalClient";
const { data } = await supabase.from("tickets").select("*"); // BUG!
```

#### Exceções Autorizadas (Cliente Global Singleton)

| Arquivo/Contexto | Import Correto | Justificativa |
|------------------|----------------|---------------|
| `useAuth.tsx` | `globalClient.ts` | Operações de auth não têm BU |
| `useUserBus.ts`, `useExternalUser.ts` | `globalClient.ts` | Bootstrap antes do BuProvider |
| `NotificationCenter.tsx` | `globalClient.ts` | Realtime subscription global (ver regras abaixo) |
| `validateDomain.ts` | `globalClient.ts` | Validação pré-auth |

> ⚠️ **CRÍTICO:** Nunca importar de `@/integrations/supabase/client`. Sempre usar `globalClient.ts` ou `useBuScopedSupabase()`.

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

### A.2 Context Resilience Pattern (v1.15.0)

Hooks e providers que podem ser usados em rotas públicas (ex: `/auth`) DEVEM usar acesso resiliente ao contexto via `useContext` com optional chaining, ao invés de hooks que lançam exceção.

#### Problema

Rotas públicas são renderizadas **antes** de `AuthProvider` ou `BuProvider` estarem inicializados. Usar `useAuth()` ou `useBu()` diretamente causa crash:

```typescript
// ❌ ERRADO: Crash em rotas públicas
const { user } = useAuth(); // Error: useAuth must be used within AuthProvider
const { currentBu } = useBu(); // Error: useBu must be used within BuProvider
```

#### Solução: Acesso Resiliente

```typescript
import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/hooks/useAuth';
import { BuContext, BuContextType } from '@/contexts/BuContext';

// ✅ CORRETO: Acesso seguro que não crasheia
const authContext = useContext(AuthContext) as AuthContextType | undefined;
const user = authContext?.user ?? null;
const isAuthLoading = authContext?.isLoading ?? true;

const buContext = useContext(BuContext);
const currentBu = buContext?.currentBu ?? null;
const buSelected = buContext?.buSelected ?? false;
```

#### Arquivos com Contexto Resiliente

| Arquivo | Contexto | Justificativa |
|---------|----------|---------------|
| `useExternalUser.ts` | `AuthContext` | Bootstrap de usuários externos antes de BuProvider |
| `usePageTitle.ts` | `BuContext` | Usado em páginas públicas (/auth, /auth/callback) |
| `BuContext.tsx` | `AuthContext` | Inicializa antes de AuthProvider em rotas públicas |

#### Padrão Obrigatório

1. **Exportar contexto**: Contexts devem ser exportados para acesso direto
2. **Optional chaining**: Usar `?.` para acessar propriedades
3. **Defaults seguros**: Fornecer valores padrão (null, true, false) para evitar undefined

### A.3 BU Scope Enforcement

```
⚠️ REGRA INQUEBRÁVEL: Todo dado operacional é escopado por BU.
```

#### Funções SQL Obrigatórias

| Função | Uso |
|--------|-----|
| `current_bu_id()` | Retorna BU do contexto. NUNCA retorna NULL. |
| `is_current_bu(bu_id)` | Helper para RLS: verifica se bu_id = contexto |
| `assert_bu_scope(bu_id)` | Trigger: valida bu_id do payload |

#### Frontend: Filtragem Obrigatória por BU (v1.23.1)

> ⚠️ **REGRA INQUEBRÁVEL:** Toda query de listagem ou detalhe de dados operacionais **DEVE** incluir `.eq('bu_id', currentBuId)` no frontend, **independente da RLS existente**.
>
> **Motivo:** A RLS permite acesso a múltiplas BUs para admins e platform admins. Sem filtro explícito no frontend, dados de outras BUs vazam na UI.

```typescript
// ✅ CORRETO: Listagem com filtro explícito de BU
const { currentBuId } = useBu();
const supabase = useBuScopedSupabase();

const { data } = useQuery({
  queryKey: kpiKeys.list(currentBuId),
  queryFn: async () => {
    const { data } = await supabase
      .from("kpi_metrics")
      .select("id, name, status")
      .eq("bu_id", currentBuId);  // ✅ OBRIGATÓRIO
    return data;
  },
  enabled: !!currentBuId,  // ✅ OBRIGATÓRIO: gating por BU
});

// ✅ CORRETO: Detalhe com validação pós-fetch
const { data } = useQuery({
  queryKey: kpiKeys.detail(id),
  queryFn: async () => {
    const { data } = await supabase
      .from("kpi_metrics")
      .select("id, name, bu_id")
      .eq("id", id)
      .single();
    // Validação: rejeitar se BU não corresponde
    if (data?.bu_id !== currentBuId) return null;
    return data;
  },
  enabled: !!currentBuId && !!id,
});

// ❌ ERRADO: Listagem SEM filtro de BU (dados de outras BUs aparecem para admins)
const { data } = await supabase.from("kpi_metrics").select("id, name");

// ❌ ERRADO: Detalhe SEM validação de BU
const { data } = await supabase.from("kpi_metrics").select("*").eq("id", id).single();
```

#### Checklist para Novos Hooks de Dados Operacionais

| Tipo | Requisito | Exemplo |
|------|-----------|---------|
| **Listagem** | `.eq('bu_id', currentBuId)` na query | `useKpiData()`, `useTeams()` |
| **Detalhe por ID** | Validação pós-fetch `data.bu_id !== currentBuId → null` | `useKpiDetail()`, `useTicketDetail()` |
| **RPCs com JOIN** | Parâmetro `p_bu_id` ou `AND t.bu_id = current_bu_id()` | `get_cycle_checkins()` |
| **Habilitação** | `enabled: !!currentBuId` (nunca rodar sem BU) | Todos os hooks operacionais |

> **A RLS é a última linha de defesa, não a única.** O frontend DEVE filtrar proativamente.

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

> 📚 Ver: [RBAC_TEMPLATES_V3.md](./RBAC_TEMPLATES_V3.md)
> 📚 Ver: [PERMISSIONS_AND_RBAC_MODEL.md](./PERMISSIONS_AND_RBAC_MODEL.md)
> 📚 Ver: [IMPERSONATION_AWARE_COMPONENTS.md](../guides/IMPERSONATION_AWARE_COMPONENTS.md) — **OBRIGATÓRIO para dialogs de edição**

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

### D.2 Invalidação Automática de Cache (Mutations)

```
⚠️ REGRA OBRIGATÓRIA: Toda mutation DEVE invalidar queries relacionadas no `onSuccess`.
```

Ao editar, criar ou excluir dados em modais ou formulários, a lista/página que exibe esses dados DEVE atualizar automaticamente sem necessidade de recarregar a página.

```typescript
// ✅ CORRETO: Invalidar queries no onSuccess da mutation
const updateMutation = useMutation({
  mutationFn: async (input) => {
    const { error } = await supabase.from('my_table').update(input).eq('id', input.id);
    if (error) throw error;
  },
  onSuccess: () => {
    // Invalidar todas as queries que exibem esses dados
    queryClient.invalidateQueries({ queryKey: queryKeys.myModule.list(buId) });
    toast.success('Item atualizado com sucesso');
  },
  onError: (error) => {
    toast.error('Erro ao atualizar');
  },
});
```

#### Query Key Prefixes para Invalidação (v1.22.0)

Para garantir invalidação correta de múltiplas variações de queries, usar **prefix helpers**:

```typescript
// src/lib/queryKeys/okrs.ts
export const kpisKeys = {
  // Keys específicas
  list: (buId: string | null, filters: KpiFilters) => ['kpis', 'list', buId, filters] as const,
  detail: (kpiId: string) => ['kpis', kpiId] as const,
  
  // ✅ PREFIXES para invalidação ampla
  listPrefix: () => ['kpis', 'list'] as const,
  evolutionListPrefix: () => ['kpis', 'evolution-list'] as const,
  valuesPrefix: () => ['kpis', 'values'] as const,
};
```

```typescript
// ✅ CORRETO: Invalidar usando prefix (afeta todas as variações de filtros)
queryClient.invalidateQueries({ 
  queryKey: queryKeys.kpis.listPrefix(), 
  refetchType: 'active' 
});

// ❌ ERRADO: Invalidar key que não casa com as queries reais
queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null) }); // BUG!
```

**Regras:**
- ✅ Usar `queryKeys` centralizadas para invalidação (nunca strings hardcoded)
- ✅ Invalidar usando prefixo para afetar variações (ex: `queryKeys.myModule.listPrefix()`)
- ✅ Fechar modal no `onSuccess` APÓS invalidação
- ❌ NUNCA exigir que usuário recarregue página para ver alterações

**Exemplo Completo em Dialog de Edição:**

```typescript
// No Dialog de edição
const handleSubmit = async (data: FormData) => {
  await updateMutationAsync(data);
  onOpenChange(false); // Fechar modal após sucesso
};
```

### D.3 Proibir select("*")

```typescript
// ❌ ERRADO: Overfetch
const { data } = await supabase.from("profiles").select("*");

// ✅ CORRETO: Campos explícitos
const { data } = await supabase.from("profiles").select("id, first_name, last_name, photo_url");
```

### D.4 Paginação Obrigatória

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
| **identity-gate.sh** | `./scripts/identity-gate.sh` | **CI/Pre-commit gate para identity violations** ⭐ NOVO |

> 📚 Ver: [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md)
> 📚 Ver: [DOCS_CONSISTENCY_RULES.md](./DOCS_CONSISTENCY_RULES.md)
> 📚 Ver: [DATA_MODEL_REGISTRY_AUDIT.md](./DATA_MODEL_REGISTRY_AUDIT.md)

### D.6 Data Model Registry (OBRIGATÓRIO)

```
⚠️ REGRA INQUEBRÁVEL: É proibido inventar nomes de tabela/view/função.
✅ OBRIGATÓRIO: Usar exclusivamente o DATA_MODEL_REGISTRY.
```

- **Fonte única:** `docs/canonical/DATA_MODEL_REGISTRY.md` + `.json`
- **Regenerar:** `npx tsx scripts/generate-data-model-registry.ts`
- **Quando:** Após cada migration

> 📚 Ver: [DATA_MODEL_REGISTRY.md](./DATA_MODEL_REGISTRY.md)

### D.7 Soft-Delete: Filtros Obrigatórios de `deleted_at` e `cancelled_at`

```
⚠️ REGRA INQUEBRÁVEL: Toda query em tabelas com soft-delete DEVE incluir filtros de exclusão.
```

**Tabelas de OKRs (OBRIGATÓRIO em todas as queries):**

| Tabela | Filtros Obrigatórios |
|--------|---------------------|
| `okr_org_objectives` | `.is('deleted_at', null).is('cancelled_at', null).neq('status', 'cancelled').neq('status', 'discarded')` |
| `okr_org_key_results` | `.is('deleted_at', null).is('cancelled_at', null)` |
| `okr_team_objectives` | `.is('deleted_at', null).is('cancelled_at', null).neq('status', 'cancelled').neq('status', 'discarded')` |
| `okr_team_key_results` | `.is('deleted_at', null).is('cancelled_at', null)` |
| `okr_initiatives` | `.is('deleted_at', null).is('cancelled_at', null)` |

**CRÍTICO — Queries de KRs Vinculadas (linked_org_kr_id):**

Ao buscar Team KRs vinculadas a Org KRs, você DEVE também filtrar pelo status do **objetivo pai**:

```typescript
// ✅ CORRETO: Filtrar KRs E objetivo pai
const { data: teamKrs } = await supabase
  .from('okr_team_key_results')
  .select(`
    id, title, linked_org_kr_id,
    team_objective:team_objective_id!inner (
      id, status, cancelled_at, deleted_at
    )
  `)
  .in('linked_org_kr_id', orgKrIds)
  .is('deleted_at', null)
  .is('cancelled_at', null)
  .is('team_objective.cancelled_at', null)
  .is('team_objective.deleted_at', null)
  .not('team_objective.status', 'in', '(cancelled,discarded)');
```

> ⚠️ O uso de `!inner` garante que apenas KRs com objetivo ativo sejam retornadas.

**Exemplo Correto — Query Simples:**

```typescript
// ✅ CORRETO: Query com todos os filtros de soft-delete
const { data } = await supabase
  .from('okr_team_objectives')
  .select('id, title, status')
  .eq('bu_id', buId)
  .is('deleted_at', null)
  .is('cancelled_at', null)
  .neq('status', 'cancelled')
  .neq('status', 'discarded');

// ✅ CORRETO: Query aninhada com filtro na relação
const { data } = await supabase
  .from('okr_team_objectives')
  .select(`
    id, title,
    key_results:okr_team_key_results(id, title, deleted_at, cancelled_at)
  `)
  .is('deleted_at', null)
  .is('cancelled_at', null);

// E DEPOIS filtrar KRs no cliente:
const filtered = data.map(obj => ({
  ...obj,
  key_results: obj.key_results.filter(kr => !kr.deleted_at && !kr.cancelled_at)
}));
```

**❌ PROIBIDO:**

```typescript
// ❌ ERRADO: Sem filtros de soft-delete — exibirá itens cancelados/removidos!
const { data } = await supabase
  .from('okr_initiatives')
  .select('id, name, status')
  .eq('bu_id', buId);

// ❌ ERRADO: KRs sem filtro do objetivo pai — mostrará KRs de objetivos cancelados!
const { data: teamKrs } = await supabase
  .from('okr_team_key_results')
  .select('id, title, linked_org_kr_id')
  .in('linked_org_kr_id', orgKrIds)
  .is('deleted_at', null)
  .is('cancelled_at', null);
  // Falta: filtro pelo status do team_objective!
```

> ⚠️ **IMPORTANTE:** Esta regra aplica-se a TODAS as queries de leitura, incluindo queries aninhadas e de contexto.

### D.8 useDialogFormReset — Padrão Canônico para Dialogs de Edição (v1.22.0)

```
⚠️ PROBLEMA: useEffect que reseta form em "kpi changes + open" apaga edições do usuário durante refetch.
✅ SOLUÇÃO: Usar useDialogFormReset() que só reseta ao transicionar closed → open.
```

O hook `useDialogFormReset` garante que formulários em dialogs só sejam resetados quando o dialog realmente abre, evitando perda de edições durante refetches ou re-renders.

#### Localização

```typescript
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
```

#### Uso Correto

```typescript
function EditKpiDialog({ kpi, open, onOpenChange }: Props) {
  const form = useForm<FormData>({ /* ... */ });
  
  // ✅ CORRETO: Reseta apenas quando dialog transiciona closed → open
  useDialogFormReset(open, () => {
    form.reset({
      name: kpi.name,
      scope: kpi.scope,
      // ... outros campos
    });
  });
  
  // ❌ ERRADO: useEffect com dependências que mudam durante edição
  // useEffect(() => {
  //   if (open && kpi) form.reset({ ... });  // BUG: reseta a cada refetch!
  // }, [kpi, open]);
  
  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
}
```

#### Quando o KPI ID muda (dialog aberto)

Se o componente permite trocar de entidade com o dialog aberto (raro), detectar mudança de ID:

```typescript
const prevIdRef = useRef(kpi?.id);

useDialogFormReset(open, () => {
  form.reset({ ...kpi });
  prevIdRef.current = kpi?.id;
});

// Detectar troca de entidade enquanto aberto
useEffect(() => {
  if (open && kpi?.id && kpi.id !== prevIdRef.current) {
    form.reset({ ...kpi });
    prevIdRef.current = kpi.id;
  }
}, [open, kpi?.id, form, kpi]);
```

#### Aplicação Obrigatória

Todos os dialogs de edição DEVEM usar este padrão:
- ✅ `EditKpiDialog`
- ✅ `TeamKrFormDialog`  
- ✅ `OrgKrFormDialog`
- ✅ `EditBuDialog`
- ✅ `AreaFormDialog`
- ✅ Qualquer dialog com `react-hook-form` que carrega dados de uma entidade

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
| 13 | Select inline hardcoded para unidades (%, R$, dias) | Inconsistência de UX, usar `UnitSelect` |
| 14 | Constante local `UNITS` em wizards/modais | Duplicação, usar `@/shared/constants/units` |
| 15 | `.sort((a, b) => a.name.localeCompare(b.name))` sem null-guard | Crash se `name` for `undefined`/`null` |

### I.1 Null-Safe Sort — Padrão Obrigatório (v1.25.0)

```
⚠️ REGRA: Todo `.sort()` com `localeCompare` DEVE usar null-guard `?? ''`.
```

| ✅ CORRETO | ❌ PROIBIDO |
|------------|-------------|
| `.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'))` | `.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))` |

**Motivo:** Views e queries podem retornar linhas com campos `null`/`undefined` (ex: `v_partner_services_by_bu` retorna `subcategory_name: NULL` para empresas generalistas). Sem null-guard, `null.localeCompare()` causa `TypeError` em runtime.

### I.1 Seleção de Unidades — Componente Canônico

```
⚠️ REGRA: Toda seleção de unidade de medida (KRs, KPIs, Wizards) DEVE usar o componente UnitSelect.
```

| ✅ CORRETO | ❌ PROIBIDO |
|------------|-------------|
| `<UnitSelect value={unit} onChange={setUnit} />` | `<Select>` inline com opções hardcoded |
| `import { UNIT_CATEGORIES } from "@/shared/constants/units"` | Constante `UNITS` local em arquivo de wizard |
| `getUnitLabel(value)` para exibição | Switch/if-else para mapear labels |

**Categorias disponíveis:**
- Financeiro (R$, R$ mil, R$ milhão)
- Volume/Quantidade (Número, Clientes, Leads, etc.)
- Experiência/Qualidade (NPS, Score, Índice)
- Tempo (Dias, Horas, Minutos)
- Taxas (%, p.p.)
- Customizada (input livre)

> 📚 Ver: [UI_COMPONENTS_REGISTRY.md - UnitSelect](./UI_COMPONENTS_REGISTRY.md#64-unitselect)

### I.2 User Directory Global — Contrato Inquebrável

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
| `UnitSelect` | Componente canônico para seleção de unidades de medida |

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

## O. Responsabilidades e Migração

### O.1 Regra de Ouro

```
⚠️ REGRA OBRIGATÓRIA: Toda funcionalidade com ownership DEVE definir comportamento de migração.
```

Toda nova funcionalidade que introduzir ownership ou responsabilidade **DEVE** definir explicitamente como se comporta nos cenários de migração, conforme documentado em [RESPONSIBILITY_MIGRATION_POLICY.md](./RESPONSIBILITY_MIGRATION_POLICY.md).

### O.2 Cenários Cobertos

| Cenário | Hook de Validação | Comportamento |
|---------|-------------------|---------------|
| Remoção de usuário da BU | `useUserDependencies` | Transferir dependências mandatórias, auto-clear opcionais |
| Exclusão de time | `useTeamDependencies` | BLOQUEADO se OKRs ativos ou subtimes existem |
| Exclusão de área | `useAreaDependencies` | BLOQUEADO se times vinculados existem |
| Mudança de líder | `useUserDependencies` | SET NULL automático (opcional) |

### O.3 Tipos de Dependência

| Tipo | Comportamento | Exemplos |
|------|---------------|----------|
| **Mandatória** | BLOQUEIA ação até resolução | KPIs, OKRs, Tickets, Iniciativas |
| **Opcional** | Auto-cleared (SET NULL) | Liderança de time/área, co-responsabilidades |

### O.4 Checklist para Novas Features

Toda feature com ownership deve responder:

- [ ] Define coluna de ownership (`owner_user_id` ou similar)?
- [ ] Está registrada em `useUserDependencies`?
- [ ] É dependência **mandatória** (bloqueia) ou **opcional** (auto-clear)?
- [ ] Mutation de transferência está em `useTransferDependencies`?
- [ ] Documentada em `RESPONSIBILITY_MIGRATION_POLICY.md`?

### O.5 Implementação

```typescript
// ✅ CORRETO: Hook de delete verifica dependências
export function useDeleteTeam() {
  return useMutation({
    mutationFn: async (teamId: string) => {
      // 1. Verificar dependências mandatórias
      const deps = await checkTeamDependencies(teamId);
      if (deps.totalMandatory > 0) {
        throw new Error("TEAM_HAS_DEPENDENCIES");
      }
      // 2. Auto-clear opcionais
      await clearOptionalDependencies(teamId);
      // 3. Soft delete
      await softDeleteTeam(teamId);
    },
  });
}

// ✅ CORRETO: Dialog mostra dependências antes de permitir ação
<TeamDependenciesDialog 
  teamId={teamId}
  onResolved={() => deleteTeam.mutate(teamId)}
/>
```

> 📚 Ver: [RESPONSIBILITY_MIGRATION_POLICY.md](./RESPONSIBILITY_MIGRATION_POLICY.md)

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](./TECHNICAL_CONTEXT_REGISTRY.md) | Visão completa do sistema |
| [IDENTITY_CONVENTION.md](./IDENTITY_CONVENTION.md) | Convenção auth vs profiles |
| [RBAC_TEMPLATES_V3.md](./RBAC_TEMPLATES_V3.md) | Sistema de permissões V2 |
| [URL_STATE_STANDARD.md](../guides/URL_STATE_STANDARD.md) | Padrão de URL state |
| [BU_SCOPED_SUPABASE_RULES.md](./BU_SCOPED_SUPABASE_RULES.md) | Regras de cliente Supabase |
| [QUERY_KEYS_STANDARD.md](./QUERY_KEYS_STANDARD.md) | Padrão de query keys |
| [TESTING_GUIDE.md](../guides/TESTING_GUIDE.md) | Guia de testes automatizados |
| [RESPONSIBILITY_MIGRATION_POLICY.md](./RESPONSIBILITY_MIGRATION_POLICY.md) | Política de migração de responsabilidades |

---

## U. Progress Overachievement Display (v1.26.0)

**Regra inquebrável:** Nunca limitar o **CÁLCULO** de progresso a 100%. Limitar apenas a **BARRA VISUAL**. O label deve exibir o valor real.

### Padrão Visual

```text
Se progress > 100%:
  - Barra:  width = Math.min(100, progress)% (visual cap)
  - Label:  "156%" em cor text-status-green + font-medium
  - Emoji:  🚀 após o percentual
  - Badge (quando aplicável): "Meta superada" (bg-status-green/15, text-status-green)

Se progress <= 100%:
  - Comportamento normal (sem alterações)
```

### Fonte de verdade

- `calculateProgress()` em `src/modules/okrs/utils/progressCalculation.ts` — NÃO limita a 100%
- `OkrProgressBar` — Componente de referência com tratamento completo de superação

### Anti-patterns

```typescript
// ❌ PROIBIDO: Limitar cálculo
const progress = Math.min(100, ((current - baseline) / (target - baseline)) * 100);

// ✅ CORRETO: Permitir superação no cálculo
const progress = Math.max(0, ((current - baseline) / (target - baseline)) * 100);

// ✅ CORRETO: Limitar apenas a barra visual
<Progress value={Math.min(100, progress)} />
// ou
style={{ width: `${Math.min(100, progress)}%` }}
```
