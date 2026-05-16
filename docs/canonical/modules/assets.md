# Módulo Assets — Canonical

**Slug:** `assets` · **Status:** ✅ Ativo

> 3 sub-módulos independentes com permissões próprias: **Inventário**, **Chaves**, **Brindes**.

## Tabelas

`asset_inventory`, `asset_movements`, `asset_keyrings`, `asset_clavicularies`, `asset_keys`, `asset_key_movements`, `asset_gift_items`, `asset_gift_batches`, `asset_gift_movements`, `asset_categories`, `asset_locations`. Schema: `types.ts`.

Storage: bucket privado `asset-photos`.

## Sub-módulos

| Sub-módulo | Rota | Permissões |
|---|---|---|
| Inventário | `/assets/inventory` | `inventory_admin`, `inventory_manager`, `viewer` |
| Chaves | `/assets/keys` | `keys_admin`, `keys_manager`, `viewer` |
| Brindes | `/assets/gifts` | `gifts_admin`, `gifts_manager`, `viewer` |
| Relatórios | `/assets/reports` | Respeita permissões por sub-módulo |
| Configurações | `/assets/settings` | `assets_admin` |

Função RLS: `has_asset_permission(user_id, bu_id, roles)`.

## URL State

| Página | Parâmetro | Valores |
|---|---|---|
| `/assets/inventory` | `status` | `all`, `available`, `loaned`, `maintenance`, `written_off` |
| `/assets/inventory` | `overdue` | `true` |
| `/assets/inventory` | `category` | UUID (hierárquico) |
| `/assets/inventory` | `holder` | UUID |
| `/assets/inventory` | `location` | UUID (hierárquico) |
| `/assets/keys` | `status` | `all`, `available`, `loaned`, `lost` |
| `/assets/gifts` | `lowStock` | `true` |

## Deep links em Relatórios (v2.80.0)

Cards clicáveis em `/assets/reports` → listagens filtradas (inventário disponíveis/emprestados/manutenção, chaves disponíveis/emprestados/extraviados, brindes estoque baixo).

**Card "Devoluções em Atraso":** topo de `/assets/reports` quando há `expected_return_at < now()`. Estilo `destructive`, 5 primeiros + link "Ver todos" → `/assets/inventory?status=loaned&overdue=true`.

## QR Codes legados

`/assets/:code` (4 dígitos) — **NUNCA quebrar** (etiquetas impressas). Logado → resolve via `resolve_asset_by_code_global()` → `/go/asset/:uuid`. Não logado → `/p/assets/:code`. Ver `core/TCR_CORE.md` §7.3.

Índice obrigatório: `UNIQUE (bu_id, internal_code) WHERE deleted_at IS NULL`.

## Componentes principais

`AssetsLayout`, `InventoryPage/Card/Filters/ItemDialog`, `KeysPage`, `ClavicularyBoard`, `KeyringsList`, `ClavicularyDialog`, `KeyringDialog`, `GiftsPage`, `GiftItemCard`, `GiftItemDialog`, `AddPermissionDialog`.

## Referências

- Shareable links: `core/TCR_CORE.md` §7
- RBAC: `docs/canonical/PERMISSIONS_AND_RBAC_MODEL.md`
