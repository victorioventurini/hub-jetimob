# Wave: Consolidação de Barrel Files - Hooks/Queries

**Data:** 2026-01-19  
**Status:** ✅ Concluída  
**Objetivo:** Estrutura consolidada em hooks/queries/ sem duplicação em todo sistema

---

## 📊 Análise Completa por Módulo

### Módulos Conformes ✅
Já possuem `hooks/index.ts` bem estruturado:

| Módulo | Status | Observação |
|--------|--------|------------|
| `teams` | ✅ | Barrel completo |
| `assets` | ✅ | Barrel completo |
| `users-global` | ✅ | Barrel completo |
| `permissions` | ✅ | Barrel completo |
| `vic` | ✅ | Barrel completo |
| `areas` | ✅ | Barrel completo |
| `home` | ✅ | Barrel completo |
| `integrations` | ✅ | Barrel completo |
| `okrs` | ✅ | Barrel completo |
| `automations` | ✅ | Barrel completo |
| `external` | ✅ | Barrel completo |
| `settings` | ✅ | Barrel completo |
| `kpis` | ✅ | Barrel completo |
| `bu` | ✅ | Barrel completo |
| `tickets` | ⚠️ | Barrel existe mas imports diretos |

---

## 🔴 PROBLEMA: Imports Diretos (Bypassing Barrel)

### Fase 1: Módulo `assets` (6 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `InventoryMovementDialog.tsx` | `../../hooks/useInventory` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useAssetGroups` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useLocations` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useProfiles` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useBuAdmins` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useAuthorizers` | `@/modules/assets/hooks` |
| `InventoryMovementDialog.tsx` | `../../hooks/useAssetPermissionsV2` | `@/modules/assets/hooks` |
| `AssetsSettingsPage.tsx` | `../hooks/useAssetPermissionsV2` | `@/modules/assets/hooks` |
| `KeysPage.tsx` | `../hooks/useKeys` | `@/modules/assets/hooks` |
| `KeysPage.tsx` | `../hooks/useAssetPermissionsV2` | `@/modules/assets/hooks` |
| `GiftsPage.tsx` | `../hooks/useGifts` | `@/modules/assets/hooks` |
| `GiftsPage.tsx` | `../hooks/useAssetPermissionsV2` | `@/modules/assets/hooks` |
| `UserDependenciesDialog.tsx` | `src/modules/assets/hooks/useProfiles` | `@/modules/assets/hooks` |

### Fase 2: Módulo `okrs` (3 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `OkrQualityPage.tsx` | `../hooks/useCycleData` | `@/modules/okrs/hooks` |
| `OkrQualityPage.tsx` | `../hooks/useTeamOkrQuality` | `@/modules/okrs/hooks` |
| `OkrConstructionReviewPage.tsx` | `../hooks/useConstructionReview` | `@/modules/okrs/hooks` |

### Fase 3: Módulo `users-global` (2 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `BuAccessManager.tsx` | `../hooks/useAllBus` | `@/modules/users-global/hooks` |
| `BuAccessManager.tsx` | `../hooks/useUserGlobalActions` | `@/modules/users-global/hooks` |
| `GlobalUsersPage.tsx` | `../hooks/useGlobalUsers` | `@/modules/users-global/hooks` |
| `GlobalUsersPage.tsx` | `../hooks/useAllBus` | `@/modules/users-global/hooks` |

### Fase 4: Módulo `tickets` (2 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `TicketDetailPage.tsx` | `../hooks/useTickets` | `@/modules/tickets/hooks` |
| `TicketDetailPage.tsx` | `../hooks/useTicketMessages` | `@/modules/tickets/hooks` |
| `TicketsListPage.tsx` | `../hooks/useTickets` | `@/modules/tickets/hooks` |

### Fase 5: Módulo `kpis` (2 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `KpiDashboardPage.tsx` | `../hooks/useKpiData` | `@/modules/kpis/hooks` |
| `KpiDetailDialog.tsx` | `../hooks/useKpiData` | `@/modules/kpis/hooks` |

### Fase 6: Módulo `permissions` (5 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `GlobalPermissionsPage.tsx` | `../hooks/usePermissionCatalog` | `@/modules/permissions/hooks` |
| `SurfacesTab.tsx` | `../hooks/usePermissionsV2` | `@/modules/permissions/hooks` |
| `BuPermissionsPage.tsx` | `../hooks/useBuUsers` | `@/modules/permissions/hooks` |
| `TemplateEditorSheet.tsx` | `../hooks/usePermissionsV2` | `@/modules/permissions/hooks` |
| `TemplateEditorSheet.tsx` | `../hooks/usePermissionCatalog` | `@/modules/permissions/hooks` |
| `AuditDashboard.tsx` | `../hooks/usePermissionAudit` | `@/modules/permissions/hooks` |

### Fase 7: Módulo `bu` (2 arquivos)

| Arquivo | Import Errado | Correção |
|---------|---------------|----------|
| `BuManagementPage.tsx` | `../hooks/useBuData` | `@/modules/bu/hooks` |
| `EditBuDialog.tsx` | `../hooks/useBuData` | `@/modules/bu/hooks` |

---

## 🟡 ATENÇÃO: Exports Faltando em Barrels

### `src/modules/okrs/hooks/index.ts`
Hooks usados externamente mas não exportados no barrel:
- `useConstructionReview` ❌ (usado em OkrConstructionReviewPage.tsx)

### `src/modules/kpis/hooks/index.ts`
Hooks usados externamente mas não exportados no barrel:
- `useKpiDetail` ❌ (usado em KpiDetailDialog.tsx)

### `src/modules/settings/index.ts`
Módulo exporta diretamente do arquivo em vez do barrel:
```typescript
// ❌ ATUAL
export * from "./hooks/useJobTitles";
// ✅ CORRETO
export * from "./hooks";
```

---

## 🔵 Hooks Deprecados a Remover

| Hook | Local | Razão |
|------|-------|-------|
| `useOrgOkrsForContext` | `okrs/hooks` | Deprecated - usar `useOrgObjectiveView` |
| `useInventory` | `assets/hooks` | Backward compat - migrar para hooks individuais |

---

## 📋 Plano de Execução

### Wave 1: Corrigir Barrels Faltantes
- [ ] Adicionar `useConstructionReview` ao `okrs/hooks/index.ts`
- [ ] Adicionar `useKpiDetail` ao `kpis/hooks/index.ts`
- [ ] Corrigir `settings/index.ts` para usar `export * from "./hooks"`

### Wave 2: Corrigir Imports - Módulo Assets (6 arquivos)
- [ ] `InventoryMovementDialog.tsx`
- [ ] `AssetsSettingsPage.tsx`
- [ ] `KeysPage.tsx`
- [ ] `GiftsPage.tsx`
- [ ] `UserDependenciesDialog.tsx`

### Wave 3: Corrigir Imports - Módulo OKRs (2 arquivos)
- [ ] `OkrQualityPage.tsx`
- [ ] `OkrConstructionReviewPage.tsx`

### Wave 4: Corrigir Imports - Módulo Users-Global (2 arquivos)
- [ ] `BuAccessManager.tsx`
- [ ] `GlobalUsersPage.tsx`

### Wave 5: Corrigir Imports - Módulo Tickets (2 arquivos)
- [ ] `TicketDetailPage.tsx`
- [ ] `TicketsListPage.tsx`

### Wave 6: Corrigir Imports - Módulo KPIs (2 arquivos)
- [ ] `KpiDashboardPage.tsx`
- [ ] `KpiDetailDialog.tsx`

### Wave 7: Corrigir Imports - Módulo Permissions (5 arquivos)
- [ ] `GlobalPermissionsPage.tsx`
- [ ] `SurfacesTab.tsx`
- [ ] `BuPermissionsPage.tsx`
- [ ] `TemplateEditorSheet.tsx`
- [ ] `AuditDashboard.tsx`

### Wave 8: Corrigir Imports - Módulo BU (2 arquivos)
- [ ] `BuManagementPage.tsx`
- [ ] `EditBuDialog.tsx`

### Wave 9: Limpeza Final
- [ ] Remover `useOrgOkrsForContext` (após migração)
- [ ] Avaliar deprecação de `useInventory` agregado

---

## ✅ Critérios de Sucesso

1. **Zero imports diretos** - Todos usam barrel files
2. **Barrels completos** - Todos hooks exportados centralmente
3. **Sem duplicação** - Um único local de export por hook
4. **Padrão uniforme** - Todos módulos seguem mesma estrutura

---

## 📚 Referência: Padrão Correto

```typescript
// ✅ CORRETO - Import do barrel
import { useTeams, useSquads, type Team } from "@/modules/teams/hooks";

// ❌ PROIBIDO - Import direto
import { useTeams } from "@/modules/teams/hooks/useTeams";
import { useSquads } from "@/modules/teams/hooks/useSquads";
```
