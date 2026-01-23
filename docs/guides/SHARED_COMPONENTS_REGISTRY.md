# Shared Components & Utilities Registry

**Versão:** 1.4.0  
**Última atualização:** 2026-01-15  
**Status:** Normativo  
**Referência:** TCR v2.37.0

---

## Visão Geral

Este documento define **TODOS** os componentes e utilitários canônicos do Hub da Jet. É a fonte única de verdade para reutilização de código.

```
⚠️ REGRAS INVIOLÁVEIS:
1. NÃO reimplemente componentes/utils que já existem aqui
2. PR que introduz duplicação clara será BLOQUEADA
3. Novos componentes compartilháveis DEVEM ser adicionados a este registry
```

---

## Índice

1. [Componentes de Layout de Página](#1-componentes-de-layout-de-página)
2. [Componentes de Estado](#2-componentes-de-estado)
3. [Componentes de Visualização](#3-componentes-de-visualização)
4. [Componentes de Filtro](#4-componentes-de-filtro)
5. [Componentes de Seleção de Usuário](#5-componentes-de-seleção-de-usuário)
6. [Utilitários de Query](#6-utilitários-de-query)
7. [Utilitários de Supabase](#7-utilitários-de-supabase)
8. [Utilitários de Identity](#8-utilitários-de-identity)
9. [Utilitários de URL State](#9-utilitários-de-url-state)
10. [Utilitários de Links Compartilháveis](#10-utilitários-de-links-compartilháveis)
11. [Utilitários de Telefone](#11-utilitários-de-telefone)
12. [Sistema de Links Salvos](#12-sistema-de-links-salvos)
13. [Anti-Patterns Proibidos](#13-anti-patterns-proibidos)

---

## 1. Componentes de Layout de Página

### PageHeader

**Caminho:** `src/components/ui/page-header.tsx`

**Uso:**
```tsx
import { PageHeader } from "@/components/ui/page-header";

<PageHeader
  title="Título da Página"
  description="Descrição opcional"
  actions={<Button>Ação</Button>}
/>
```

**Props:**
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `title` | `string` | ✅ | Título principal (H1) |
| `description` | `string` | ❌ | Subtítulo/descrição |
| `actions` | `React.ReactNode` | ❌ | Botões de ação à direita |
| `className` | `string` | ❌ | Classes CSS adicionais |

**Anti-pattern:**
```tsx
// ❌ PROIBIDO: Criar headers customizados
<div className="flex justify-between mb-6">
  <div>
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p className="text-muted-foreground">{description}</p>
  </div>
  <Button>...</Button>
</div>

// ✅ CORRETO: Usar PageHeader
<PageHeader title={title} description={description} actions={<Button>...</Button>} />
```

---

## 2. Componentes de Estado

### LoadingState

**Caminho:** `src/components/ui/loading-state.tsx`

**Variantes exportadas:**
- `LoadingSpinner` - Spinner simples
- `LoadingState` - Estado full page/section
- `SkeletonCard` - Skeleton de card
- `SkeletonList` - Skeleton de lista
- `SkeletonTable` - Skeleton de tabela

**Uso:**
```tsx
import { LoadingState, LoadingSpinner, SkeletonCard } from "@/components/ui/loading-state";

// Full page loading
if (isLoading) return <LoadingState text="Carregando dados..." />;

// Inline spinner
<LoadingSpinner size="sm" text="Salvando..." />

// Skeleton
<SkeletonCard />
```

### EmptyState

**Caminho:** `src/components/ui/empty-state.tsx`

**Uso:**
```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { FileX } from "lucide-react";

<EmptyState
  icon={FileX}
  title="Nenhum item encontrado"
  description="Não há itens para exibir"
  actionLabel="Criar primeiro"
  onAction={() => setOpen(true)}
/>
```

**Props:**
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `icon` | `LucideIcon` | ✅ | Ícone do Lucide |
| `title` | `string` | ✅ | Título do estado vazio |
| `description` | `string` | ✅ | Descrição explicativa |
| `actionLabel` | `string` | ❌ | Label do botão de ação |
| `onAction` | `() => void` | ❌ | Handler do botão |
| `compact` | `boolean` | ❌ | Versão compacta |

### ErrorState

**Caminho:** `src/components/ui/error-state.tsx`

**Uso:**
```tsx
import { ErrorState } from "@/components/ui/error-state";

if (error) return (
  <ErrorState
    title="Erro ao carregar"
    description={error.message}
    onRetry={refetch}
    onBack={() => navigate(-1)}
  />
);
```

---

## 3. Componentes de Visualização

### StatusBadge

**Caminho:** `src/components/ui/status-badge.tsx`

**Uso:**
```tsx
import { StatusBadge } from "@/components/ui/status-badge";

<StatusBadge variant="success">Ativo</StatusBadge>
<StatusBadge variant="warning">Pendente</StatusBadge>
<StatusBadge variant="destructive">Inativo</StatusBadge>
<StatusBadge variant="outline">Rascunho</StatusBadge>
```

**Variantes:**
- `default` - Cinza neutro
- `success` - Verde (sucesso/ativo)
- `warning` - Amarelo (pendente/atenção)
- `destructive` - Vermelho (erro/inativo)
- `outline` - Borda sem preenchimento

### StatusDot

**Caminho:** `src/components/ui/status-badge.tsx`

**Uso:**
```tsx
import { StatusDot } from "@/components/ui/status-badge";

<StatusDot variant="success" />
<span>Online</span>
```

---

## 4. Componentes de Filtro

### FilterBar

**Caminho:** `src/components/ui/filter-bar.tsx`

**Uso:**
```tsx
import { FilterBar } from "@/components/ui/filter-bar";

<FilterBar showClear={hasFilters} onClearAll={clearFilters}>
  <Badge variant="secondary">Status: Ativo</Badge>
  <Badge variant="secondary">Time: Vendas</Badge>
</FilterBar>
```

### UrlFilterBar

**Caminho:** `src/shared/filters/UrlFilterBar.tsx`

**Uso:**
```tsx
import { UrlFilterBar, type ActiveFilter } from "@/shared/filters/UrlFilterBar";

const activeFilters: ActiveFilter[] = [
  { key: "status", label: "Status", value: "active", displayValue: "Ativo" },
];

<UrlFilterBar
  activeFilters={activeFilters}
  onRemoveFilter={(key) => removeParam(key)}
  onClearAll={clearAllParams}
>
  {/* Filter controls slot */}
  <StatusSelect ... />
</UrlFilterBar>
```

### FilterSection

**Caminho:** `src/components/ui/filter-bar.tsx`

**Uso:**
```tsx
import { FilterSection } from "@/components/ui/filter-bar";

<FilterSection label="Status">
  <Select ... />
</FilterSection>
```

---

## 5. Componentes de Seleção de Usuário

### BuUserSelect

**Caminho:** `src/components/selects/BuUserSelect.tsx`

**REGRA INQUEBRÁVEL:** Use SEMPRE este componente para seleção de usuário único.

**Uso:**
```tsx
import { BuUserSelect } from "@/components/selects/BuUserSelect";

<BuUserSelect
  value={ownerId}
  onValueChange={setOwnerId}
  placeholder="Selecione o responsável"
  showBadges={true}
/>
```

**Props:**
| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `value` | `string \| undefined` | ✅ | ID do usuário selecionado |
| `onValueChange` | `(id: string) => void` | ✅ | Handler de mudança |
| `placeholder` | `string` | ❌ | Texto placeholder |
| `excludeUserIds` | `string[]` | ❌ | IDs a excluir |
| `showBadges` | `boolean` | ❌ | Mostrar badges de status |
| `teamId` | `string` | ❌ | Filtrar por time |

### BuUserMultiSelect

**Caminho:** `src/components/selects/BuUserMultiSelect.tsx`

**REGRA INQUEBRÁVEL:** Use SEMPRE este componente para seleção múltipla de usuários.

**Uso:**
```tsx
import { BuUserMultiSelect } from "@/components/selects/BuUserMultiSelect";

<BuUserMultiSelect
  value={memberIds}
  onValueChange={setMemberIds}
  placeholder="Selecione membros"
/>
```

---

## 6. Utilitários de Query

### queryKeys

**Caminho:** `src/lib/queryKeys.ts`

**REGRA INQUEBRÁVEL:** Todas as query keys DEVEM vir deste arquivo.

**Uso:**
```tsx
import { queryKeys } from "@/lib/queryKeys";

// Listar
useQuery({
  queryKey: queryKeys.tickets.list(buId, { status, assigneeId }),
  ...
});

// Detalhe
useQuery({
  queryKey: queryKeys.tickets.detail(buId, ticketId),
  ...
});

// Invalidar
queryClient.invalidateQueries({ 
  queryKey: queryKeys.tickets.list(buId) 
});
```

**Anti-pattern:**
```tsx
// ❌ PROIBIDO: Query keys hardcoded
useQuery({ queryKey: ["tickets", buId, status], ... });

// ✅ CORRETO: Usar queryKeys
useQuery({ queryKey: queryKeys.tickets.list(buId, { status }), ... });
```

---

## 7. Utilitários de Supabase

### useBuScopedSupabase

**Caminho:** `src/integrations/supabase/useBuScopedSupabase.ts`

**REGRA INQUEBRÁVEL:** Todo dado operacional DEVE usar este hook.

**Uso:**
```tsx
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";

function useTickets() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.tickets.list(buId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, status");
      if (error) throw error;
      return data;
    },
  });
}
```

### Cliente Global (PRE-BU only)

**Caminho:** `src/integrations/supabase/globalClient.ts`

**Uso APENAS para:**
- `auth.*` operations
- `profiles` sem BU (onboarding)
- `bu_units`, `bu_user_memberships` (listagem pré-seleção)

```tsx
import { supabase } from "@/integrations/supabase/globalClient";

// ✅ CORRETO: Auth
const { data } = await supabase.auth.getSession();

// ❌ PROIBIDO: Dados operacionais com cliente global
const { data } = await supabase.from("tickets").select("*"); // ERRADO!
```

---

## 8. Utilitários de Identity

### idTypes

**Caminho:** `src/lib/idTypes.ts`

**Tipos exportados:**
- `ProfileId` - ID de `profiles.id`
- `AuthUserId` - ID de `auth.users.id`

**Funções exportadas:**
- `asProfileId(id)` - Cast para ProfileId
- `asAuthUserId(id)` - Cast para AuthUserId
- `fromProfileToAuthId(profileId)` - Conversão (async)
- `fromAuthToProfileId(authUserId)` - Conversão (async)

**Uso:**
```tsx
import { asProfileId, type ProfileId } from "@/lib/idTypes";

// Ao receber de domínio (owner_user_id, assignee_id, etc.)
const ownerId = asProfileId(ticket.owner_user_id);

// Props tipadas
interface Props {
  userId: ProfileId; // Garante que é profile.id
}
```

### useIdentity / useProfileId

**Caminho:** `src/hooks/useIdentity.ts`

**Interface:**
```tsx
interface UserIdentity {
  userId: string | null;         // auth.users.id efetivo (respeita impersonação)
  profileId: string | null;      // profiles.id efetivo (respeita impersonação)
  realUserId: string | null;     // auth.users.id sempre o usuário real
  realProfileId: string | null;  // profiles.id sempre o usuário real
  isLoading: boolean;
}
```

**Uso:**
```tsx
import { useIdentity, useProfileId } from "@/hooks/useIdentity";

// Completo (com suporte a impersonação)
const { 
  userId,         // Efetivo (impersonado ou real)
  profileId,      // Efetivo (impersonado ou real)
  realUserId,     // Sempre o real
  realProfileId,  // Sempre o real
  isLoading 
} = useIdentity();

// ✅ LEITURA: usa profileId (respeita impersonação)
const { data } = useQuery({
  queryKey: ["my-okrs", profileId],
  queryFn: () => supabase.from("okrs").select("*").eq("owner_user_id", profileId),
});

// ✅ MUTATIONS: usa realProfileId (sempre o real)
await supabase.from("okrs").insert({
  owner_user_id: realProfileId,
  ...data,
});

// Simplificado (só profile efetivo)
const profileId = useProfileId();
```

### useOptionalImpersonation

**Caminho:** `src/hooks/useImpersonation.ts`

**Uso:**
```tsx
import { useOptionalImpersonation } from "@/hooks/useImpersonation";

// Retorna null se fora do contexto de impersonação
const impersonation = useOptionalImpersonation();

if (impersonation?.isImpersonating) {
  const targetProfileId = impersonation.targetProfile?.id;
}
```

---

## 9. Utilitários de URL State

### useUrlState

**Caminho:** `src/shared/url/useUrlState.ts`

**Hooks exportados:**
- `useUrlState(key, defaultValue)` - Estado single
- `useUrlStates(config)` - Estados múltiplos
- `useUrlTab(defaultTab)` - Tabs
- `useUrlSearch()` - Busca
- `useUrlArrayParam(key)` - Arrays
- `useUrlDateRange()` - Range de datas

**Uso:**
```tsx
import { useUrlState, useUrlTab, useUrlSearch } from "@/shared/url";

// Tab
const [tab, setTab] = useUrlTab("overview");

// Busca
const [search, setSearch] = useUrlSearch();

// Filtro genérico
const [status, setStatus] = useUrlState("status", "all");

// Múltiplos estados
const { status, teamId, setParams } = useUrlStates({
  status: { default: "all" },
  teamId: { default: undefined },
});
```

**Anti-pattern:**
```tsx
// ❌ PROIBIDO: useState para filtros
const [status, setStatus] = useState("all");

// ✅ CORRETO: useUrlState
const [status, setStatus] = useUrlState("status", "all");
```

---

## 10. Utilitários de Links Compartilháveis

### shareableLinks

**Caminho:** `src/lib/shareableLinks.ts`

**Funções exportadas:**
- `getShareableUrl(entity, id)` - URL relativa `/go/:entity/:id`
- `getShareableAbsoluteUrl(entity, id)` - URL absoluta

**Uso:**
```tsx
import { getShareableUrl, getShareableAbsoluteUrl } from "@/lib/shareableLinks";

// Para navegação interna
<Link to={getShareableUrl("ticket", ticketId)}>Ver ticket</Link>

// Para compartilhar externamente
const url = getShareableAbsoluteUrl("asset", assetId);
await navigator.clipboard.writeText(url);
```

---

## 11. Utilitários de Telefone

### phone

**Caminho:** `src/lib/phone.ts`

**Funções exportadas:**
- `normalizePhone(phone)` - Normaliza para dígitos (armazenamento)
- `formatPhoneDisplay(phone)` - Formata para exibição
- `formatPhoneInput(value)` - Máscara de input
- `isValidPhone(phone)` - Validação
- `getWhatsAppUrl(phone)` - Link WhatsApp

**Uso:**
```tsx
import { 
  normalizePhone, 
  formatPhoneDisplay, 
  formatPhoneInput,
  isValidPhone,
  getWhatsAppUrl 
} from "@/lib/phone";

// Salvar no banco
const phoneToStore = normalizePhone(userInput); // "5551999999999"

// Exibir
<span>{formatPhoneDisplay(profile.whatsapp_personal)}</span>
// "+55 (51) 99999-9999"

// Input com máscara
<Input
  value={phone}
  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
/>

// WhatsApp link
<a href={getWhatsAppUrl(phone)}>Enviar mensagem</a>
```

---

## 12. Sistema de Links Salvos

**Caminho:** `src/shared/saved-links/`

**Barrel export:** `src/shared/saved-links/index.ts`

### Hooks

| Hook | Descrição |
|------|-----------|
| `useSavedLinks({ moduleSlug })` | CRUD de links salvos do módulo |
| `useModuleFavoriteLink({ moduleSlug })` | Busca apenas o favorito (leve) |
| `useFavoriteLinks()` | Busca todos os favoritos (usado pelo sidebar) |

### Componentes

| Componente | Descrição |
|------------|-----------|
| `SavedLinksPopover` | Popover para gerenciar links salvos |
| `SaveLinkDialog` | Modal para criar novo link |

### Uso

```tsx
import { SavedLinksPopover, useSavedLinks, useFavoriteLinks } from "@/shared/saved-links";

// No header de uma página de módulo
<PageHeader
  title="OKRs"
  actions={
    <div className="flex gap-2">
      <SavedLinksPopover moduleSlug="okrs" />
      <Button>Novo</Button>
    </div>
  }
/>

// No sidebar para obter href favorito
const { getFavoriteHref } = useFavoriteLinks();
const href = getFavoriteHref("okrs", "/okrs"); // retorna path favorito ou fallback
```

### Regras

- **Só 1 favorito por módulo/BU** (enforced por trigger no banco)
- Link favorito se torna destino padrão no sidebar
- Usuário pode criar quantos links quiser
- RLS: usuário só vê seus próprios links

---

## 13. Anti-Patterns Proibidos

### Reimplementação de Componentes

```tsx
// ❌ PROIBIDO: Loading spinner customizado
<div className="flex items-center justify-center">
  <Loader2 className="animate-spin" />
  <span>Carregando...</span>
</div>

// ✅ CORRETO: Usar LoadingState
<LoadingState text="Carregando..." />
```

### Headers de Página Inline

```tsx
// ❌ PROIBIDO: Header inline
<div className="flex justify-between mb-6">
  <h1 className="text-2xl font-bold">Tickets</h1>
  <Button>Novo</Button>
</div>

// ✅ CORRETO: PageHeader
<PageHeader title="Tickets" actions={<Button>Novo</Button>} />
```

### Query Keys Hardcoded

```tsx
// ❌ PROIBIDO: Query key literal
useQuery({ queryKey: ["tickets", buId], ... });

// ✅ CORRETO: queryKeys factory
useQuery({ queryKey: queryKeys.tickets.list(buId), ... });
```

### Select de Usuário Customizado

```tsx
// ❌ PROIBIDO: Select de usuário manual
<Select>
  {users.map(u => <SelectItem key={u.id}>{u.name}</SelectItem>)}
</Select>

// ✅ CORRETO: BuUserSelect
<BuUserSelect value={userId} onValueChange={setUserId} />
```

### useState para Filtros/Tabs

```tsx
// ❌ PROIBIDO: useState para filtros
const [tab, setTab] = useState("overview");
const [status, setStatus] = useState("all");

// ✅ CORRETO: useUrlState
const [tab, setTab] = useUrlTab("overview");
const [status, setStatus] = useUrlState("status", "all");
```

### Cliente Global para Dados Operacionais

```tsx
// ❌ PROIBIDO: Cliente global para dados de BU
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("tickets").select("*");

// ✅ CORRETO: Cliente BU-scoped
const supabase = useBuScopedSupabase();
const { data } = await supabase.from("tickets").select("id, title");
```

---

## Referências

| Documento | Descrição |
|-----------|-----------|
| [TECHNICAL_CONTEXT_REGISTRY.md](../TECHNICAL_CONTEXT_REGISTRY.md) | Fonte de verdade do sistema |
| [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) | Padrões de desenvolvimento |
| [COMPLIANCE_BASELINE.md](./COMPLIANCE_BASELINE.md) | Audits obrigatórios |

---

## Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.4.0 | 2026-01-15 | Saved Links expandido para Assets; Áreas movido para /settings/areas |
| 1.3.0 | 2026-01-15 | Sistema de Links Salvos adicionado |
| 1.2.0 | 2026-01-14 | Hooks Consolidation Wave |
| 1.0.0 | 2026-01-09 | Versão inicial |
