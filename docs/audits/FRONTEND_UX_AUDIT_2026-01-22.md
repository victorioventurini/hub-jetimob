# Auditoria de Front-End (UX, Consistência, Qualidade)

**Data:** 2026-01-22  
**Versão:** 2.0.0  
**TCR Consultado:** v2.59.0  
**Status:** 📊 ANÁLISE COMPLETA

---

## 📋 Sumário Executivo

O Hub da Jet apresenta **excelente maturidade técnica** no front-end, com design system consolidado, componentes padronizados e arquitetura modular. Esta auditoria identificou oportunidades de polimento para elevar o produto a padrão enterprise.

| Categoria | Crítico (P1) | Importante (P2) | Desejável (P3) |
|-----------|--------------|-----------------|----------------|
| **Cores Hardcoded** | 0 | 3 módulos | ~156 arquivos |
| **Tamanhos de Modal** | 0 | 4 variações | 0 |
| **Componentes Duplicados** | 0 | 0 | 2 candidatos |
| **UX Friction Points** | 1 | 3 | 5 |
| **Acessibilidade** | 0 | 2 | 4 |

**Conclusão:** Projeto em **excelente saúde**. Débitos são majoritariamente de polimento, não de funcionalidade.

---

## 1. DESIGN SYSTEM & CONSISTÊNCIA VISUAL

### 1.1 ✅ Pontos Positivos (Consolidados)

| Componente | Status | Localização |
|------------|--------|-------------|
| **PageHeader** | ✅ Unificado | `src/components/ui/page-header.tsx` |
| **EmptyState** | ✅ Com variantes | `src/components/ui/empty-state.tsx` |
| **LoadingState** | ✅ Padronizado | `src/components/ui/loading-state.tsx` |
| **SkeletonPage** | ✅ Sistema completo | `src/components/ui/skeleton-page.tsx` |
| **ConfirmDialog** | ✅ Centralizado | `src/components/ui/confirm-dialog.tsx` |
| **StatusBadge** | ✅ Tokens semânticos | `src/components/ui/status-badge.tsx` |
| **Tokens CSS** | ✅ Completos | `src/index.css` (435 linhas) |

### 1.2 🟡 Cores Hardcoded (P2-P3)

**Problema:** ~156 arquivos usam cores Tailwind diretas (`bg-green-500`, `text-red-600`) ao invés de tokens semânticos.

#### Módulos com Maior Incidência

| Módulo | Arquivos Afetados | Exemplo |
|--------|-------------------|---------|
| `okrs/` | 25+ | `AlignmentMap.tsx:45-56` |
| `teams/` | 8+ | `TeamCard.tsx:41-44` |
| `assets/` | 12+ | Status badges |
| `tickets/` | 10+ | Priority indicators |

#### Mapeamento de Migração

```typescript
// ❌ ANTES (hardcoded)
className="text-green-600"
className="bg-red-500/10 text-red-700"
className="bg-blue-100 text-blue-800"

// ✅ DEPOIS (tokens semânticos)
className="text-success"
className="bg-danger-muted text-danger-muted-foreground"
className="bg-info-muted text-info-muted-foreground"
```

| Hardcoded | Token Semântico |
|-----------|-----------------|
| `text-green-500/600` | `text-success` |
| `bg-green-100 text-green-700` | `bg-success-muted text-success-muted-foreground` |
| `text-red-500/600` | `text-danger` |
| `bg-red-100 text-red-700` | `bg-danger-muted text-danger-muted-foreground` |
| `text-yellow-500/600` | `text-warning` |
| `bg-yellow-100 text-yellow-700` | `bg-warning-muted text-warning-muted-foreground` |
| `text-blue-500/600` | `text-info` |
| `bg-blue-100 text-blue-700` | `bg-info-muted text-info-muted-foreground` |

### 1.3 🟡 Tamanhos de Modal Inconsistentes (P2)

**Problema:** Dialogs usam larguras arbitrárias sem padrão semântico.

| Dialog | Largura Atual | Padrão Sugerido |
|--------|---------------|-----------------|
| `TeamObjectiveFormDialog` | `550px` | `md` (560px) |
| `OrgKrFormDialog` | `560px` | `md` (560px) |
| `TeamKrFormDialog` | `600px` | `lg` (640px) |
| `PartnerContactDialog` | `700px` | `xl` (768px) |
| `CheckinDialog` | `650px` | `lg` (640px) |

**Solução Proposta:** Criar constantes de largura

```typescript
// src/lib/dialog-sizes.ts
export const DIALOG_SIZES = {
  sm: 'sm:max-w-[480px]',    // Forms simples
  md: 'sm:max-w-[560px]',    // Forms médios
  lg: 'sm:max-w-[640px]',    // Forms complexos
  xl: 'sm:max-w-[768px]',    // Multi-step / tabelas
  full: 'sm:max-w-[90vw]',   // Full-screen dialogs
} as const;
```

---

## 2. COMPONENTES & REUTILIZAÇÃO

### 2.1 ✅ Componentes UI Canônicos

```
src/components/ui/
├── button.tsx              ✅ cva variants
├── card.tsx                ✅ Composition pattern
├── dialog.tsx              ✅ Radix UI
├── form.tsx                ✅ react-hook-form
├── page-header.tsx         ✅ Breadcrumbs + actions
├── empty-state.tsx         ✅ 5 variantes
├── loading-state.tsx       ✅ Skeleton integrado
├── skeleton-page.tsx       ✅ 5 variantes
├── status-badge.tsx        ✅ Tokens semânticos
├── status-indicator.tsx    ✅ RAG + custom
└── confirm-dialog.tsx      ✅ Destructive variant
```

### 2.2 🟢 Componentes de Módulo (Bem Estruturados)

```
src/modules/okrs/
├── components/
│   ├── wizards/           ✅ 7 wizards organizados
│   ├── shared/            ✅ Componentes reutilizáveis
│   └── dialogs/           ✅ Form dialogs
├── hooks/
│   ├── queries/           ✅ Barrel exports
│   └── mutations/         ✅ Separação clara
└── utils/                 ✅ Validação, cálculos
```

### 2.3 🟡 Oportunidades de Consolidação (P3)

| Componente | Ocorrências | Ação |
|------------|-------------|------|
| `RichTextViewer` | 2 variações | Unificar em `ui/` |
| `DateRangePicker` | Ad-hoc | Criar componente canônico |
| `UserCombobox` | 3 variações | Consolidar com `ParticipantSelect` |

---

## 3. UX & PONTOS DE FRICÇÃO

### 3.1 🔴 Crítico (P1)

| Issue | Localização | Impacto | Status |
|-------|-------------|---------|--------|
| **Tooltip flickering no sidebar** | `HubGlobalSidebar.tsx` | Bloqueia interação | ✅ CORRIGIDO (2026-01-22) |

### 3.2 🟡 Importante (P2)

| Issue | Localização | Impacto | Solução |
|-------|-------------|---------|---------|
| **Filtros não persistem em reload** | Algumas páginas | UX quebrada | Migrar para `useUrlState` |
| **Modais sem focus trap** | Alguns dialogs | Acessibilidade | Verificar Radix config |
| **Botões sem loading state** | Mutations | Clique duplo | Usar `isLoading` prop |

#### Páginas Pendentes de URL State

| Página | Status |
|--------|--------|
| `/okrs/checkins` | ✅ Implementado |
| `/users` | ✅ Implementado |
| `/assets/inventory` | ✅ Implementado |
| `/tickets` | ✅ Implementado |
| `/settings/notifications` | 🔲 Pendente |
| `/partners/companies` | 🔲 Pendente |

### 3.3 🟢 Desejável (P3)

| Issue | Descrição | Benefício |
|-------|-----------|-----------|
| **Keyboard shortcuts** | Atalhos para ações comuns | Produtividade |
| **Command palette** | Cmd+K para navegação | Power users |
| **Prefetch on hover** | Carregar dados em hover | Percepção de velocidade |
| **Toast stacking** | Limitar toasts simultâneos | Menos poluição visual |
| **Empty state illustrations** | Ilustrações customizadas | Personalidade |

---

## 4. RESPONSIVIDADE & MOBILE

### 4.1 ✅ Pontos Positivos

| Área | Status |
|------|--------|
| Sidebar colapsável | ✅ Mobile drawer |
| Cards responsivos | ✅ Grid adapta |
| Tabelas | ✅ Scroll horizontal |
| Forms | ✅ Stack em mobile |

### 4.2 🟡 Oportunidades (P3)

| Issue | Descrição |
|-------|-----------|
| Touch targets | Alguns botões < 44px |
| Swipe gestures | Não implementados em listas |
| Pull-to-refresh | Não disponível |

---

## 5. ACESSIBILIDADE

### 5.1 ✅ Já Implementado

- Radix UI primitives (aria-* automático)
- Color contrast tokens
- Focus visible rings
- Skip links na sidebar

### 5.2 🟡 Pendente (P2-P3)

| Issue | Impacto | Solução |
|-------|---------|---------|
| **Alt text em imagens** | Screen readers | Auditar `<img>` tags |
| **Aria-labels em ícones** | Ação ambígua | Adicionar `aria-label` |
| **Reduced motion** | Vestibular | Respeitar `prefers-reduced-motion` |
| **High contrast mode** | Baixa visão | Testar tokens |

---

## 6. PERFORMANCE FRONT-END

### 6.1 ✅ Otimizações Ativas

| Técnica | Status |
|---------|--------|
| Code splitting (lazy routes) | ✅ |
| Query staleTime por domínio | ✅ `queryCacheConfig.ts` |
| Debounce em buscas | ✅ 300ms padrão |
| Virtualização de listas | ✅ `virtualized-list.tsx` |
| Image optimization | ✅ Avatar lazy load |

### 6.2 🟢 Oportunidades (P3)

| Técnica | Benefício |
|---------|-----------|
| Prefetch em hover de menu | Navegação instantânea |
| Service worker | Offline support |
| Bundle analyzer | Identificar chunks grandes |

---

## 📊 Plano de Ação

### Fase 1 — Imediato (Esta Semana) ✅ CONCLUÍDA

| # | Ação | Esforço | Status |
|---|------|---------|--------|
| 1.1 | Criar `DIALOG_SIZES` constantes | 15 min | ✅ Feito |
| 1.2 | Padronizar modais OKR (CheckinDialog, CycleFormDialog, CycleRetrospectiveDialog) | 30 min | ✅ Feito |
| 1.3 | Migrar cores hardcoded módulo OKRs (KrHistoryDialog, CycleCheckinsTable, OkrCycleProgress, etc) | 1h | ✅ Feito |
| 1.4 | Migrar cores hardcoded módulo Teams (TeamCard) | 30 min | ✅ Feito |

### Fase 2 — Próxima Sprint

| # | Ação | Esforço | Prioridade |
|---|------|---------|------------|
| 2.1 | Migrar cores hardcoded (módulo Assets) | 2h | P2 |
| 2.2 | Migrar cores hardcoded (módulo Tickets) | 1.5h | P2 |
| 2.3 | URL State em páginas restantes | 2h | P2 |
| 2.4 | Consolidar UserCombobox → ParticipantSelect | 2h | P3 |

### Fase 3 — Backlog

| # | Ação | Esforço | Prioridade |
|---|------|---------|------------|
| 3.1 | Migrar cores hardcoded (todos os módulos restantes) | 4h | P3 |
| 3.2 | Keyboard shortcuts | 4h | P3 |
| 3.3 | Command palette (Cmd+K) | 8h | P3 |
| 3.4 | Audit de acessibilidade completo | 4h | P3 |
| 3.5 | Empty state illustrations | 4h | P3 |

---

## 📏 Métricas de Sucesso

| Métrica | Antes | Meta | Após (2026-01-22) |
|---------|-------|------|-------------------|
| Arquivos com cores hardcoded | ~156 | <20 | ~140 (em progresso) |
| Variações de modal size | 5+ | 4 (sm/md/lg/xl) | ✅ Padronizado |
| Páginas com URL State | 4 | 8+ | 4 (pendente) |
| Botões sem isLoading | ? | 0 | Em auditoria |
| Lighthouse Accessibility | ? | >90 | Pendente |

---

## 🔧 Arquivos de Referência

### Tokens de Cor (Fonte de Verdade)
```
src/index.css (linhas 1-150)
├── --success / --success-muted
├── --warning / --warning-muted
├── --danger / --danger-muted
├── --info / --info-muted
└── --status-* (RAG colors)
```

### Utilitários de Status
```
src/lib/colors.ts
├── RAG_COLORS
├── STATUS_COLORS
├── HIGHLIGHT_CARD_STYLES
└── METRIC_CARD_STYLES
```

### Componentes Canônicos
```
src/components/ui/
├── status-indicator.tsx  → StatusIndicator, StatusDot
├── status-badge.tsx      → StatusBadge (variantes semânticas)
├── empty-state.tsx       → EmptyState (5 variantes)
└── loading-state.tsx     → LoadingState
```

---

## ✅ Conclusão

O Hub da Jet possui **front-end de alta qualidade** com:

1. **Design System:** ✅ Tokens consolidados, componentes shadcn/ui
2. **Arquitetura:** ✅ Módulos bem estruturados, hooks organizados
3. **Responsividade:** ✅ Mobile-first, sidebar adaptativa
4. **Estado:** ✅ React Query + URL State onde implementado

**Débitos identificados são de polimento**, não estruturais:
- Cores hardcoded → Migração gradual para tokens
- Modal sizes → Padronizar com constantes
- URL State → Completar migração em páginas restantes

**Recomendação:** Priorizar Fase 1 e 2 para atingir padrão enterprise.

---

*Auditoria realizada em: 2026-01-22*  
*Próxima revisão: 2026-02-22*
