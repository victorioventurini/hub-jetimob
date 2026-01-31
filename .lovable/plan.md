# Frontend Robustness & UX Consistency Audit — Hub da Jet

**Versão:** 1.0  
**Data:** 2026-01-31  
**Base TCR:** v2.74.0  
**Status:** 📋 EM ANÁLISE

---

## ✅ PRE-CHECKLIST EXECUTADO

| Documento | Versão | Status |
|-----------|--------|--------|
| `docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md` | v2.74.0 | ✅ Analisado |
| `docs/canonical/DEVELOPMENT_STANDARDS.md` | v1.17.0 | ✅ Analisado |
| `src/index.css` | — | ✅ Analisado |
| `src/components/ui/` | — | ✅ Analisado |
| Memórias de projeto | — | ✅ Consideradas |

---

## 🎯 RESUMO EXECUTIVO

### Saúde Atual: 8.5/10

O frontend do Hub está em bom estado com design system consolidado e componentes reutilizáveis. Porém, existem oportunidades de melhoria em consistência e remoção de padrões legados.

| Área | Score | Observação |
|------|-------|------------|
| Design System (CSS) | 10/10 | Tokens semânticos bem definidos (status, surface, RAG) |
| Componentes UI Core | 9/10 | Button com isLoading, EmptyState com variants |
| Consistência de Padrões | 7/10 | 63 arquivos ainda usam `Loader2` manual em vez de `Button isLoading` |
| Navegação | 8/10 | 4 arquivos usam `onClick + navigate()` em vez de `<Link>` |
| Cores Hardcoded | 9.5/10 | Apenas 2 arquivos com cores diretas (documentação + 1 exceção) |
| Loading States | 8/10 | Componentes canônicos existem, mas não são usados universalmente |

---

## 📋 FINDINGS (ACHADOS)

### P1 — ALTA PRIORIDADE (Impacto UX direto)

#### F1.1 — Uso Manual de Loader2 (63 arquivos)

**Problema:** O componente `Button` já possui props `isLoading` e `loadingText`, mas 63 arquivos ainda usam o padrão manual:

```tsx
// ❌ ATUAL (manual, verboso)
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
  Salvar
</Button>

// ✅ CORRETO (usando props do Button)
<Button isLoading={isLoading} loadingText="Salvando...">
  Salvar
</Button>
```

**Impacto:** Inconsistência visual, código duplicado, manutenibilidade reduzida.

**Arquivos afetados:** 63 (wizards, settings, dialogs, forms)

---

#### F1.2 — onClick + navigate() em vez de <Link> (4 arquivos)

**Problema:** Alguns botões usam `onClick={() => navigate('/path')}` em vez de `<Link>`.

**Impacto:** 
- Não suporta middle-click (abrir em nova aba)
- Não suporta prefetch do React Router
- Acessibilidade reduzida (não é um link semântico)

**Arquivos:**
- `src/pages/AuthCallback.tsx` — OK (caso especial de redirect)
- `src/modules/partners/pages/PartnerFormPage.tsx` — **CORRIGIR**
- `src/modules/okrs/pages/OkrCreationPage.tsx` — **CORRIGIR**
- `src/modules/okrs/pages/OkrQualityPage.tsx` — **CORRIGIR**

---

### P2 — MÉDIA PRIORIDADE (Consistência)

#### F2.1 — Estados de Loading Inconsistentes

**Problema:** Existem componentes canônicos (`LoadingState`, `LoadingSpinner`, `SkeletonList`) mas muitos lugares recriam o mesmo padrão:

```tsx
// ❌ Padrão manual repetido
<div className="min-h-screen flex items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
  <p>Carregando...</p>
</div>

// ✅ Componente canônico
<LoadingState fullPage text="Carregando..." />
```

**Locais para migrar:**
- `SelectBu.tsx` (2 estados de loading)
- `ResolveContextPage.tsx`
- `OnboardingGuard.tsx`
- `AuthCallback.tsx`

---

#### F2.2 — EmptyState Subutilizado

**Problema:** O componente `EmptyState` possui variants (`search`, `filter`, `firstUse`, `noPermission`) mas muitos lugares recriam estados vazios manualmente.

**Ação:** Auditar e migrar para o componente canônico.

---

### P3 — BAIXA PRIORIDADE (Refinamento)

#### F3.1 — Spacing Inconsistente em Page Layouts

**Observação:** A maioria das páginas usa `space-y-6` ou `space-y-8`, mas há variações (`space-y-4`, `space-y-2`).

**Recomendação:** Padronizar como:
- `space-y-8` para containers de página principal
- `space-y-6` para seções dentro de cards
- `space-y-4` para grupos de campos de formulário

---

#### F3.2 — PageHeader Breadcrumbs Inconsistentes

**Observação:** Algumas páginas usam `backTo` e outras `breadcrumbs`. Padronizar:
- **Páginas de detalhe:** usar `backTo` 
- **Páginas de listagem/configuração:** usar `breadcrumbs`

---

## ✅ PONTOS POSITIVOS (O QUE ESTÁ BOM)

1. **Design System consolidado** — Tokens semânticos para status (green, yellow, red, gray), surfaces (view, operate, administer), e estados (success, warning, danger, info).

2. **Componentes UI robustos:**
   - `Button` com variants, sizes, e `isLoading`
   - `EmptyState` com variants contextuais
   - `LoadingState`, `SkeletonCard`, `SkeletonList`, `SkeletonTable`
   - `PageHeader` com breadcrumbs e backTo
   - `StatusBadge`, `StatusIndicator` para RAG status

3. **Cores hardcoded praticamente eliminadas** — Apenas 2 arquivos com cores diretas (1 é documentação de exemplo).

4. **URL State bem implementado** — Hooks canônicos `useUrlState`, `useUrlTab`, `useUrlSearch`.

5. **Dark mode completo** — Todos os tokens têm variantes light/dark.

---

## 📐 PLANO DE AÇÃO

### Wave 1 — Quick Wins (Impacto imediato, baixo esforço)

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 1.1 | Migrar `onClick+navigate` para `<Link>` | 3 | Acessibilidade + UX |
| 1.2 | Migrar loading states para `LoadingState` | 4 | Consistência visual |

### Wave 2 — Padronização de Buttons (Médio esforço)

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 2.1 | Migrar `Loader2` manual para `Button isLoading` | ~20 arquivos críticos | DRY, manutenibilidade |

### Wave 3 — Documentação e Guidelines

| # | Ação | Entrega |
|---|------|---------|
| 3.1 | Criar `docs/canonical/UI_COMPONENTS_REGISTRY.md` | Referência única para componentes |
| 3.2 | Atualizar DEVELOPMENT_STANDARDS com seção de UI | Regras de design system |

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Antes | Meta |
|---------|-------|------|
| Arquivos com Loader2 manual | 63 | <10 |
| onClick+navigate em vez de Link | 4 | 0 |
| Estados de loading recreados | ~10 | 0 |
| Score de Consistência UI | 8.5/10 | 9.5/10 |

---

*Auditoria iniciada em 2026-01-31 — Aguardando aprovação para execução das waves.*
