# UI Components Registry — Hub da Jet

**Versão:** 1.6.0  
**Última atualização:** 2026-02-06  
**Status:** Normativo  
**Referência:** TCR v2.94.0 / DEVELOPMENT_STANDARDS v1.20.0

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
- [9. Focus Recovery (Radix UI)](#9-focus-recovery-radix-ui)

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

Header padronizado para páginas. **Este é o ÚNICO componente que deve renderizar breadcrumbs.**

> ⚠️ **REGRA INQUEBRÁVEL:** Cada página deve ter **EXATAMENTE UM** `PageHeader`. Nunca use `GlobalBreadcrumb`, `TicketsBreadcrumb`, `OkrBreadcrumb` ou outros presets de breadcrumb separadamente — use a prop `breadcrumbs` do `PageHeader`.

```tsx
// ✅ CORRETO: PageHeader com breadcrumbs integrados
<PageHeader
  title="Configurações de Tickets"
  description="Configure empresas parceiras e categorias"
  breadcrumbs={[
    { label: "Tickets", href: "/tickets" },
    { label: "Configurações" }
  ]}
/>

// ✅ CORRETO: Com botão de voltar (alternativa a breadcrumbs)
<PageHeader
  title="Detalhes do Ticket"
  description="Visualize e gerencie este ticket"
  backTo="/tickets"
  backLabel="Voltar para Tickets"
  actions={<Button>Editar</Button>}
/>

// ❌ PROIBIDO: Breadcrumb separado + PageHeader = duplicação
<TicketsBreadcrumb ticketId={ticket.id} />
<PageHeader title="Detalhes" breadcrumbs={[...]} />

// ❌ PROIBIDO: Múltiplos PageHeaders na mesma página
<PageHeader title="Título 1" />
<PageHeader title="Título 2" />
```

**Props do PageHeader:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `title` | `string` | Título da página (obrigatório) |
| `description` | `ReactNode` | Descrição opcional |
| `breadcrumbs` | `BreadcrumbItem[]` | Items de navegação (Hub é adicionado automaticamente) |
| `backTo` | `string` | Link de voltar (alternativa a breadcrumbs) |
| `backLabel` | `string` | Label do botão voltar |
| `actions` | `ReactNode` | Botões de ação |

**Hierarquia padrão dos breadcrumbs:** Hub → [Módulo] → [Página] → [Detalhe]

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

Barra de filtros padronizada para listagens. Foco exclusivo em busca + filtros inline (todos em uma linha).

```tsx
<ListPageFilters
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar..."
>
  <StatusSelect value={status} onChange={setStatus} />
  <TeamSelect value={team} onChange={setTeam} />
</ListPageFilters>
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `searchValue` | `string` | Valor atual da busca |
| `onSearchChange` | `(value: string) => void` | Callback de mudança |
| `searchPlaceholder` | `string` | Placeholder do campo |
| `searchDebounceMs` | `number` | Debounce em ms (default: 300) |
| `children` | `ReactNode` | Filtros adicionais (selects, etc) |
| `hideSearch` | `boolean` | Oculta o campo de busca |

### 5.4 ViewOptionsBar

**Arquivo:** `src/components/ui/view-options-bar.tsx`

Linha de opções de visualização. Exibe contador de resultados (esquerda) e controles de exibição (direita).

```tsx
<ViewOptionsBar
  resultCount={items.length}
  resultCountLabel="indicadores encontrados"
  resultCountLabelSingular="indicador encontrado"
>
  <KpiViewToggle viewMode={view} onViewModeChange={setView} />
  <SortControl ... />
</ViewOptionsBar>
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `resultCount` | `number` | Número de resultados para exibir contador |
| `resultCountLabel` | `string` | Label plural (default: "itens encontrados") |
| `resultCountLabelSingular` | `string` | Label singular (default: "item encontrado") |
| `children` | `ReactNode` | Controles (ViewToggle, SortControl, etc) |

### 5.5 Layout de Páginas de Listagem

Páginas com listagem de dados devem seguir esta estrutura hierárquica:

1. **PageHeader**: Título, descrição, breadcrumbs, ações principais
2. **Summary Cards** (opcional): Resumo estatístico
3. **ListPageFilters**: Busca + Filtros em uma linha
4. **ViewOptionsBar**: Contador + Toggle de visualização + Ordenação
5. **Content**: Cards, Tabela ou outro formato

```tsx
// ✅ CORRETO: Layout padronizado
<PageHeader
  title="Indicadores"
  breadcrumbs={[{ label: "Indicadores" }]}
  actions={<Button>Novo</Button>}
/>

<SummaryCards {...} />

<ListPageFilters
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar..."
>
  <TypeSelect value={type} onChange={setType} />
  <StatusSelect value={status} onChange={setStatus} />
</ListPageFilters>

<ViewOptionsBar
  resultCount={items.length}
  resultCountLabel="indicadores"
>
  <KpiViewToggle viewMode={view} onViewModeChange={setView} />
</ViewOptionsBar>

<Content />
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
| 9 | Breadcrumb separado + PageHeader | Usar APENAS `PageHeader` com prop `breadcrumbs` |
| 10 | Múltiplos PageHeaders na mesma página | Exatamente UM `PageHeader` por página |
| 11 | `GlobalBreadcrumb` ou presets (`TicketsBreadcrumb`) | `PageHeader` com prop `breadcrumbs` |
| 12 | ViewToggle dentro de `ListPageFilters.actions` | Usar `ViewOptionsBar` separado |
| 13 | Contador de resultados misturado com filtros | Mover para `ViewOptionsBar` |
| 14 | Botão complementar (Organograma, Links Salvos) fora do PageHeader | Mover para `PageHeader.actions` |
| 15 | Label "Ver X" para botões de navegação | Label direto: "Organograma", "Dashboard", "Evolução" |
| 16 | Página de detalhe aninhada em layout com header próprio | Registrar como rota standalone com `HubLayout` próprio |

---

## 9. Focus Recovery (Radix UI)

### 9.1 Problema

Componentes Radix UI (Tooltip, Popover, Dialog, Sheet) manipulam `pointer-events` no body para prevenir interações durante overlays. Quando o usuário troca de aba do navegador durante uma transição, o cleanup pode falhar, deixando a interface bloqueada.

### 9.2 Solução Canônica

O hook `useRadixFocusRecovery` é a solução centralizada para este problema:

**Arquivo:** `src/hooks/useRadixFocusRecovery.ts`

```tsx
// Chamado UMA VEZ no App.tsx (nível raiz)
import { useRadixFocusRecovery } from "@/hooks/useRadixFocusRecovery";

const App = () => {
  useRadixFocusRecovery();
  // ...
};
```

### 9.3 Comportamento

1. Detecta quando a aba volta ao foco (`visibilitychange`, `focus`)
2. Aguarda 100ms para animações do Radix completarem
3. Verifica se há bloqueio real (`pointer-events: none` no body)
4. Só limpa se **NÃO** houver overlay legítimo aberto
5. Não remove elementos DOM (evita race conditions)

### 9.4 Anti-patterns

```tsx
// ❌ PROIBIDO: Cleanup manual em layouts
useEffect(() => {
  document.body.style.pointerEvents = '';
}, [location.pathname]);

// ❌ PROIBIDO: Múltiplos timers de cleanup
const timers = [0, 50, 150, 300].map(delay => 
  setTimeout(cleanup, delay)
);

// ❌ PROIBIDO: Listener de mousemove para cleanup
document.addEventListener('mousemove', () => {
  if (bodyBlocked) cleanup();
});

// ✅ CORRETO: Usar o hook centralizado no App.tsx
useRadixFocusRecovery();
```

### 9.5 Regras

| Regra | Descrição |
|-------|-----------|
| Uma única instância | Chamar apenas no `App.tsx`, nunca em layouts |
| Não remover elementos | Limpar apenas estilos, nunca `element.remove()` |
| Respeitar overlays | Verificar `[data-state="open"]` antes de limpar |

---

## 10. Componentes de Insights

### 10.1 Filosofia

Insights são sinais contextuais de gestão que ajudam usuários a:
- Identificar padrões relevantes
- Tomar decisões informadas
- Aprender com o histórico

**Regra:** Todo wizard e dashboard com dados de OKRs/KPIs DEVE incluir insights contextuais.

### 10.2 Componentes Disponíveis

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `VicInsightCard` | `src/modules/okrs/components/wizards/shared/VicInsightCard.tsx` | Insight individual de IA |
| `VicInsightsList` | Mesmo arquivo | Lista de insights colapsável |
| `KrStateInsightCard` | `src/modules/okrs/components/insights/KrStateInsightCard.tsx` | Insight baseado em estado de KR |
| `KrStateInline` | Mesmo arquivo | Indicador inline de estado |
| `KrStateDistribution` | Mesmo arquivo | Distribuição visual de estados |

### 10.3 Estados de KR Reconhecidos

| Estado | Severidade | Insight |
|--------|------------|---------|
| `not_started` | info | "O foco está claro?" |
| `healthy` | info | "Manter execução" |
| `stagnant` | warning | "O que está travando?" |
| `at_risk` | warning | "Decisão necessária?" |
| `off_track` | critical | "Replanejar?" |
| `achieved` | info | "Algum aprendizado?" |
| `exceeded` | info | "O que aprendemos?" |
| `not_achieved` | warning | "Meta, plano ou execução?" |

### 10.4 Padrão de Uso em Wizards

Todo wizard de OKRs DEVE:
1. Calcular estado das KRs usando `calculateKrState()`
2. Exibir insights contextuais via `KrStateInsightCard` ou `VicInsightCard`
3. Oferecer reflexões guiadas baseadas no estado

```tsx
import { 
  calculateKrState, 
  KrStateInsightCard 
} from '@/modules/okrs/components/insights';

const krState = calculateKrState({
  progress: kr.progress,
  status: kr.status,
  daysSinceCheckin: kr.days_since_checkin,
  cycleEnded: false,
});

<KrStateInsightCard state={krState} krTitle={kr.title} />
```

### 10.5 Anti-patterns

| # | Anti-pattern | Alternativa |
|---|--------------|-------------|
| 1 | Wizard sem insights | Adicionar `KrStateInsightCard` |
| 2 | Insight punitivo | Reescrever com tom de aprendizado |
| 3 | Comparação entre usuários | Focar em padrões, não pessoas |
| 4 | Insights genéricos | Usar contexto específico da KR |

> 📋 **Guia Completo:** [WIZARD_DEVELOPMENT_GUIDE.md](../guides/WIZARD_DEVELOPMENT_GUIDE.md)

---

## 11. Menus de Ações em Tabelas

### 11.1 Padrão Visual

Tabelas devem incluir uma coluna de ações com o ícone de "três pontinhos" (MoreVertical/MoreHorizontal) que abre um DropdownMenu com as opções disponíveis.

### 11.2 Implementação

```tsx
// ✅ CORRETO: Componente de ações com prop alwaysVisible para tabelas
<TableCell>
  <MyActionsMenu item={item} alwaysVisible />
</TableCell>

// ✅ CORRETO: Estrutura base do menu de ações
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 transition-opacity",
        !alwaysVisible && "opacity-0 group-hover:opacity-100"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <MoreVertical className="h-4 w-4" />
      <span className="sr-only">Ações</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
    <DropdownMenuItem onClick={() => setEditOpen(true)}>
      <Edit className="mr-2 h-4 w-4" />
      Editar
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 11.3 Regras

| Regra | Descrição |
|-------|-----------|
| stopPropagation | Sempre chamar `e.stopPropagation()` no trigger e content para evitar acionar onClick da linha |
| Largura fixa | Usar `<TableHead className="w-12" />` para coluna de ações |
| alwaysVisible prop | Adicionar prop para controlar se menu aparece sempre ou só no hover |
| Ações destrutivas | Usar `text-destructive` e sempre confirmar com AlertDialog |

### 11.4 Exemplo de Referência

O componente `KpiActionsMenu` (`src/modules/kpis/components/KpiActionsMenu.tsx`) é a implementação canônica que inclui:
- Prop `alwaysVisible` para controle de visibilidade
- Verificação de permissões (`useCanEditKpi`, `usePermissions`)
- Dialogs de confirmação para ações destrutivas

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.5.0 | 2026-02-04 | Anti-patterns #14 e #15 (botões complementares no PageHeader, labels sem "Ver") |
| 1.4.0 | 2026-02-04 | Adicionada seção 11 - Menus de Ações em Tabelas |
| 1.3.0 | 2026-02-04 | Adicionada seção 10 - Componentes de Insights |
| 1.2.0 | 2026-02-02 | Adicionada seção 9 - Focus Recovery (Radix UI) |
| 1.1.0 | 2026-02-02 | Adicionada seção de Componentes de Seleção (BuUserSelect, BuUserMultiSelect, TeamSelect) |
| 1.0.0 | 2026-01-31 | Criação inicial com padrões de Button, LoadingState, EmptyState |

---

*Documento mantido pela equipe de Engenharia. Atualizações devem ser refletidas no TCR.*
