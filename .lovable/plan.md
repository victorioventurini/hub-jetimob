
# Plano: Upload de Fotos nos Módulos de Assets

## 1. Análise do Contexto Atual

### Estado das Tabelas

| Tabela | Campo `photos` | Status |
|--------|----------------|--------|
| `asset_inventory` | ✅ Existe (`photos: string[]`) | Falta apenas UI |
| `asset_gift_items` | ❌ Não existe | Precisa migration |
| `asset_keyrings` | ❌ Não existe | Precisa migration |

### Otimização Existente (Reutilizável)

O `src/lib/imageUtils.ts` já usa **Supabase Image Transformations**:

```typescript
// Transforma URL de storage em versão otimizada:
// /storage/v1/object/public/bucket/path
// → /storage/v1/render/image/public/bucket/path?width=X&height=X&resize=cover&quality=80
```

**Vantagem:** Não precisamos redimensionar no upload. A otimização é feita sob demanda pelo Supabase, gerando thumbnails automaticamente.

### Buckets Existentes

| Bucket | Público | Upload Policy |
|--------|---------|---------------|
| `avatars` | ✅ | Usuário autenticado |
| `bu-assets` | ✅ | Apenas platform_admin ❌ |
| `ticket-attachments` | ❌ | BU-scoped |

**Problema:** `bu-assets` é muito restritivo. Gestores de assets não conseguem fazer upload.

---

## 2. Arquitetura Proposta

### 2.1 Novo Bucket: `asset-photos`

```sql
-- Bucket público para leitura (thumbnails via Image Transformations)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-photos', 
  'asset-photos', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS: Upload para quem tem permissão de gestão de assets
CREATE POLICY "Asset managers can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-photos' 
  AND has_any_asset_permission(auth.uid())
);

-- RLS: Update para quem tem permissão
CREATE POLICY "Asset managers can update photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'asset-photos' 
  AND has_any_asset_permission(auth.uid())
);

-- RLS: Delete para quem tem permissão
CREATE POLICY "Asset managers can delete photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-photos' 
  AND has_any_asset_permission(auth.uid())
);

-- RLS: Leitura pública (bucket é público)
CREATE POLICY "Public can view asset photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-photos');
```

### 2.2 Função Helper para RLS

```sql
CREATE OR REPLACE FUNCTION public.has_any_asset_permission(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_permission_templates_v2 bupt
    JOIN permission_template_items_v2 pti ON pti.template_id = bupt.template_id
    WHERE bupt.user_id = (SELECT id FROM profiles WHERE user_id = p_user_id)
    AND pti.permission_key LIKE 'assets.%'
  )
  OR public.is_platform_admin(p_user_id);
$$;
```

---

## 3. Expansão do imageUtils.ts

### Novos Tipos de Tamanho

```typescript
export type AssetPhotoSize = 'thumbnail' | 'preview' | 'full';

const ASSET_PHOTO_SIZES: Record<AssetPhotoSize, { width: number; height: number }> = {
  thumbnail: { width: 100, height: 100 },   // Para listagens e cards
  preview: { width: 400, height: 400 },     // Para modal de preview
  full: { width: 1200, height: 1200 },      // Para download/visualização completa
};

/**
 * Gera URL otimizada para foto de asset usando Image Transformations.
 */
export function getOptimizedAssetPhotoUrl(
  url: string | null | undefined,
  size: AssetPhotoSize = 'preview'
): string | undefined {
  if (!url) return undefined;
  
  const isSupabaseStorage = url.includes('/storage/v1/object/public/');
  if (!isSupabaseStorage) return url;
  
  const { width, height } = ASSET_PHOTO_SIZES[size];
  
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  
  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}width=${width}&height=${height}&resize=contain&quality=80`;
}
```

---

## 4. Componente Reutilizável: AssetPhotoUpload

### Interface

```typescript
interface AssetPhotoUploadProps {
  /** Array de URLs das fotos */
  value: string[];
  
  /** Callback quando array muda */
  onChange: (urls: string[]) => void;
  
  /** Máximo de fotos permitidas */
  maxPhotos?: number;
  
  /** Pasta no bucket (inventory, gifts, keys) */
  folder: 'inventory' | 'gifts' | 'keys';
  
  /** ID do item (para organização no storage) */
  itemId: string;
  
  /** Desabilitar upload */
  disabled?: boolean;
}
```

### Funcionalidades

- Upload múltiplo (drag & drop)
- Preview com thumbnails otimizados
- Reordenação (drag & drop)
- Remoção individual
- Limite configurável (default: 5 fotos)
- Validação de tipo (JPG, PNG, WebP)
- Validação de tamanho (max 5MB)
- Loading states

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Fotos                                                          │
│                                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────────┐                  │
│  │ 📷   │ │ 📷   │ │ 📷   │ │  + Adicionar   │                  │
│  │ [x]  │ │ [x]  │ │ [x]  │ │    foto        │                  │
│  └──────┘ └──────┘ └──────┘ └────────────────┘                  │
│                                                                 │
│  Arraste para reordenar • Máx. 5 fotos • JPG, PNG ou WebP       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Componente: AssetPhotoGallery

Para exibição nas páginas de detalhe:

```typescript
interface AssetPhotoGalleryProps {
  photos: string[];
  alt?: string;
}
```

### Funcionalidades

- Grid responsivo de thumbnails
- Lightbox ao clicar (modal fullscreen)
- Navegação entre fotos (setas)
- Download da foto original
- Keyboard navigation (← → Esc)

---

## 6. Migration: Adicionar campos photos

```sql
-- Adicionar campo photos em asset_gift_items
ALTER TABLE asset_gift_items
ADD COLUMN photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN asset_gift_items.photos IS 'Array de URLs de fotos do item de brinde';

-- Adicionar campo photos em asset_keyrings
ALTER TABLE asset_keyrings  
ADD COLUMN photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN asset_keyrings.photos IS 'Array de URLs de fotos do chaveiro';
```

---

## 7. Integração nos Formulários

### 7.1 InventoryFormFields.tsx

Adicionar seção de fotos após "Observações":

```tsx
{/* Seção de Fotos */}
<FormField
  control={form.control}
  name="photos"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Fotos</FormLabel>
      <FormControl>
        <AssetPhotoUpload
          value={field.value || []}
          onChange={field.onChange}
          folder="inventory"
          itemId={item?.id || 'new'}
          disabled={!canManageInventory}
        />
      </FormControl>
      <FormDescription>
        Adicione fotos do item para referência visual
      </FormDescription>
    </FormItem>
  )}
/>
```

### 7.2 GiftItemDialog.tsx

Adicionar campo photos no schema e formulário.

### 7.3 KeyringDialog.tsx

Adicionar campo photos no schema e formulário.

---

## 8. Integração nas Views de Detalhe

### InventoryDetailView.tsx

Na seção de informações do item:

```tsx
{item.photos && item.photos.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Fotos</CardTitle>
    </CardHeader>
    <CardContent>
      <AssetPhotoGallery 
        photos={item.photos} 
        alt={item.name}
      />
    </CardContent>
  </Card>
)}
```

---

## 9. Arquivos a Criar/Modificar

### Criar

| Arquivo | Propósito |
|---------|-----------|
| Migration SQL | Bucket + photos em gifts/keyrings |
| `src/lib/imageUtils.ts` | Expandir com `getOptimizedAssetPhotoUrl` |
| `src/modules/assets/components/shared/AssetPhotoUpload.tsx` | Componente de upload |
| `src/modules/assets/components/shared/AssetPhotoGallery.tsx` | Componente de galeria |
| `src/modules/assets/components/shared/index.ts` | Barrel exports |

### Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/modules/assets/types.ts` | Adicionar `photos` em `AssetGiftItem` e `AssetKeyring` |
| `src/modules/assets/hooks/useGifts.ts` | Query incluir `photos` |
| `src/modules/assets/hooks/useKeys.ts` | Query incluir `photos` |
| `src/modules/assets/components/inventory/form/inventoryFormSchema.ts` | Adicionar `photos` |
| `src/modules/assets/components/inventory/form/InventoryFormFields.tsx` | Adicionar seção |
| `src/modules/assets/components/inventory/InventoryDetailView.tsx` | Adicionar galeria |
| `src/modules/assets/components/gifts/GiftItemDialog.tsx` | Adicionar campo |
| `src/modules/assets/components/keys/KeyringDialog.tsx` | Adicionar campo |
| `docs/canonical/SCHEMA_QUICK_REFERENCE.md` | Documentar novos campos |

---

## 10. Ordem de Execução

1. **Migration SQL** — Bucket + campos photos
2. **imageUtils.ts** — Expandir com tamanhos de asset
3. **AssetPhotoUpload** — Componente de upload
4. **AssetPhotoGallery** — Componente de visualização
5. **Types** — Atualizar interfaces
6. **Hooks** — Incluir photos nas queries
7. **Formulários** — Integrar upload
8. **Views de Detalhe** — Integrar galeria
9. **Documentação** — SCHEMA_QUICK_REFERENCE

---

## 11. Benefícios da Otimização sob Demanda

| Aspecto | Abordagem Tradicional | Nossa Abordagem |
|---------|----------------------|-----------------|
| **Upload** | Resize no client antes do upload | Upload original (até 5MB) |
| **Storage** | Múltiplas versões por foto | Uma versão por foto |
| **Thumbnails** | Pré-gerados | Gerados sob demanda |
| **Qualidade** | Perda na conversão | Original preservado |
| **Simplicidade** | Complexo | Simples (só URL) |

A Supabase Image Transformations gera os thumbnails automaticamente na primeira requisição e os cacheia para requisições subsequentes.

---

## 12. Seção Técnica

### RLS do Bucket

```sql
-- A função has_any_asset_permission verifica se o usuário tem
-- QUALQUER permissão do módulo assets (inventory, keys ou gifts)
-- Isso permite que gestores façam upload para seu sub-módulo
```

### Organização no Storage

```
asset-photos/
├── inventory/
│   └── {item_id}/
│       ├── photo1.jpg
│       └── photo2.jpg
├── gifts/
│   └── {item_id}/
│       └── photo1.jpg
└── keys/
    └── {keyring_id}/
        └── photo1.jpg
```

### Limpeza de Fotos Órfãs

Quando um item é deletado (soft delete), as fotos permanecem no storage. Implementar cleanup periódico via pg_cron se necessário (baixa prioridade).

### Conformidade com Padrões

| Regra | Status |
|-------|--------|
| POST-BU: usar `useBuScopedSupabase()` | ✅ |
| Proibido `select('*')` | ✅ Campos explícitos |
| Query keys via `queryKeys` | ✅ |
| RLS configurada | ✅ |
| Otimização de imagens | ✅ Via Image Transformations |
