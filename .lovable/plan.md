
# Plano Revisado: Recomendações de Equipamentos

## Resultado da Análise Pré-Implementação

### ✅ TCR e Docs Canônicos Consultados
- TCR v2.93.0, DATA_MODEL_REGISTRY.md, DEVELOPMENT_STANDARDS.md v1.20.0
- RESPONSIBILITY_MIGRATION_POLICY.md (para integração RTS)
- IDENTITY_CONVENTION.md (para owner_user_id)

### ✅ Componentes Existentes a Reutilizar

| Existente | Uso na Feature |
|-----------|----------------|
| `JobTitleSelect` | Seleção de cargo único |
| `useActiveJobTitles` | Fonte de dados para cargos |
| `MultiTeamSelect` | Base para `MultiJobTitleSelect` |
| `useBrands` | Autocomplete de marcas (existente) |
| `AssetCategorySelect` | Seleção de categoria/subcategoria |
| `BuUserSelect` | Seleção de responsável |
| `useAssetPermissionsV2` | Estender com flags de recommendations |
| `useUserDependencies` | Adicionar recommendations como mandatória |

### ✅ Estrutura de Dados Simplificada

**Decisão:** 1 tabela apenas, usando arrays para escopos (padrão existente em `job_titles.bu_ids[]`)

---

## 1. Modelo de Dados

### 1.1 Nova Tabela: `asset_recommendations`

```sql
CREATE TABLE public.asset_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id uuid NOT NULL REFERENCES bu_units(id),
  
  -- Identificação
  name text NOT NULL,
  category_id uuid REFERENCES asset_categories(id),
  brand text NOT NULL,                    -- Obrigatório (reaproveitando autocomplete)
  model text,                              -- Opcional
  description text,                        -- Especificações e links
  
  -- Aplicabilidade (arrays, padrão do Hub)
  applicable_team_ids uuid[] DEFAULT '{}',     -- Times aplicáveis
  applicable_job_title_ids uuid[] DEFAULT '{}', -- Cargos aplicáveis
  
  -- Governança
  review_interval_months integer NOT NULL DEFAULT 6,
  last_reviewed_at timestamptz,
  owner_user_id uuid NOT NULL REFERENCES profiles(id), -- Responsável
  created_by_user_id uuid REFERENCES profiles(id),     -- Criador
  
  -- Metadados
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,                 -- Soft delete
  
  CONSTRAINT asset_recommendations_bu_fk FOREIGN KEY (bu_id) 
    REFERENCES bu_units(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_asset_recommendations_bu_active 
  ON asset_recommendations(bu_id) 
  WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX idx_asset_recommendations_owner 
  ON asset_recommendations(owner_user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_recommendations_teams 
  ON asset_recommendations USING GIN (applicable_team_ids) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_recommendations_job_titles 
  ON asset_recommendations USING GIN (applicable_job_title_ids) 
  WHERE deleted_at IS NULL;
```

### 1.2 Coluna Adicional em `asset_inventory`

```sql
-- Única alteração em tabela existente
ALTER TABLE public.asset_inventory 
  ADD COLUMN recommendation_id uuid REFERENCES asset_recommendations(id);

-- Índice para histórico de compras por recomendação
CREATE INDEX idx_asset_inventory_recommendation 
  ON asset_inventory(recommendation_id) 
  WHERE deleted_at IS NULL AND recommendation_id IS NOT NULL;
```

### 1.3 RLS Policies

```sql
-- SELECT: Membros da BU podem ver
CREATE POLICY "recommendations_select_bu" 
  ON asset_recommendations FOR SELECT
  USING (
    is_current_bu(bu_id) 
    AND deleted_at IS NULL
  );

-- INSERT: Usuários com permissão
CREATE POLICY "recommendations_insert" 
  ON asset_recommendations FOR INSERT
  WITH CHECK (
    is_current_bu(bu_id) 
    AND has_permission(my_profile_id(), bu_id, 'assets.recommendations.create:bu')
  );

-- UPDATE: Owner ou admin
CREATE POLICY "recommendations_update" 
  ON asset_recommendations FOR UPDATE
  USING (
    is_current_bu(bu_id) 
    AND (
      owner_user_id = my_profile_id() 
      OR has_permission(my_profile_id(), bu_id, 'assets.recommendations.update:bu')
    )
  );

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON asset_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para bu_id enforcement
CREATE TRIGGER enforce_bu_scope
  BEFORE INSERT ON asset_recommendations
  FOR EACH ROW EXECUTE FUNCTION assert_bu_scope();
```

---

## 2. Tipos TypeScript

### Extensão em `src/modules/assets/types.ts`

```typescript
// =============================================
// RECOMENDAÇÕES DE EQUIPAMENTOS
// =============================================

export type RecommendationStatus = 'active' | 'archived';
export type RecommendationReviewStatus = 'up_to_date' | 'due_soon' | 'overdue';
export type RecommendationScopeType = 'global' | 'team' | 'job_title';

export interface AssetRecommendation {
  id: string;
  bu_id: string;
  name: string;
  category_id: string | null;
  brand: string;
  model: string | null;
  description: string | null;
  applicable_team_ids: string[];
  applicable_job_title_ids: string[];
  review_interval_months: number;
  last_reviewed_at: string | null;
  owner_user_id: string;
  created_by_user_id: string | null;
  status: RecommendationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  category?: { id: string; name: string; parent_name?: string } | null;
  owner?: { id: string; display_name: string; photo_url: string | null } | null;
  created_by?: { id: string; display_name: string } | null;
  // Computed
  review_status?: RecommendationReviewStatus;
  scope_type?: RecommendationScopeType;
  last_purchase_value?: number | null;
  last_purchase_date?: string | null;
}

export const RECOMMENDATION_REVIEW_STATUS_LABELS: Record<RecommendationReviewStatus, string> = {
  up_to_date: 'Em dia',
  due_soon: 'Vence em breve',
  overdue: 'Vencida',
};

export const RECOMMENDATION_SCOPE_TYPE_LABELS: Record<RecommendationScopeType, string> = {
  global: 'Global',
  team: 'Time',
  job_title: 'Cargo',
};

export const REVIEW_INTERVAL_OPTIONS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];
```

---

## 3. Componentes Novos (Apenas o Necessário)

### 3.1 MultiJobTitleSelect (baseado em MultiTeamSelect)

Localização: `src/components/selects/MultiJobTitleSelect.tsx`

Reutiliza 100% da estrutura de `MultiTeamSelect`, trocando:
- `useHierarchicalTeamList` → `useActiveJobTitles`
- Sem indentação hierárquica (cargos são flat)

### 3.2 Componentes de Recomendações

```text
src/modules/assets/components/recommendations/
├── RecommendationsTable.tsx       # Tabela com colunas essenciais
├── RecommendationFormDialog.tsx   # CRUD (reutiliza AssetCategorySelect, useBrands, BuUserSelect)
├── RecommendationDetailSheet.tsx  # Visualização + "Marcar Revisada"
├── RecommendationFilters.tsx      # Filtros via URL state
├── RecommendationReviewBadge.tsx  # Badge de status (reutiliza Badge existente)
├── RecommendationScopeBadge.tsx   # Badge de escopo
├── RecommendationSelectStep.tsx   # Step opcional no InventoryFormDialog
└── index.ts
```

### 3.3 Lib de Utilitários

```typescript
// src/modules/assets/lib/recommendationUtils.ts
import { differenceInDays, addMonths } from 'date-fns';

export function getReviewStatus(
  lastReviewedAt: string | null,
  reviewIntervalMonths: number
): RecommendationReviewStatus {
  if (!lastReviewedAt) return 'overdue';
  
  const nextDue = addMonths(new Date(lastReviewedAt), reviewIntervalMonths);
  const daysUntil = differenceInDays(nextDue, new Date());
  
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 14) return 'due_soon';
  return 'up_to_date';
}

export function getScopeType(
  teamIds: string[],
  jobTitleIds: string[]
): RecommendationScopeType {
  if (jobTitleIds.length > 0) return 'job_title';
  if (teamIds.length > 0) return 'team';
  return 'global';
}

export function scoreRecommendation(
  rec: AssetRecommendation,
  userTeamId?: string,
  userJobTitleId?: string
): number {
  // Cargo > Time > Global
  if (userJobTitleId && rec.applicable_job_title_ids.includes(userJobTitleId)) {
    return 100;
  }
  if (userTeamId && rec.applicable_team_ids.includes(userTeamId)) {
    return 10;
  }
  if (rec.applicable_team_ids.length === 0 && rec.applicable_job_title_ids.length === 0) {
    return 1; // Global
  }
  return 0; // Não aplicável
}
```

---

## 4. Hooks

### 4.1 useRecommendations

```typescript
// src/modules/assets/hooks/useRecommendations.ts
export function useRecommendations(filters?: RecommendationFilters) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  
  return useQuery({
    queryKey: queryKeys.assets.recommendations.list(currentBu?.id, filters),
    queryFn: async () => {
      let query = supabase
        .from('asset_recommendations')
        .select(`
          id, bu_id, name, brand, model, description,
          applicable_team_ids, applicable_job_title_ids,
          review_interval_months, last_reviewed_at,
          owner_user_id, status, created_at, updated_at,
          category:asset_categories!category_id(id, name, parent:asset_categories!parent_id(name)),
          owner:profiles!owner_user_id(id, display_name, photo_url)
        `)
        .eq('bu_id', currentBu!.id)
        .is('deleted_at', null)
        .order('name');

      // Aplicar filtros...
      const { data, error } = await query;
      if (error) throw error;
      
      // Enriquecer com review_status e scope_type
      return data.map(rec => ({
        ...rec,
        review_status: getReviewStatus(rec.last_reviewed_at, rec.review_interval_months),
        scope_type: getScopeType(rec.applicable_team_ids, rec.applicable_job_title_ids),
      }));
    },
    enabled: !!currentBu?.id,
  });
}

// Mutations: create, update, delete, markReviewed
```

### 4.2 useLastPurchaseValue

```typescript
export function useLastPurchaseValue(recommendationId: string | null) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.assets.recommendations.lastValue(recommendationId),
    queryFn: async () => {
      const { data } = await supabase
        .from('asset_inventory')
        .select('acquisition_value, acquired_at')
        .eq('recommendation_id', recommendationId!)
        .is('deleted_at', null)
        .not('acquisition_value', 'is', null)
        .order('acquired_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      
      return data ? { value: data.acquisition_value, date: data.acquired_at } : null;
    },
    enabled: !!recommendationId,
  });
}
```

---

## 5. Query Keys

Adicionar em `src/lib/queryKeys/assets.ts`:

```typescript
// Recommendations
recommendations: {
  all: (buId: string | null) => ['assets', 'recommendations', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) => 
    ['assets', 'recommendations', 'list', buId, filters] as const,
  detail: (id: string) => ['assets', 'recommendations', 'detail', id] as const,
  best: (params: Record<string, unknown>) => 
    ['assets', 'recommendations', 'best', params] as const,
  lastValue: (id: string | null) => 
    ['assets', 'recommendations', 'lastValue', id] as const,
},
```

---

## 6. Integração com Cadastro de Inventário

### 6.1 Modificar `useInventoryForm.ts`

Adicionar campo `recommendation_id` ao form e lógica de preenchimento:

```typescript
// Novo estado
const [selectedRecommendation, setSelectedRecommendation] = useState<AssetRecommendation | null>(null);

// Quando recomendação é selecionada
const handleRecommendationSelect = (rec: AssetRecommendation) => {
  setSelectedRecommendation(rec);
  
  // Preencher campos vazios
  if (!form.getValues('name')) form.setValue('name', rec.name);
  if (!form.getValues('category_id')) form.setValue('category_id', rec.category_id);
  if (!form.getValues('brand')) form.setValue('brand', rec.brand);
  if (!form.getValues('model') && rec.model) form.setValue('model', rec.model);
};

// No payload de submit
const payload = {
  ...existingFields,
  recommendation_id: selectedRecommendation?.id || undefined,
};
```

### 6.2 Modificar `InventoryFormDialog.tsx`

Adicionar step opcional no início:

```typescript
// Estado de step
const [step, setStep] = useState<'recommendation' | 'form'>('recommendation');

// Render condicional
{step === 'recommendation' ? (
  <RecommendationSelectStep
    onSelect={(rec) => {
      handleRecommendationSelect(rec);
      setStep('form');
    }}
    onSkip={() => setStep('form')}
  />
) : (
  <Form>{/* form existente */}</Form>
)}
```

---

## 7. Integração com RTS (Responsibility Transfer System)

### 7.1 Modificar `useUserDependencies.ts`

Adicionar recomendações como dependência **mandatória**:

```typescript
// Adicionar query
const { data: assetRecommendations = [], isLoading: recommendationsLoading } = useQuery({
  queryKey: [...queryKeys.assets.recommendations.all(buId), "owner", profileId],
  enabled: !!buId && !!profileId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("asset_recommendations")
      .select("id, name")
      .eq("bu_id", buId!)
      .eq("owner_user_id", profileId!)
      .is("deleted_at", null)
      .eq("status", "active");
    if (error) throw error;
    return (data || []).map((r) => ({ id: r.id, name: r.name }));
  },
});

// Adicionar ao retorno
mandatory: {
  ...existing,
  assetRecommendations,
}
```

---

## 8. Permissões

### 8.1 Novas Permission Keys

| Key | Descrição |
|-----|-----------|
| `assets.recommendations.view:bu` | Visualizar recomendações |
| `assets.recommendations.create:bu` | Criar recomendações |
| `assets.recommendations.update:bu` | Editar recomendações |
| `assets.recommendations.review:bu` | Marcar como revisada |

### 8.2 Estender `useAssetPermissionsV2`

```typescript
// Adicionar flags
canViewRecommendations: boolean;
canManageRecommendations: boolean;
canReviewRecommendations: boolean;
```

---

## 9. UI de Acesso

### 9.1 Botão no Header de AssetsPage

```typescript
// src/modules/assets/pages/AssetsPage.tsx
<PageHeader
  title="Ativos"
  description={`Gerencie inventário, chaveiros e brindes da ${currentBu?.name}`}
  breadcrumbs={[{ label: "Ativos" }]}
  actions={
    <div className="flex items-center gap-2">
      {canViewRecommendations && (
        <Button variant="outline" size="sm" asChild>
          <Link to="/assets/recommendations">
            <Lightbulb className="h-4 w-4 mr-2" />
            Recomendações
          </Link>
        </Button>
      )}
      <SavedLinksPopover moduleSlug="assets" />
    </div>
  }
/>
```

---

## 10. Arquivos a Criar/Modificar

### Novos (9 arquivos)

| Arquivo | Descrição |
|---------|-----------|
| Migration SQL | Tabela + RLS |
| `src/modules/assets/types.ts` | + tipos Recommendation |
| `src/modules/assets/hooks/useRecommendations.ts` | Queries/mutations |
| `src/modules/assets/pages/RecommendationsPage.tsx` | Listagem |
| `src/modules/assets/components/recommendations/*.tsx` | 7 componentes |
| `src/modules/assets/lib/recommendationUtils.ts` | Helpers |
| `src/components/selects/MultiJobTitleSelect.tsx` | Multi-select cargos |

### Modificar (6 arquivos)

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/queryKeys/assets.ts` | + recommendations keys |
| `src/modules/assets/hooks/index.ts` | + export |
| `src/modules/assets/hooks/useAssetPermissionsV2.ts` | + flags |
| `src/modules/assets/components/inventory/form/useInventoryForm.ts` | + recommendation support |
| `src/modules/assets/pages/AssetsPage.tsx` | + botão header |
| `src/hooks/useUserDependencies.ts` | + assetRecommendations |
| `src/routes/assets.routes.tsx` | + rota |

---

## Benefícios do Plano Revisado

1. **1 tabela** ao invés de 2 (modelo simplificado)
2. **1 coluna** adicionada em tabela existente (`recommendation_id`)
3. **Máximo reaproveitamento** de componentes e hooks existentes
4. **Padrão de arrays** igual ao usado em `job_titles.bu_ids[]`
5. **Integração RTS** conforme RESPONSIBILITY_MIGRATION_POLICY.md
6. **Governança leve** sem workflow pesado
