
# Plano: Página de Avaliação de Construção de OKRs Organizacionais

## 1. Pré-requisitos Validados

| Documento | Versão | Status |
|-----------|--------|--------|
| DEVELOPMENT_STANDARDS | v1.17.0 | ✅ Validado |
| DATA_MODEL_REGISTRY | v2.51.0 | ✅ Validado |
| Query Keys Pattern | Centralizado | ✅ Validado |

---

## 2. Estratégia de Implementação

### Reutilização Total de Componentes

Os componentes existentes são **genéricos** e aceitam interfaces que funcionam para ambos os contextos (time e organizacional):

| Componente | Props Interface | Reutilização |
|------------|-----------------|--------------|
| `ConstructionScoreCard` | `avgScore`, `approvedCount`, `needsImprovementCount`, `pendingCount` | ✅ 100% |
| `ObjectiveChecklistCard` | `ObjectiveReview`, `criteria`, `onReEvaluate` | ✅ 100% |
| `REVIEW_CRITERIA` | Critérios de avaliação | ✅ 100% |

**Não será criado nenhum novo componente de UI.**

---

## 3. Arquivos a Criar/Modificar

### 3.1 Query Key (Modificar)

**Arquivo:** `src/lib/queryKeys/okrs.ts`

```typescript
// Adicionar:
orgConstructionReview: (buId: string | null, year: number | null) => 
  ['okr-org-construction-review', buId, year] as const,
```

---

### 3.2 Hook (Criar)

**Arquivo:** `src/modules/okrs/hooks/useOrgConstructionReview.ts`

**Lógica:**
1. Buscar `okr_org_objectives` + `okr_org_key_results` por **ano**
2. Transformar para interface `ObjectiveReview[]` (mesma usada pelos componentes existentes)
3. Para cada objetivo, invocar edge function com flag `isOrgLevel: true`
4. Manter state de `aiAssessments`, `aiLoading`, `aiErrors` (mesmo padrão do `useConstructionReview`)

**Diferenças do hook de times:**
- Filtro por `year` em vez de `cycleId` + `teamId`
- Campo `teamName` fixo como `'Organizacional'`
- Sem análise consolidada de sinergias entre times (não aplicável)

---

### 3.3 Edge Function (Modificar)

**Arquivo:** `supabase/functions/okr-construction-review/index.ts`

**Alterações:**
1. Adicionar campo `isOrgLevel?: boolean` na interface `RequestBody`
2. Quando `isOrgLevel: true`, ajustar o prompt para contexto organizacional:

```typescript
// Prompt adaptado para OKRs organizacionais:
const orgPrompt = `
Você está avaliando um OBJETIVO ORGANIZACIONAL (nível empresa/C-Level).

CRITÉRIOS ESPECIAIS:
- **Clareza**: Deve inspirar e ser compreensível por TODA a organização
- **Ambição**: Deve representar um salto estratégico de 12+ meses
- **Mensurabilidade**: KRs devem ter métricas de alto nível (market share, receita, NPS)
- **Responsabilidade**: Cada KR deve ter um sponsor C-Level ou equivalente
- **Cascading**: Deve ser possível derivar OKRs de times a partir deste
`;
```

---

### 3.4 Página (Criar)

**Arquivo:** `src/modules/okrs/pages/OrgConstructionReviewPage.tsx`

**Estrutura:**
- Header com `YearSelect` (seletor de ano)
- Grid 1/3 + 2/3 (mesmo layout de `/construction-review`)
- Usa `ConstructionScoreCard` existente (sem props de `teamAnalysis`)
- Usa `ObjectiveChecklistCard` existente

**Controle de Acesso:** `requiresBuAdmin` (apenas admins podem avaliar OKRs org)

```tsx
export default function OrgConstructionReviewPage() {
  const [year, setYear] = useUrlState<number>({ 
    key: 'year', 
    defaultValue: new Date().getFullYear() 
  });
  
  const { objectives, avgScore, approvedCount, ... } = useOrgConstructionReview(year);

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Header com YearSelect */}
      {/* Grid: ConstructionScoreCard + Lista ObjectiveChecklistCard */}
    </div>
  );
}
```

---

### 3.5 Rota (Modificar)

**Arquivo:** `src/routes/okrs.routes.tsx`

```typescript
const OrgConstructionReviewPage = lazy(() => 
  import('@/modules/okrs/pages/OrgConstructionReviewPage')
);

// Na seção Quality & Analysis
<Route 
  path="/okrs/org-construction-review" 
  element={<OkrRoute requiresBuAdmin><OrgConstructionReviewPage /></OkrRoute>} 
/>
```

---

### 3.6 Export do Hook (Modificar)

**Arquivo:** `src/modules/okrs/hooks/index.ts`

```typescript
export { useOrgConstructionReview } from './useOrgConstructionReview';
```

---

## 4. Resumo de Arquivos

| Arquivo | Operação | Propósito |
|---------|----------|-----------|
| `src/lib/queryKeys/okrs.ts` | Modificar | Adicionar `orgConstructionReview` key |
| `supabase/functions/okr-construction-review/index.ts` | Modificar | Suportar `isOrgLevel` flag + prompt adaptado |
| `src/modules/okrs/hooks/useOrgConstructionReview.ts` | **Criar** | Hook para buscar e avaliar OKRs org |
| `src/modules/okrs/pages/OrgConstructionReviewPage.tsx` | **Criar** | Página principal |
| `src/routes/okrs.routes.tsx` | Modificar | Adicionar rota |
| `src/modules/okrs/hooks/index.ts` | Modificar | Export do novo hook |

---

## 5. Compatibilidade com Padrões do Hub

| Padrão | Status | Implementação |
|--------|--------|---------------|
| Query Keys centralizadas | ✅ | `src/lib/queryKeys` |
| useBuScopedSupabase | ✅ | Usado no hook |
| Lazy loading | ✅ | `lazy()` para página |
| URL state | ✅ | `useUrlState` para ano |
| Controle de acesso | ✅ | `requiresBuAdmin` na rota |
| Reutilização de componentes | ✅ | 100% reuso |
| Agente correto | ✅ | `validador-metodologico-okrs` |

---

## 6. Ordem de Execução

1. **Query Key** — Adicionar `orgConstructionReview` em `okrs.ts`
2. **Edge Function** — Suportar flag `isOrgLevel` e prompt adaptado
3. **Hook** — Criar `useOrgConstructionReview.ts`
4. **Página** — Criar `OrgConstructionReviewPage.tsx`
5. **Rota** — Adicionar em `okrs.routes.tsx`
6. **Export** — Atualizar `hooks/index.ts`

---

## 7. Validação Pós-Implementação

| Cenário | Esperado |
|---------|----------|
| Acessar `/okrs/org-construction-review` como admin | ✅ Visualiza página |
| Acessar como não-admin | ❌ Redirect (via `requiresBuAdmin`) |
| Selecionar ano sem OKRs org | Alert "Nenhum objetivo encontrado" |
| Selecionar ano com OKRs | Cards com avaliação IA |
| Clicar "Reavaliar" | Edge function re-invocada |
| Score médio calculado | Baseado nas avaliações individuais |
| Prompt IA | Focado em contexto estratégico/C-Level |
