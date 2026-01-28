
# Plano: Expansão do Módulo Gifts com Campos Estruturados

## 1. Análise de Reaproveitamento (Conforme TCR + DEVELOPMENT_STANDARDS)

### Recursos Reutilizáveis do Inventory

| Recurso | Localização | Reaproveitamento |
|---------|-------------|------------------|
| `asset_categories` | Tabela (parent_id para hierarquia) | ✅ Compartilhar com Gifts |
| `bu_locations` | Tabela | ✅ Usar para localização |
| `useLocations()` | Hook existente | ✅ Reaproveitar diretamente |
| `useAssetCategoriesQuery()` | Hook existente | ✅ Reaproveitar diretamente |
| `buildSubcategoryList()` | Utility existente | ✅ Reaproveitar para agrupar |
| `external_companies` + `external_company_bu_associations` | Tabelas existentes | ✅ Usar com `role='supplier'` |

### Estado Atual do Banco

**asset_gift_items (atual):**
```
id, bu_id, name, category (TEXT), status, notes, created_at, created_by, updated_at, deleted_at
```

**external_company_bu_associations (confirmado):**
```
id, external_company_id, bu_id, is_active, notes, role, ...
```
O campo `role` existe e suporta: `partner`, `supplier`, `customer`

---

## 2. Migration: Expandir asset_gift_items

```sql
-- Adicionar campos estruturados (semelhante ao asset_inventory)
ALTER TABLE asset_gift_items
  ADD COLUMN category_id UUID REFERENCES asset_categories(id),
  ADD COLUMN supplier_id UUID REFERENCES external_companies(id),
  ADD COLUMN home_location_id UUID REFERENCES bu_locations(id),
  ADD COLUMN acquired_at DATE,
  ADD COLUMN acquisition_value NUMERIC(12,2),
  ADD COLUMN quantity_total INTEGER DEFAULT 0;

-- Índices para performance
CREATE INDEX idx_gift_items_category ON asset_gift_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gift_items_supplier ON asset_gift_items(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gift_items_location ON asset_gift_items(home_location_id) WHERE deleted_at IS NULL;

-- Comentários de documentação
COMMENT ON COLUMN asset_gift_items.category_id IS 'FK para asset_categories (subcategoria hierárquica)';
COMMENT ON COLUMN asset_gift_items.supplier_id IS 'FK para external_companies (fornecedor)';
COMMENT ON COLUMN asset_gift_items.home_location_id IS 'FK para bu_locations (localização base)';
COMMENT ON COLUMN asset_gift_items.category IS 'LEGADO: Campo texto livre. Preferir category_id.';
```

---

## 3. Módulo Suppliers (Novo)

### 3.1 Query Keys

**Arquivo:** `src/lib/queryKeys/suppliers.ts`

```typescript
export const suppliersKeys = {
  all: (buId: string | null) => ['suppliers', buId] as const,
  list: (buId: string | null, filters?: { search?: string }) => 
    ['suppliers', 'list', buId, filters] as const,
  search: (term: string | null) => 
    ['suppliers', 'search', term] as const,
} as const;
```

### 3.2 Hook: useSuppliers

**Arquivo:** `src/modules/suppliers/hooks/useSuppliers.ts`

Lista empresas com `role='supplier'` associadas à BU atual via `external_company_bu_associations`.

Padrão conforme DEVELOPMENT_STANDARDS:
- Usar `useBuScopedSupabase()` (POST-BU)
- Campos explícitos (proibido `select('*')`)
- staleTime de 5 minutos

### 3.3 Hook: useSearchExternalCompany

**Arquivo:** `src/modules/suppliers/hooks/useSearchExternalCompany.ts`

Busca global em `external_companies` por nome ou CNPJ:
- Se termo >= 11 dígitos numéricos → busca por `document`
- Se termo >= 3 caracteres → busca por `name` (ilike)
- Usa cliente global (tabela não é BU-scoped)

### 3.4 Hook: useEnsureSupplierInBu

**Arquivo:** `src/modules/suppliers/hooks/useEnsureSupplierInBu.ts`

Ao selecionar empresa no combobox:
1. Verifica se já existe associação com `role='supplier'` na BU
2. Se não existe → cria via `external_company_bu_associations`
3. Retorna para o formulário usar

---

## 4. Componente: SupplierCombobox

**Arquivo:** `src/modules/assets/components/gifts/SupplierCombobox.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Fornecedor                                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Buscar por nome ou CNPJ...                   ▾  │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Gráfica ABC             12.345.678/0001-90      │ │
│ │ Brindes XYZ             98.765.432/0001-10      │ │
│ │ ──────────────────────────────────────────────  │ │
│ │ + Cadastrar "Nova Gráfica"                      │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Usa Popover + Command (cmdk) seguindo padrão existente do Hub.

---

## 5. Atualização: GiftItemDialog

### Novo Schema (Zod)

```typescript
const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  category_id: z.string().uuid("Subcategoria obrigatória"),
  supplier_id: z.string().uuid().optional().nullable(),
  home_location_id: z.string().uuid("Localização obrigatória"),
  room_id: z.string().uuid().optional(), // Sala dependente da localização
  acquired_at: z.string().optional(),
  acquisition_value: z.coerce.number().min(0).optional(),
  quantity_total: z.coerce.number().int().min(1, "Quantidade deve ser >= 1"),
  notes: z.string().optional(),
});
```

### Layout do Formulário

```
┌─────────────────────────────────────────────────────────────────┐
│  Novo Item de Brinde                                            │
├─────────────────────────────────────────────────────────────────┤
│  Nome *                                                         │
│  [Camiseta Oficial_________________________________]            │
│                                                                 │
│  Subcategoria *                                                 │
│  [▼ Selecione a subcategoria...                    ]            │
│    ┌────────────────────────────────────────────┐               │
│    │ Vestuário                                  │               │
│    │   └ Camisetas                              │               │
│    │   └ Bonés                                  │               │
│    │ Escritório                                 │               │
│    │   └ Canetas                                │               │
│    │   └ Cadernos                               │               │
│    └────────────────────────────────────────────┘               │
│                                                                 │
│  Fornecedor                                                     │
│  [Buscar por nome ou CNPJ...                     ▾]             │
│                                                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │ Localização *           │ │ Sala                    │        │
│  │ [▼ Selecione...      ]  │ │ [▼ Selecione...      ]  │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐         │
│  │ Data Aquisição │ Valor Total  │ │ Quantidade *   │         │
│  │ [____/__/____] │ [R$ 0,00___] │ │ [___1________] │         │
│  └──────────────┘ └──────────────┘ └──────────────────┘         │
│                                                                 │
│  Observações                                                    │
│  [___________________________________________________]          │
│                                                                 │
│                              [Cancelar] [Salvar]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Atualização: useGifts Hook

### Campos da Query (POST-BU, campos explícitos)

```typescript
const GIFT_ITEM_FIELDS = `
  id, bu_id, name, category, category_id, supplier_id, home_location_id,
  acquired_at, acquisition_value, quantity_total, status, notes,
  created_at, created_by, updated_at,
  subcategory:asset_categories!category_id(id, name, parent_id),
  supplier:external_companies!supplier_id(id, name, document),
  home_location:bu_locations!home_location_id(id, name)
`;
```

### createItem Mutation Atualizado

```typescript
mutationFn: async (data: CreateGiftItemData) => {
  await client.from("asset_gift_items").insert({
    bu_id: buId!,
    created_by: user?.id,
    name: data.name,
    category_id: data.category_id,
    supplier_id: data.supplier_id || null,
    home_location_id: data.home_location_id,
    acquired_at: data.acquired_at || null,
    acquisition_value: data.acquisition_value || null,
    quantity_total: data.quantity_total || 0,
    notes: data.notes || null,
  });
}
```

---

## 7. Atualização: Tipos

### AssetGiftItem Expandido

```typescript
export interface AssetGiftItem {
  id: string;
  bu_id: string;
  name: string;
  category: string | null;              // LEGADO (texto livre)
  category_id: string | null;           // NOVO (FK estruturada)
  supplier_id: string | null;           // NOVO
  home_location_id: string | null;      // NOVO
  acquired_at: string | null;           // NOVO
  acquisition_value: number | null;     // NOVO
  quantity_total: number;               // NOVO
  status: GiftItemStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  subcategory?: { id: string; name: string; parent_id: string | null } | null;
  supplier?: { id: string; name: string; document: string | null } | null;
  home_location?: { id: string; name: string } | null;
}
```

---

## 8. Atualização: GiftsTable

### Colunas Atualizadas

| Coluna | Dado | Fonte |
|--------|------|-------|
| Item | Nome + ícone | `name` |
| Categoria | Pai → Subcategoria | `subcategory.parent.name` → `subcategory.name` |
| Fornecedor | Nome + doc | `supplier.name`, `supplier.document` |
| Localização | Nome | `home_location.name` |
| Qtd | Quantidade inicial | `quantity_total` |
| Disponível | Calculado | `getItemTotals()` |
| Status | Badge | Baseado em disponível |

---

## 9. Arquivos a Criar/Modificar

### Criar

| Arquivo | Propósito |
|---------|-----------|
| Migration SQL | Expandir asset_gift_items |
| `src/lib/queryKeys/suppliers.ts` | Query keys de suppliers |
| `src/modules/suppliers/types.ts` | Tipos de supplier |
| `src/modules/suppliers/hooks/useSuppliers.ts` | Lista suppliers da BU |
| `src/modules/suppliers/hooks/useSearchExternalCompany.ts` | Busca global |
| `src/modules/suppliers/hooks/useEnsureSupplierInBu.ts` | Auto-ativa supplier |
| `src/modules/suppliers/hooks/index.ts` | Barrel exports |
| `src/modules/suppliers/index.ts` | Module exports |
| `src/modules/assets/components/gifts/SupplierCombobox.tsx` | Combobox de fornecedor |

### Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/modules/assets/types.ts` | Expandir `AssetGiftItem` |
| `src/modules/assets/hooks/useGifts.ts` | Expandir query + mutation |
| `src/modules/assets/components/gifts/GiftItemDialog.tsx` | Novo formulário completo |
| `src/modules/assets/components/gifts/GiftsTable.tsx` | Novas colunas |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | Documentar novos campos |

---

## 10. Ordem de Execução

1. **Migration SQL** — Adicionar colunas em asset_gift_items
2. **suppliersKeys** — Query keys de suppliers
3. **Tipos** — Atualizar `AssetGiftItem` + criar tipos de supplier
4. **Hooks Suppliers** — `useSuppliers`, `useSearchExternalCompany`, `useEnsureSupplierInBu`
5. **SupplierCombobox** — Componente de seleção de fornecedor
6. **useGifts** — Atualizar query com joins e mutation com novos campos
7. **GiftItemDialog** — Novo formulário completo
8. **GiftsTable** — Novas colunas
9. **Documentação** — Atualizar SCHEMA_QUICK_REFERENCE.md

---

## 11. Conformidade com Padrões (TCR + DEVELOPMENT_STANDARDS)

| Regra | Status |
|-------|--------|
| POST-BU: usar `useBuScopedSupabase()` | ✅ |
| Proibido `select('*')` | ✅ Campos explícitos |
| Query keys via `queryKeys` | ✅ Criando `suppliersKeys` |
| Identity: usar `profiles.id` | ✅ `created_by` é profile |
| staleTime configurado | ✅ 5min categorias, 2min items |
| Insert com `bu_id` explícito | ✅ |
| RLS existente aproveitada | ✅ `asset_gift_items` já tem RLS |

---

## 12. Considerações de Segurança

### RLS

- `asset_gift_items` já possui RLS BU-scoped existente
- `external_companies` é global (sem BU) — busca usa client global
- `external_company_bu_associations` tem RLS BU-scoped
- Joins funcionam via FK, RLS valida acesso

### Busca de Fornecedores

A busca global em `external_companies` é intencional (empresas são globais). A associação como supplier na BU é criada automaticamente ao selecionar, garantindo visibilidade futura.
