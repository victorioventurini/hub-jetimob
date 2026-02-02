# UI Components Registry — Hub da Jet

**Versão:** 1.1.0  
**Última atualização:** 2026-02-02  
**Status:** Normativo  
**Referência:** TCR v2.75.0 / DEVELOPMENT_STANDARDS v1.17.0

---

## Índice

- [1. Filosofia](#1-filosofia)
- [2. Design System](#2-design-system)
- [3. Componentes Core](#3-componentes-core)
- [4. Componentes de Estado](#4-componentes-de-estado)
- [5. Componentes de Layout](#5-componentes-de-layout)
- [6. Componentes de Seleção](#6-componentes-de-seleção)
- [7. Padrões Obrigatórios](#7-padrões-obrigatórios)
- [8. Anti-patterns](#8-anti-patterns)

---

## 1. Filosofia

O Hub utiliza **shadcn/ui** como base, com customizações semânticas para:
- **Consistência visual** entre módulos
- **Acessibilidade** (WCAG 2.1 AA)
- **Tokens semânticos** para temas light/dark
- **Componentes DRY** com variants pré-definidos

> ⚠️ **Regra de Ouro:** Usar componentes canônicos. Nunca recriar padrões existentes.

---

## 2. Design System

### 2.1 Tokens Semânticos (index.css)

Todos os tokens estão definidos em HSL para compatibilidade com Tailwind:

| Categoria | Tokens Disponíveis |
|-----------|-------------------|
| **Status RAG** | `--status-green`, `--status-yellow`, `--status-red`, `--status-gray` |
| **Status Adicionais** | `--status-blue`, `--status-purple`, `--status-pink`, `--status-orange`, `--status-amber`, `--status-indigo`, `--status-cyan`, `--status-slate` |
| **Estados** | `--success`, `--warning`, `--danger`, `--info` (com variantes `-muted` e `-foreground`) |
| **Superfícies de Permissão** | `--surface-view`, `--surface-operate`, `--surface-administer`, `--surface-restricted` |
| **Sidebar** | `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent` |

### 2.2 Uso Correto de Cores

```tsx
// ✅ CORRETO: Tokens semânticos
<Badge className="bg-status-green text-status-green-foreground">Ativo</Badge>
<Badge className="bg-success-muted text-success-muted-foreground">Concluído</Badge>

// ❌ PROIBIDO: Cores hardcoded
<Badge className="bg-green-500 text-white">Ativo</Badge>
<span className="text-red-600">Erro</span>
```

---

## 3. Componentes Core

### 3.1 Button

**Arquivo:** `src/components/ui/button.tsx`

O componente Button possui props para loading state integrado:

```tsx
interface ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "accent" | "success";
  size?: "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg" | "icon-touch";
  isLoading?: boolean;      // Mostra spinner e desabilita
  loadingText?: string;     // Texto alternativo durante loading
  asChild?: boolean;        // Para compor com Link
}
```

**Uso correto:**

```tsx
// ✅ Loading state com prop
<Button isLoading={mutation.isPending} loadingText="Salvando...">
  Salvar
</Button>

// ✅ Navegação com Link
<Button asChild>
  <Link to="/destino">Ir para destino</Link>
</Button>

// ❌ PROIBIDO: Loader manual
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="animate-spin" />}
  Salvar
</Button>
```

### 3.2 StatusBadge

**Arquivo:** `src/components/ui/status-badge.tsx`

Para exibir status RAG (Red/Amber/Green):

```tsx
<StatusBadge status="green">Em dia</StatusBadge>
<StatusBadge status="yellow">Atenção</StatusBadge>
<StatusBadge status="red">Atrasado</StatusBadge>
<StatusBadge status="gray">Não iniciado</StatusBadge>
```

### 3.3 StatusIndicator

**Arquivo:** `src/components/ui/status-indicator.tsx`

Para indicadores inline de estado:

```tsx
<StatusIndicator variant="success" />
<StatusIndicator variant="warning" withLabel label="Atenção" />
<StatusIndicator variant="danger" size="lg" />
```

---

## 4. Componentes de Estado

### 4.1 LoadingState

**Arquivo:** `src/components/ui/loading-state.tsx`

Estado de carregamento para páginas e seções:

```tsx
// Full page loading
<LoadingState fullPage text="Carregando dados..." />

// Section loading
<LoadingState text="Buscando..." />

// Spinner inline
<LoadingSpinner size="sm" text="Aguarde" />
```

### 4.2 EmptyState

**Arquivo:** `src/components/ui/empty-state.tsx`

Estado vazio com variants contextuais:

```tsx
// Busca sem resultados
<EmptyState variant="search" />

// Filtros muito restritivos
<EmptyState variant="filter" />

// Primeiro uso - com CTA
<EmptyState 
  variant="firstUse" 
  title="Crie seu primeiro objetivo"
  actionLabel="+ Novo Objetivo"
  onAction={() => setIsDialogOpen(true)}
/>

// Sem permissão
<EmptyState variant="noPermission" />
```

### 4.3 ErrorState

**Arquivo:** `src/components/ui/error-state.tsx`

Para exibir erros com opção de retry:

```tsx
<ErrorState 
  title="Falha ao carregar" 
  message={error.message}
  onRetry={() => refetch()}
/>
```

### 4.4 SkeletonList / SkeletonTable / SkeletonCard

**Arquivo:** `src/components/ui/loading-state.tsx`

Skeletons para diferentes layouts:

```tsx
<SkeletonList count={5} variant="row" showAvatar />
<SkeletonTable rows={10} columns={4} />
<SkeletonCard lines={3} showAvatar />
```

---

## 5. Componentes de Layout

### 5.1 PageHeader

**Arquivo:** `src/components/ui/page-header.tsx`

Header padronizado para páginas:

```tsx
// Com botão de voltar
<PageHeader
  title="Detalhes do Ticket"
  description="Visualize e gerencie este ticket"
  backTo="/tickets"
  backLabel="Voltar para Tickets"
  actions={<Button>Editar</Button>}
/>

// Com breadcrumbs
<PageHeader
  title="Configurações"
  breadcrumbs={[
    { label: "Settings", href: "/settings" },
    { label: "Integrações" }
  ]}
/>
```

### 5.2 SectionHeader

**Arquivo:** `src/components/ui/section-header.tsx`

Header para seções dentro de cards:

```tsx
<SectionHeader 
  title="Membros do Time" 
  actions={<Button size="sm">+ Adicionar</Button>}
/>
```

### 5.3 ListPageFilters

**Arquivo:** `src/components/ui/list-page-filters.tsx`

Barra de filtros padronizada para listagens:

```tsx
<ListPageFilters>
  <UrlSearchInput placeholder="Buscar..." />
  <StatusFilter />
  <TeamSelect />
</ListPageFilters>
```

---

## 6. Componentes de Seleção

### 6.1 BuUserSelect

**Arquivo:** `src/components/selects/BuUserSelect.tsx`

Componente canônico **obrigatório** para seleção de usuários internos da BU. Usa a view `v_bu_active_profiles` via `useBuUsersDirectory`.

**Regra inquebrável:** Mostra TODOS os usuários cadastrados na BU, independentemente de primeiro login, onboarding ou membership.

```tsx
// ✅ CORRETO: Componente canônico
<BuUserSelect
  value={userId}
  onValueChange={(id) => setUserId(id)}
  placeholder="Selecione o responsável"
  teamId={teamId}       // Opcional: filtra por time
  showBadges={true}     // Mostra badges de status (pendente, sem acesso)
  allowNone={true}      // Permite opção "Nenhum"
/>

// ❌ PROIBIDO: Select manual com map de usuários
<Select value={userId} onValueChange={setUserId}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    {users.map(user => (
      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Props disponíveis:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `value` | `string \| undefined` | ID do usuário selecionado |
| `onValueChange` | `(id: string \| null) => void` | Callback de mudança |
| `placeholder` | `string` | Placeholder do select |
| `teamId` | `string` | Filtra usuários por time |
| `showBadges` | `boolean` | Mostra badges de onboarding/acesso |
| `excludeUserIds` | `string[]` | IDs a excluir da lista |
| `allowNone` | `boolean` | Permite opção "Nenhum" |
| `noneLabel` | `string` | Label para opção nenhum |
| `disabled` | `boolean` | Desabilita o componente |

### 6.2 BuUserMultiSelect

**Arquivo:** `src/components/selects/BuUserMultiSelect.tsx`

Para seleção múltipla de usuários internos.

```tsx
<BuUserMultiSelect
  selectedIds={userIds}
  onSelectionChange={setUserIds}
  teamId={teamId}
/>
```

### 6.3 TeamSelect

**Arquivo:** `src/components/selects/TeamSelect.tsx`

Para seleção de times/squads da BU.

```tsx
<TeamSelect
  value={teamId}
  onValueChange={setTeamId}
  placeholder="Selecione o time"
/>
```

---

## 7. Padrões Obrigatórios

### 6.1 Navegação

```tsx
// ✅ CORRETO: Usar Link para navegação
<Button asChild>
  <Link to="/destino">Navegar</Link>
</Button>

// ✅ CORRETO: Usar Link direto
<Link to="/destino" className="text-sm hover:underline">
  Ver detalhes
</Link>

// ❌ PROIBIDO: onClick + navigate
<Button onClick={() => navigate('/destino')}>
  Navegar
</Button>
```

**Exceções permitidas:**
- `AuthCallback.tsx` (redirect após validação de token)
- Handlers que precisam executar lógica antes de navegar

### 6.2 Loading em Buttons

```tsx
// ✅ CORRETO: Props do Button
<Button isLoading={isPending} loadingText="Salvando...">
  Salvar
</Button>

// ❌ PROIBIDO: Loader2 manual
<Button disabled={isPending}>
  {isPending && <Loader2 className="animate-spin" />}
  Salvar
</Button>
```

### 6.3 Estados de Loading de Página

```tsx
// ✅ CORRETO: Componente canônico
if (isLoading) {
  return <LoadingState fullPage text="Carregando..." />;
}

// ❌ PROIBIDO: Estrutura manual
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );
}
```

### 6.4 Estados Vazios

```tsx
// ✅ CORRETO: EmptyState com variant
{items.length === 0 && !isLoading && (
  <EmptyState variant="search" />
)}

// ❌ PROIBIDO: Estrutura manual
{items.length === 0 && (
  <div className="text-center py-8">
    <p>Nenhum item encontrado</p>
  </div>
)}
```

---

## 8. Anti-patterns

| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 1 | `onClick={() => navigate(...)}` em buttons | `<Button asChild><Link to="..." /></Button>` |
| 2 | `{isLoading && <Loader2 />}` dentro de Button | `<Button isLoading={isLoading} />` |
| 3 | Estrutura de loading manual | `<LoadingState />` |
| 4 | Cores hardcoded (`text-green-500`) | Tokens semânticos (`text-success`) |
| 5 | Estado vazio manual | `<EmptyState variant="..." />` |
| 6 | Skeleton inline | `<SkeletonList />` ou `<SkeletonCard />` |
| 7 | Select manual para usuários | `<BuUserSelect />` |
| 8 | Map de usuários em SelectItem | `<BuUserSelect teamId={...} />` |

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.1.0 | 2026-02-02 | Adicionada seção de Componentes de Seleção (BuUserSelect, BuUserMultiSelect, TeamSelect) |
| 1.0.0 | 2026-01-31 | Criação inicial com padrões de Button, LoadingState, EmptyState |

---

*Documento mantido pela equipe de Engenharia. Atualizações devem ser refletidas no TCR.*
