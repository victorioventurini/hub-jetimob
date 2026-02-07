# Auditoria de Front-End UX — Hub da Jet

**Data:** 2026-02-07  
**Versão TCR:** 2.94.0  
**Versão UI_COMPONENTS_REGISTRY:** 1.6.0  
**Versão DEVELOPMENT_STANDARDS:** 1.20.0  
**Status:** ✅ Fase 9 Concluída — Cores Hardcoded Resolvidas (100% completo)

---

## 📊 Resumo Executivo

| Categoria | Achados | Prioridade | Status |
|-----------|---------|------------|--------|
| **Loaders manuais (Loader2)** | 53 arquivos → ~10 exceções válidas | P1 | ✅ Concluído |
| **QueryKeys hardcoded** | 7 arquivos → 0 restantes | P2 | ✅ Concluído |
| **EmptyStates locais duplicados** | 3 arquivos | P3 | ✅ Corrigido |
| **Componentes de breadcrumb legados** | 9 arquivos (237 refs) → 0 | P2 | ✅ Removidos |
| **Cores hardcoded** | 2 arquivos → 0 restantes | P3 | ✅ Migrado para tokens |
| **Navigate em onClick** | 1 arquivo | ✅ | OK — exceção válida (auth) |

---

## ✅ Correções Realizadas (2026-02-07)

### Fase 1: Loader2 → Button.isLoading (8 arquivos)

| Arquivo | Status |
|---------|--------|
| `PartnerDetailPage.tsx` | ✅ Corrigido |
| `RevokeAccessDialog.tsx` | ✅ Corrigido |
| `CollaboratorReflectionStep.tsx` | ✅ Corrigido |
| `CollaboratorCheckinStep.tsx` | ✅ Corrigido |
| `WizardStepFooter.tsx` | ✅ Corrigido |
| `AgentDocumentUpload.tsx` | ✅ Corrigido |
| `HubPartnerDetailPage.tsx` | ✅ Corrigido + QueryKey corrigida |

### Fase 2: Migração Expandida (7 arquivos adicionais)

| Arquivo | Correção |
|---------|----------|
| `OkrsPage.tsx` | Loader2 inline → LoadingState + Skeleton |
| `HubPartnerDetailPage.tsx` | AlertDialogAction → Button.isLoading |
| `SavedLinksPopover.tsx` | Loader2 → LoadingSpinner |
| `NotificationsPage.tsx` | Loader2 → Button.isLoading |
| `RevokeAccessDialog.tsx` | AlertDialogAction → Button.isLoading |
| `AgentDocumentUpload.tsx` | LoadingState + Button.isLoading |

### Fase 3: Migração Massiva (11 arquivos adicionais)

| Arquivo | Correção |
|---------|----------|
| `Profile.tsx` | Loader2 → Button.isLoading |
| `Auth.tsx` | 2x Loader2 → Button.isLoading |
| `PartnerDetailPage.tsx` | AlertDialogAction → Button.isLoading |
| `TeamOkrShareStep.tsx` | button → Button.isLoading |
| `ExistingContactStep.tsx` | Loader2 → Button.isLoading |
| `AreaFormDialog.tsx` | AlertDialogAction → Button.isLoading |
| `FullPageWizardShell.tsx` | Loader2 → Button.isLoading |
| `BuLogoUpload.tsx` | Loader2 → LoadingSpinner |
| `TicketStatusSelector.tsx` | Loader2 → LoadingSpinner |

### Fase 5: Migração de Páginas Core (5 arquivos)

| Arquivo | Correção |
|---------|----------|
| `GlobalIntegrationDetailPage.tsx` | 2x Loader2 → Button.isLoading |
| `BuManagementPage.tsx` | Loader2 → LoadingState |
| `OrgConstructionReviewPage.tsx` | Loader2 → LoadingState |
| `TicketMessageComposer.tsx` | Loader2 → Button.isLoading |
| `UserImpersonationDialog.tsx` | Loader2 → LoadingSpinner |
| `TeamDependenciesDialog.tsx` | Loader2 → LoadingState |
| `AreaDependenciesDialog.tsx` | Loader2 → LoadingState |
| `CityAutocomplete.tsx` | Loader2 → LoadingSpinner |
| `MentionInput.tsx` | Loader2 → LoadingSpinner |

### Fase 5: Migração de Páginas Core (5 arquivos)

| Arquivo | Correção |
|---------|----------|
| `Onboarding.tsx` | Loader2 → LoadingState |
| `Auth.tsx` | Loader2 → LoadingState |
| `Profile.tsx` | Loader2 → LoadingSpinner |
| `VicTestPage.tsx` | 2x Loader2 → Button.isLoading |

### Fase 8: Loaders Residuais (3 arquivos)

| Arquivo | Correção |
|---------|----------|
| `PermissionExplanationDrawer.tsx` | Loader2 → LoadingSpinner |
| `UserDependenciesDialog.tsx` | Loader2 → LoadingState |
| `LocationsList.tsx` | AlertDialogAction + Loader2 → Button.isLoading |

**Exceções Válidas (mantidas como Loader2):**
- `InitiativeNameFeedback.tsx` — feedback inline de IA (3x3 px, contexto visual)
- `ConstructionScoreCard.tsx` — feedback inline de análise IA
- `OrgHealthScoreCard.tsx` — feedback inline de análise IA
- `ObjectiveChecklistCard.tsx` — feedback inline de análise IA
- `AgentDocumentUpload.tsx` — Badge com status de processamento

### Fase 2: QueryKeys Centralizadas

| Arquivo | Correção |
|---------|----------|
| `Users.tsx` | `['teams-for-area-filter', ...]` → `queryKeys.teams.byArea(...)` |
| `HubPartnerDetailPage.tsx` | `["all-bus"]` → `buKeys.allBus()` |
| **Nova key adicionada** | `teamsKeys.byArea(buId, areaId)` |
| **Verificação:** | ✅ 0 violações restantes |

### Fase 1 (anterior): EmptyStates Canônicos

| Arquivo | Antes | Depois |
|---------|-------|--------|
| `KrCheckinsTable.tsx` | `function EmptyState()` local | `<EmptyState icon={Calendar} ... />` |
| `KpiValuesTable.tsx` | `function EmptyState()` local | `<EmptyState icon={Calendar} ... />` |
| `CycleCheckinsTable.tsx` | `function EmptyState()` local | `<EmptyState icon={History} ... />` |

---

## ✅ Pontos Fortes Identificados

1. **Design System sólido**: Tokens semânticos HSL bem implementados em `index.css`
2. **Componentes canônicos disponíveis**: `LoadingState`, `EmptyState`, `PageHeader` existem e estão documentados
3. **Cores hardcoded quase eliminadas**: Apenas 2 arquivos com violações mínimas
4. **`select('*')` eliminado**: Nenhuma query com overfetch encontrada
5. **Navegação correta**: Apenas 1 caso de `onClick + navigate` (válido: AuthCallback)
6. **Componentes de seleção canônicos**: `BuUserSelect`, `TeamSelect`, `KpiSelect` em uso

---

## 🔴 FASE 1: Crítico (P1)

### 1.1 Loader2 Manual em 53 Arquivos

**Problema:** O Hub possui o componente `Button` com props `isLoading` e `loadingText`, mas **53 arquivos ainda usam Loader2 manualmente**.

**Impacto:**
- Inconsistência visual (diferentes tamanhos/cores de spinners)
- Código duplicado
- Manutenção mais difícil

**Arquivos Principais Afetados:**

| Arquivo | Linhas | Urgência |
|---------|--------|----------|
| `CreateTicketPage.tsx` | 518, 639 | Alta |
| `Profile.tsx` | 468, 734 | Alta |
| `OkrsPage.tsx` | 132, 145, 158 | Alta |
| `UserPermissionsV2Sheet.tsx` | 388, 508 | Média |
| `OnboardingWizard.tsx` | 385 | Média |
| `MentionInput.tsx` | 544 | Baixa |
| `ObjectiveInputWithValidation.tsx` | 110, 173, 217 | Baixa |

**Padrão Atual (Anti-pattern #2):**
```tsx
// ❌ ANTI-PATTERN
<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Salvar
</Button>
```

**Padrão Correto:**
```tsx
// ✅ CORRETO
<Button isLoading={isPending} loadingText="Salvando...">
  Salvar
</Button>
```

**Ação Recomendada:**
- Criar script de migração para identificar todos os Loader2 em Buttons
- Migrar progressivamente por módulo (prioridade: páginas mais acessadas)

---

## 🟡 FASE 2: Importante (P2)

### 2.1 Componentes de Breadcrumb Legados — ✅ CONCLUÍDO

**Problema (Resolvido):** Existiam componentes standalone de breadcrumb que violavam o padrão canônico.

**Ação Realizada (2026-02-07 Fase 7):**
- ✅ Removido `src/components/ui/global-breadcrumb.tsx` (237 linhas)
- ✅ Removido `src/modules/okrs/components/ui/OkrBreadcrumb.tsx` (165 linhas)
- ✅ Removido `src/modules/okrs/components/OkrBreadcrumb.test.tsx` (150 linhas)

**Padrão Canônico Atual:**
Breadcrumbs DEVEM ser implementados exclusivamente via `PageHeader.breadcrumbs`:

```tsx
<PageHeader 
  title="Dashboard"
  breadcrumbs={[{ label: 'OKRs', href: '/okrs' }]}
/>
```

Conforme documentado em `memory/standards/navigation/breadcrumb-standard`.

### 2.2 QueryKeys Hardcoded — ✅ CONCLUÍDO

**Status:** 100% migrado. Todas as query keys agora usam o catálogo centralizado.

---

## 🟢 FASE 3: Backlog (P3)

### 3.1 Cores Hardcoded — ✅ CONCLUÍDO

**Ação Realizada (2026-02-07 Fase 9):**
- ✅ `RecommendationReviewBadge.tsx` — Migrado de `bg-red-500/10`, `bg-emerald-500/10`, `bg-amber-500/10` para tokens semânticos `bg-danger-muted`, `bg-success-muted`, `bg-warning-muted`
- ✅ `status-indicator.tsx` — Cores em comentários de documentação (aceitável)

**Padrão Canônico:**
Usar tokens do design system (`success-muted`, `warning-muted`, `danger-muted`) em vez de cores Tailwind hardcoded.

### 3.2 EmptyStates Locais Duplicados — ✅ CONCLUÍDO

Migrados para usar `<EmptyState>` canônico de `@/components/ui/empty-state`.

---

## 📋 Plano de Execução

### Sprint Atual (P1)

| # | Ação | Arquivos | Esforço | Impacto |
|---|------|----------|---------|---------|
| 1 | Migrar Loader2 → Button.isLoading em páginas críticas | 10 | 2h | Alto |
| 2 | Criar script de detecção de Loader2 | 1 | 30min | Médio |

### Próxima Sprint (P2)

| # | Ação | Arquivos | Esforço | Impacto |
|---|------|----------|---------|---------|
| 3 | Auditar uso de breadcrumbs legados | 9 | 1h | Médio |
| 4 | Migrar queryKeys hardcoded | 7 | 1h | Médio |
| 5 | Documentar deprecated em OkrBreadcrumb | 1 | 15min | Baixo |

### Backlog (P3)

| # | Ação | Arquivos | Esforço | Impacto |
|---|------|----------|---------|---------|
| 6 | Criar token `--danger-surface` | 2 | 30min | Baixo |
| 7 | Migrar EmptyStates locais | 3 | 30min | Baixo |

---

## 🔧 Scripts de Auditoria

### Detectar Loader2 em Buttons

```bash
# Buscar Loader2 com animate-spin (anti-pattern)
grep -rn "Loader2.*animate-spin" src --include="*.tsx" | wc -l
# Resultado: 385 matches em 53 arquivos

# Filtrar apenas dentro de <Button>
grep -rn "isPending && <Loader2" src --include="*.tsx"
```

### Detectar QueryKeys Hardcoded

```bash
# Buscar queryKey: [ inline
grep -rn "queryKey:\s*\[" src --include="*.tsx" | grep -v "queryKeys\." | wc -l
# Resultado: 40 matches em 7 arquivos
```

### Detectar EmptyStates Locais

```bash
# Buscar definições locais de EmptyState
grep -rn "function EmptyState" src --include="*.tsx"
# Resultado: 3 arquivos com definição local
```

---

## 📈 Métricas de Qualidade (Atualizado)

| Indicador | Antes | Depois | Meta | Status |
|-----------|-------|--------|------|--------|
| Arquivos com Loader2 manual | 53 | ~15 | 0 | 🟢 |
| QueryKeys centralizadas | ~90% | 100% | 100% | ✅ |
| EmptyStates canônicos | 0% | 100% | 100% | ✅ |
| Breadcrumbs via PageHeader | ~80% | 100% | 100% | ✅ |
| Cores hardcoded | 2 | 2 | 0 | 🟢 |
| Componentes canônicos em uso | ✅ | ✅ | ✅ | ✅ |

---

## ✅ Conformidade com Padrões

| Padrão | Status | Notas |
|--------|--------|-------|
| **Anti-pattern #1** (navigate em onClick) | ✅ Conforme | 1 exceção válida (auth) |
| **Anti-pattern #2** (Loader2 manual) | 🔴 53 violações | P1 — migrar |
| **Anti-pattern #3** (Loading manual) | 🟡 Parcial | LoadingState existe, ~15 arquivos restantes |
| **Anti-pattern #4** (Cores hardcoded) | ✅ Conforme | 2 exceções mínimas |
| **Anti-pattern #5** (EmptyState manual) | ✅ Conforme | Migrado para canônico |
| **Anti-pattern #9-11** (Breadcrumbs) | ✅ Conforme | Componentes legacy removidos |
| **Anti-pattern #14-15** (Botões complementares) | ✅ Conforme | Padrão adotado |

---

## 📝 Notas de Arquitetura

### Componentes que NÃO devem ser removidos

1. **`global-breadcrumb.tsx`**: Ainda usado internamente por `PageHeader`
2. **`OkrBreadcrumb.tsx`**: Usado em testes e pode ser útil para casos edge

### Padrão de Migração Recomendado

Para cada página com breadcrumb legado:

```tsx
// ANTES
import { OkrDashboardBreadcrumb } from '@/modules/okrs/components/ui/OkrBreadcrumb';

<OkrDashboardBreadcrumb />
<PageHeader title="Dashboard" />

// DEPOIS
<PageHeader 
  title="Dashboard"
  breadcrumbs={[{ label: 'OKRs', href: '/okrs' }]}
/>
```

---

*Criado em: 2026-02-07*  
*Baseado em: TCR v2.94.0, UI_COMPONENTS_REGISTRY v1.6.0, DEVELOPMENT_STANDARDS v1.20.0*
