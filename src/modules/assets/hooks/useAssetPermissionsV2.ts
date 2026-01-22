import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Hook de permissões do módulo Assets usando sistema V2.
 * 
 * Substitui o antigo useAssetPermissions que usava a tabela legada asset_permissions.
 * Agora usa o sistema centralizado de permissões via permission_catalog + templates V2.
 * 
 * IMPORTANTE: Respeita impersonação - durante simulação, usa permissões do usuário impersonado.
 * 
 * @returns Objeto com flags de permissão para o módulo Assets
 */
export function useAssetPermissionsV2() {
  const { has, hasAny, isWildcard, isLoading: permissionsLoading } = usePermissions();
  const { isAdmin } = useAuth();
  const { userRole, isLoading: buLoading } = useBu();
  const { isImpersonating } = useOptionalImpersonation();

  const isLoading = permissionsLoading || buLoading;

  // Full access: isWildcard já inclui admin/super_admin do usuário atual OU impersonado
  // Durante impersonação, isAdmin e userRole refletem o CALLER, não o impersonado
  // Por isso usamos apenas isWildcard que reflete as permissões buscadas corretamente
  const hasFullAccess = isImpersonating 
    ? isWildcard  // Durante impersonação: só isWildcard (vem das permissões do impersonado)
    : (isAdmin || userRole === "admin" || isWildcard);  // Normal: todas as fontes

  // === Permissões de VISUALIZAÇÃO ===
  const canViewAssets = hasFullAccess || hasAny([
    "assets.view:bu",
    "assets.inventory.view:bu",
    "assets.keys.view:bu",
    "assets.gifts.view:bu",
  ]);

  const canViewInventory = hasFullAccess || hasAny([
    "assets.inventory.view:bu",
    "assets.inventory.read:bu",
  ]);

  const canViewKeys = hasFullAccess || hasAny([
    "assets.keys.view:bu",
    "assets.keys.read:bu",
  ]);

  const canViewGifts = hasFullAccess || hasAny([
    "assets.gifts.view:bu",
    "assets.gifts.read:bu",
  ]);

  // === Permissões de GESTÃO (CRUD) ===
  const canManageInventory = hasFullAccess || hasAny([
    "assets.inventory.create:bu",
    "assets.inventory.update:bu",
    "assets.inventory.delete:bu",
  ]);

  const canManageKeys = hasFullAccess || hasAny([
    "assets.keys.create:bu",
    "assets.keys.update:bu",
    "assets.keys.delete:bu",
    "assets.keys.key.manage:bu",
    "assets.keys.keyring.manage:bu",
    "assets.keys.claviculary.manage:bu",
  ]);

  const canManageGifts = hasFullAccess || hasAny([
    "assets.gifts.create:bu",
    "assets.gifts.update:bu",
    "assets.gifts.delete:bu",
    "assets.gifts.item.manage:bu",
    "assets.gifts.batch.manage:bu",
  ]);

  // === Permissões de OPERAÇÃO (ações do dia-a-dia) ===
  const canCheckoutInventory = hasFullAccess || has("assets.inventory.checkout:bu");
  const canReturnInventory = hasFullAccess || has("assets.inventory.return:bu");
  const canTransferInventory = hasFullAccess || has("assets.inventory.transfer:bu");
  const canCreateInventoryMovement = hasFullAccess || has("assets.inventory.movement.create:bu");

  const canCheckoutKeys = hasFullAccess || hasAny([
    "assets.keys.checkout:bu",
    "assets.keys.keyring.checkout:bu",
  ]);
  const canReturnKeys = hasFullAccess || has("assets.keys.keyring.return:bu");
  const canCreateKeyMovement = hasFullAccess || has("assets.keys.movement.create:bu");

  const canCreateGiftMovement = hasFullAccess || has("assets.gifts.movement.create:bu");
  const canAdjustGifts = hasFullAccess || has("assets.gifts.adjustment.create:bu");

  // === Permissões de ADMIN ===
  const isAssetsAdmin = hasFullAccess || has("assets.settings.manage");
  const canManageSettings = hasFullAccess || has("assets.settings.manage");
  const canManageCategories = hasFullAccess || has("assets.categories.manage:bu");

  // === Flags de acesso por aba ===
  const canAccessInventoryTab = canViewInventory;
  const canAccessKeysTab = canViewKeys;
  const canAccessGiftsTab = canViewGifts;
  const canAccessReportsTab = hasFullAccess || hasAny([
    "assets.inventory.view:bu",
    "assets.keys.view:bu",
    "assets.gifts.view:bu",
  ]);
  const canAccessSettingsTab = isAssetsAdmin;

  // Computed helpers mantidos para compatibilidade
  const isInventoryAdmin = hasFullAccess || canManageInventory;
  const isKeysAdmin = hasFullAccess || canManageKeys;
  const isGiftsAdmin = hasFullAccess || canManageGifts;

  // Flag geral: pode ver o módulo?
  const canView = canViewAssets;

  return useMemo(() => ({
    // Loading state
    isLoading,
    
    // Full access check
    hasFullAccess,
    
    // View permissions
    canViewAssets,
    canViewInventory,
    canViewKeys,
    canViewGifts,
    
    // Management permissions
    canManageInventory,
    canManageKeys,
    canManageGifts,
    
    // Operation permissions - Inventory
    canCheckoutInventory,
    canReturnInventory,
    canTransferInventory,
    canCreateInventoryMovement,
    
    // Operation permissions - Keys
    canCheckoutKeys,
    canReturnKeys,
    canCreateKeyMovement,
    
    // Operation permissions - Gifts
    canCreateGiftMovement,
    canAdjustGifts,
    
    // Admin permissions
    isAssetsAdmin,
    canManageSettings,
    canManageCategories,
    
    // Tab access
    canAccessInventoryTab,
    canAccessKeysTab,
    canAccessGiftsTab,
    canAccessReportsTab,
    canAccessSettingsTab,
    
    // Legacy compatibility
    isInventoryAdmin,
    isKeysAdmin,
    isGiftsAdmin,
    canView,
  }), [
    isLoading,
    hasFullAccess,
    canViewAssets,
    canViewInventory,
    canViewKeys,
    canViewGifts,
    canManageInventory,
    canManageKeys,
    canManageGifts,
    canCheckoutInventory,
    canReturnInventory,
    canTransferInventory,
    canCreateInventoryMovement,
    canCheckoutKeys,
    canReturnKeys,
    canCreateKeyMovement,
    canCreateGiftMovement,
    canAdjustGifts,
    isAssetsAdmin,
    canManageSettings,
    canManageCategories,
    canAccessInventoryTab,
    canAccessKeysTab,
    canAccessGiftsTab,
    canAccessReportsTab,
    canAccessSettingsTab,
    isInventoryAdmin,
    isKeysAdmin,
    isGiftsAdmin,
    canView,
  ]);
}
