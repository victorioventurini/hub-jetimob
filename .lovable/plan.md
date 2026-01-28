

# Plano: Atualização da Documentação Técnica

## 1. Resumo das Implementações Recentes

As seguintes features foram implementadas e precisam ser documentadas:

| Feature | Descrição |
|---------|-----------|
| **Asset Gifts Structured Fields v1.0** | Novos campos em `asset_gift_items`: `category_id`, `supplier_id`, `home_location_id`, `acquired_at`, `acquisition_value`, `quantity_total`, `photos` |
| **Asset Photo Upload System v1.0** | Upload de fotos para Inventory, Gifts e Keys via bucket `asset-photos` com RLS |
| **Suppliers Module v1.0** | Novo módulo em `src/modules/suppliers/` com hooks e tipos para fornecedores |
| **has_any_asset_permission() v1.0** | Nova função SQL para RLS do bucket de fotos |

---

## 2. Arquivos a Atualizar

### 2.1 SCHEMA_QUICK_REFERENCE.md

Atualizar a seção Assets:

**asset_gift_items** (linha 44):
```
ANTES:
`id, bu_id, name, category, status, notes, created_at, created_by, updated_at, deleted_at`

DEPOIS:
`id, bu_id, name, category, category_id, supplier_id, home_location_id, acquired_at, acquisition_value, quantity_total, photos, status, notes, created_at, created_by, updated_at, deleted_at`
```

**asset_keyrings** (linha 65):
```
ANTES:
`id, bu_id, claviculary_id, hook_id, name, tag_number, status, current_user_id, notes, created_at, created_by, updated_at, deleted_at`

DEPOIS:
`id, bu_id, claviculary_id, hook_id, name, tag_number, status, current_user_id, photos, notes, created_at, created_by, updated_at, deleted_at`
```

**Adicionar seção External Companies** (se não existir):
```markdown
## External Companies (Suppliers/Partners)

### external_companies
`id, bu_id, name, legal_name, allowed_domains, status, notes, created_at, created_by, updated_at, deleted_at, person_type, document, document_type`

> Usado para Parceiros (role='partner') e Fornecedores (role='supplier') via `external_company_bu_associations.role`

### external_company_bu_associations
`id, external_company_id, bu_id, is_active, notes, role, created_at, created_by, updated_at, deleted_at, default_contact_ids, supervisor_profile_ids, supervisor_contact_ids`
```

---

### 2.2 TECHNICAL_CONTEXT_REGISTRY.md

**Atualizar versão** (linha 3):
```markdown
**Versão:** 2.75.0
```

**Atualizar última atualização** (linha 4):
```markdown
**Última atualização:** 2026-01-28
```

**Atualizar Status** (linha 6) - adicionar no final:
```markdown
| **Asset Gifts Structured Fields v1.0** | **Asset Photo Upload System v1.0** | **Suppliers Module v1.0**
```

**Adicionar nova seção no domínio Assets** (após seção existente de Asset):

```markdown
#### **asset-photos** — Storage Bucket (v2.75.0)

Bucket público para fotos de ativos com RLS baseada em permissões.

| Característica | Valor |
|---------------|-------|
| Bucket ID | `asset-photos` |
| Público | ✅ (leitura via Image Transformations) |
| Limite de Tamanho | 5MB |
| Tipos Permitidos | image/jpeg, image/png, image/webp |
| RLS | `has_any_asset_permission(auth.uid())` |

**Organização:**
```
asset-photos/
├── inventory/{item_id}/
├── gifts/{item_id}/
└── keys/{keyring_id}/
```

**Otimização:** URLs são transformadas via `getOptimizedAssetPhotoUrl()` para thumbnails sob demanda.
```

**Adicionar entrada no módulo Suppliers:**

```markdown
#### **Suppliers Module** (v2.75.0)

Módulo de fornecedores que reutiliza `external_companies` com `role='supplier'`.

| Arquivo | Propósito |
|---------|-----------|
| `src/modules/suppliers/types.ts` | Tipos `Supplier`, `SupplierBuAssociation`, `SearchedCompany` |
| `src/modules/suppliers/hooks/useSuppliers.ts` | Lista fornecedores da BU |
| `src/modules/suppliers/hooks/useSearchExternalCompany.ts` | Busca global por nome/CNPJ |
| `src/modules/suppliers/hooks/useEnsureSupplierInBu.ts` | Auto-associa empresa como supplier |
| `src/lib/queryKeys/suppliers.ts` | Query keys centralizadas |

**Regra:** Fornecedores são empresas globais (`external_companies`) associadas à BU com `role='supplier'` via `external_company_bu_associations`.
```

---

### 2.3 DATA_MODEL_REGISTRY.md

Adicionar nota de regeneração necessária no topo:

```markdown
> ⚠️ **REGENERAÇÃO PENDENTE** (2026-01-28)
> Novos campos adicionados: `asset_gift_items.{category_id, supplier_id, home_location_id, acquired_at, acquisition_value, quantity_total, photos}`, `asset_keyrings.photos`
> Nova função: `has_any_asset_permission()`
> Novo bucket: `asset-photos`
> Regenerar com: `npx tsx scripts/generate-data-model-registry.ts`
```

---

### 2.4 Hooks Canônicos (atualizar seção 1.6 do TCR)

Adicionar na tabela de hooks canônicos:

```markdown
| **Fornecedores** | `useSuppliers()` | Lista suppliers da BU atual |
| **Busca Empresas** | `useSearchExternalCompany()` | Busca global em external_companies |
| **Permissões Assets** | `useAssetPermissionsV2()` | Permissões do módulo Assets via V2 |
```

---

### 2.5 Componentes Canônicos (atualizar seção 1.6 do TCR)

Adicionar na tabela de componentes:

```markdown
| **Upload de fotos** | `AssetPhotoUpload` | Upload múltiplo de fotos para assets |
| **Galeria de fotos** | `AssetPhotoGallery` | Grid com lightbox para visualização |
| **Select de fornecedor** | `SupplierCombobox` | Combobox de busca/seleção de fornecedor |
```

---

### 2.6 imageUtils.ts (documentar no TCR)

Adicionar seção de utilitários de imagem:

```markdown
#### Image Utilities (v2.75.0)

| Função | Descrição |
|--------|-----------|
| `getOptimizedAvatarUrl(url, size)` | URL otimizada para avatars (sm/md/lg) |
| `getOptimizedAssetPhotoUrl(url, size)` | URL otimizada para fotos de assets (thumbnail/preview/full) |
| `preloadAvatarImages(urls, size)` | Pré-carrega avatars |
| `preloadAssetPhotos(urls, size)` | Pré-carrega fotos de assets |

**Tamanhos de Asset Photo:**
- `thumbnail`: 100x100px (listagens)
- `preview`: 400x400px (modais)
- `full`: 1200x1200px (download)
```

---

## 3. Checklist de Atualização

| Arquivo | Seção | Status |
|---------|-------|--------|
| `SCHEMA_QUICK_REFERENCE.md` | asset_gift_items | Atualizar colunas |
| `SCHEMA_QUICK_REFERENCE.md` | asset_keyrings | Atualizar colunas |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Versão | 2.74.0 → 2.75.0 |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Status | Adicionar features |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Assets domain | Adicionar bucket |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Suppliers module | Nova seção |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Hooks canônicos | Adicionar suppliers |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Componentes | Adicionar upload/gallery |
| `TECHNICAL_CONTEXT_REGISTRY.md` | Image utils | Nova seção |
| `DATA_MODEL_REGISTRY.md` | Header | Nota de regeneração |

---

## 4. Ordem de Execução

1. **SCHEMA_QUICK_REFERENCE.md** — Atualizar colunas das tabelas
2. **TECHNICAL_CONTEXT_REGISTRY.md** — Incrementar versão e adicionar todas as seções
3. **DATA_MODEL_REGISTRY.md** — Adicionar nota de regeneração

---

## 5. Conformidade

| Regra | Status |
|-------|--------|
| Versão incrementada | ✅ 2.74.0 → 2.75.0 |
| Data atualizada | ✅ 2026-01-28 |
| Status atualizado | ✅ Features adicionadas |
| Schema documentado | ✅ Novos campos |
| Hooks documentados | ✅ Suppliers hooks |
| Componentes documentados | ✅ Upload/Gallery |
| Bucket documentado | ✅ asset-photos |

