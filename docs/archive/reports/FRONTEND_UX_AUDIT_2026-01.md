# 🎨 Auditoria de Frontend & UX — Hub da Jet

**Data:** 2026-01-12  
**Versão:** 1.0.0  
**Objetivo:** Identificar inconsistências visuais, padrões quebrados, componentes duplicados e oportunidades de simplificação

---

## Sumário Executivo

| Dimensão | Status | Impacto | Prioridade |
|----------|--------|---------|------------|
| **Design System** | 🟢 Sólido | Base bem estruturada | Manter |
| **Componentes UI** | 🟢 Bom | Canônicos bem definidos | Manter |
| **Consistência de Uso** | 🟡 Parcial | Anti-patterns detectados | Alta |
| **Estados (Loading/Empty/Error)** | 🟡 Parcial | Cobertura incompleta | Alta |
| **Navegação (Breadcrumbs)** | 🟡 Parcial | Inconsistente entre módulos | Média |
| **Forms & Validação** | 🟡 Parcial | Loading states manuais | Média |
| **Duplicação de Código** | 🟢 Baixa | Poucos componentes duplicados | Baixa |

---

## 1. DESIGN SYSTEM — Análise

### 1.1 Fundação ✅ Sólida

O design system está bem estruturado:

| Aspecto | Status | Arquivo |
|---------|--------|---------|
| **Tokens CSS** | ✅ Completo | `src/index.css` |
| **Cores semânticas** | ✅ HSL + Light/Dark | 16 tokens definidos |
| **Tipografia** | ✅ Plus Jakarta Sans | Única fonte (bom) |
| **Sombras/Gradientes** | ✅ Tokens customizados | 5 sombras, 3 gradientes |
| **Tailwind Config** | ✅ Bem mapeado | `tailwind.config.ts` |

### 1.2 Cores Disponíveis

```
primary       → Deep Navy Blue (identidade)
accent        → Vibrant Blue (CTAs)
secondary     → Soft blue-gray
muted         → Backgrounds sutis
destructive   → Vermelho (erros/delete)
success       → Verde (confirmações)
warning       → Laranja (alertas)
sidebar-*     → Tema escuro da sidebar
```

### 1.3 Problemas Detectados

| Problema | Severidade | Ação |
|----------|------------|------|
| Nenhum problema crítico detectado | - | - |

**Conclusão:** Design system bem implementado. Manter.

---

## 2. COMPONENTES UI — Inventário

### 2.1 Componentes Canônicos (54 arquivos em `ui/`)

| Categoria | Componentes | Status |
|-----------|-------------|--------|
| **Layout** | `page-header`, `sidebar`, `card`, `separator` | ✅ Bem usados |
| **Estados** | `loading-state`, `empty-state`, `error-state`, `skeleton` | 🟡 Cobertura parcial |
| **Navegação** | `global-breadcrumb`, `tabs`, `pagination` | 🟡 Inconsistente |
| **Formulários** | `input`, `select`, `checkbox`, `form` | ✅ Padronizados |
| **Feedback** | `toast`, `sonner`, `tooltip`, `help-tooltip` | ✅ Funcionais |
| **Diálogos** | `dialog`, `confirm-dialog`, `sheet`, `drawer` | ✅ Padronizados |
| **Data Display** | `table`, `badge`, `avatar`, `status-badge` | ✅ Consistentes |

### 2.2 Componentes Especializados

| Componente | Localização | Decisão |
|------------|-------------|---------|
| `ResourceNotFoundState` | `ui/` | ✅ MANTER (específico para recursos deletados) |
| `HelpTooltip` | `ui/` | ✅ MANTER (wrapper útil) |
| `GlobalBreadcrumb` | `ui/` | ✅ MANTER (com presets por módulo) |
| `OptimizedAvatar` | `ui/` | ✅ MANTER (lazy loading de imagens) |
| `StatusBadge` | `ui/` | ✅ MANTER (semântico) |

### 2.3 Componentes Duplicados/Obsoletos

| Componente | Status | Ação |
|------------|--------|------|
| `MultiUserSelect` (deprecated) | ⚠️ Deprecado | Remover após migração completa |
| Headers inline em Profile | ⚠️ Wave 3 pendente | Migrar para `PageHeader` |

---

## 3. INCONSISTÊNCIAS DETECTADAS

### 3.1 Anti-pattern: Headers Inline

**Problema:** Algumas páginas usam `<h1>` + `<p>` inline em vez de `<PageHeader>`.

| Arquivo | Problema | Ação |
|---------|----------|------|
| `src/modules/assets/pages/AssetsPage.tsx:24-29` | Header inline | Migrar para `PageHeader` |
| `src/modules/tickets/pages/TicketDetailPage.tsx:135-148` | Header customizado | Criar `TicketDetailHeader` |
| `src/pages/Profile.tsx` | Header inline | Migrar para `PageHeader` |

**Código problemático:**
```tsx
// ❌ Anti-pattern
<h1 className="text-2xl font-bold text-foreground">Assets</h1>
<p className="text-muted-foreground">Gerencie inventário...</p>

// ✅ Correto
<PageHeader title="Assets" description="Gerencie inventário..." />
```

### 3.2 Anti-pattern: Loading States Manuais

**Problema:** Botões usam `Loader2` inline em vez de prop `isLoading`.

| Arquivo | Problema |
|---------|----------|
| `src/pages/Auth.tsx:291-298` | `{isLoading ? <Loader2 /> : "Texto"}` inline |
| `src/modules/okrs/components/CancelOkrDialog.tsx:279-282` | Spinner manual |

**Código problemático:**
```tsx
// ❌ Anti-pattern
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="animate-spin" />}
  {isLoading ? "Salvando..." : "Salvar"}
</Button>

// ✅ Correto (proposta)
<Button isLoading={isLoading} loadingText="Salvando...">
  Salvar
</Button>
```

**Ação:** Adicionar prop `isLoading` ao componente `Button`.

### 3.3 Anti-pattern: Empty States Inline

**Problema:** Alguns módulos usam `<div>Nenhum resultado</div>` em vez de `<EmptyState>`.

| Arquivo | Problema |
|---------|----------|
| `src/modules/automations/pages/AutomationsPage.tsx:248-251` | Empty state inline |

**Código problemático:**
```tsx
// ❌ Anti-pattern
<div className="flex flex-col items-center py-12 text-center">
  <ArrowDownLeft className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <p className="text-muted-foreground">Nenhuma ação encontrada.</p>
</div>

// ✅ Correto
<EmptyState
  icon={ArrowDownLeft}
  title="Nenhuma ação encontrada"
  description="Tente ajustar os filtros ou criar uma nova ação."
/>
```

### 3.4 Anti-pattern: Breadcrumbs Ausentes

**Problema:** Vários módulos não têm breadcrumbs em páginas de detalhe.

| Módulo | Tem Breadcrumb | Status |
|--------|----------------|--------|
| OKRs | ✅ `OkrBreadcrumb` | OK |
| Assets | ✅ `AssetsBreadcrumb` | OK |
| Tickets | ❌ Ausente | Implementar |
| Users | ❌ Ausente | Implementar |
| Teams | ❌ Ausente | Implementar |
| KPIs | ❌ Ausente | Implementar |

---

## 4. OPORTUNIDADES DE SIMPLIFICAÇÃO

### 4.1 Consolidar Selects de Usuário

Existem múltiplos componentes de seleção de usuário:

| Componente | Uso |
|------------|-----|
| `BuUserSelect` | Seleção única |
| `BuUserMultiSelect` | Seleção múltipla |
| `MultiUserSelect` (deprecated) | Legacy |
| `UserHoverCard` | Preview ao hover |

**Ação:** Remover `MultiUserSelect` após migração completa.

### 4.2 Criar Variants de EmptyState

Atualmente `EmptyState` é genérico. Proposta de variants contextuais:

```tsx
type EmptyStateVariant = 
  | 'search'      // Busca sem resultados
  | 'filter'      // Filtros muito restritivos
  | 'firstUse'    // Primeiro uso (CTA para criar)
  | 'noPermission' // Sem acesso
  | 'default';    // Genérico
```

### 4.3 Adicionar `isLoading` Prop ao Button

O componente `Button` não tem prop nativa para estado de loading:

```tsx
// Proposta de API
interface ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  loadingPosition?: 'left' | 'right';
}
```

---

## 5. PLANO DE AÇÃO

### 5.1 Prioridade Alta (1-2 semanas)

| # | Tarefa | Impacto | Esforço |
|---|--------|---------|---------|
| 1 | Adicionar `isLoading` prop ao `Button` | Alto | Baixo |
| 2 | Migrar headers inline para `PageHeader` (Assets, Profile) | Médio | Baixo |
| 3 | Substituir empty states inline por `EmptyState` | Médio | Baixo |
| 4 | Adicionar breadcrumbs em Tickets, Users, Teams | Médio | Médio |

### 5.2 Prioridade Média (2-4 semanas)

| # | Tarefa | Impacto | Esforço |
|---|--------|---------|---------|
| 5 | Criar variants contextuais para `EmptyState` | Médio | Médio |
| 6 | Remover `MultiUserSelect` deprecated | Baixo | Baixo |
| 7 | Auditar cobertura de `ErrorState` em todas as páginas | Médio | Médio |
| 8 | Padronizar mensagens de validação de form | Médio | Médio |

### 5.3 Prioridade Baixa (backlog)

| # | Tarefa | Impacto | Esforço |
|---|--------|---------|---------|
| 9 | Criar `TicketDetailHeader` especializado | Baixo | Baixo |
| 10 | Storybook para documentação visual | Baixo | Alto |

---

## 6. MÉTRICAS DE QUALIDADE

### 6.1 Estado Atual

| Métrica | Valor | Meta |
|---------|-------|------|
| Componentes canônicos em `ui/` | 54 | - |
| Anti-patterns de header detectados | 3 | 0 |
| Anti-patterns de loading detectados | 2+ | 0 |
| Módulos com breadcrumb | 2/6 | 6/6 |
| Cobertura de ErrorState | ~70% | 100% |

### 6.2 Ferramentas de Auditoria

O projeto já possui:
- `scripts/audit-shared-components.ts` - Detecta anti-patterns
- `docs/engineering/CONSISTENCY_REPORT.md` - Relatório de consistência
- `docs/UX_AUDIT_REPORT.md` - Auditoria de UX completa

---

## 7. PONTOS POSITIVOS (Manter)

1. **Design System completo** — Tokens CSS bem estruturados, light/dark mode
2. **Componentes canônicos documentados** — Registry em `SHARED_COMPONENTS_REGISTRY.md`
3. **Guards de permissão** — `RequirePermission` consistente
4. **Selects unificados** — `BuUserSelect`, `TeamSelect`, etc.
5. **Estados de erro** — `ErrorState`, `ResourceNotFoundState` existem
6. **Wizards de OKR** — Excelente UX com stepper e persistência
7. **URL State** — Filtros e tabs via URL (compartilháveis)
8. **Hooks utilitários** — `useSafeBack`, `useDialogFormReset`, etc.

---

## 📋 Checklist de PR (UX)

```markdown
### Navegação
- [ ] Breadcrumb presente em páginas de detalhe
- [ ] Botão "Voltar" usa `useSafeBack()` com fallback
- [ ] Links usam `<Link>` (não `onClick` + `navigate`)

### Estados
- [ ] Loading state com `LoadingState` ou `Skeleton`
- [ ] Empty state com `EmptyState` (com ação)
- [ ] Error state com `ErrorState` (retry/voltar)

### Componentes
- [ ] Header usa `PageHeader` (não h1 inline)
- [ ] Botões de submit usam loading prop (quando implementado)
- [ ] Diálogos destrutivos usam `DeleteConfirmDialog`

### Feedback
- [ ] Toast em toda mutação (create, update, delete)
- [ ] Validação inline em campos obrigatórios
```

---

*Documento gerado em: 2026-01-12*
