/**
 * Tests for useAssetPermissionsV2 hook
 * 
 * Tests permission derivation logic for Assets module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

// Mock dependencies
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: vi.fn(),
}));

vi.mock('@/contexts/ImpersonationContext', () => ({
  useOptionalImpersonation: vi.fn(),
}));

import { useAssetPermissionsV2 } from './useAssetPermissionsV2';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { useOptionalImpersonation } from '@/contexts/ImpersonationContext';

const mockUsePermissions = vi.mocked(usePermissions);
const mockUseAuth = vi.mocked(useAuth);
const mockUseBu = vi.mocked(useBu);
const mockUseImpersonation = vi.mocked(useOptionalImpersonation);

function setupMocks(opts: {
  permissions?: string[];
  isWildcard?: boolean;
  isAdmin?: boolean;
  userRole?: string;
  isImpersonating?: boolean;
  isLoading?: boolean;
} = {}) {
  const perms = opts.permissions ?? [];
  mockUsePermissions.mockReturnValue({
    permissions: perms,
    has: (key: string) => opts.isWildcard || perms.includes(key),
    hasAny: (keys: string[]) => opts.isWildcard || keys.some(k => perms.includes(k)),
    hasAll: (keys: string[]) => opts.isWildcard || keys.every(k => perms.includes(k)),
    isWildcard: opts.isWildcard ?? false,
    isLoading: opts.isLoading ?? false,
    isImpersonating: opts.isImpersonating ?? false,
  });
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    profile: null,
    role: opts.isAdmin ? 'super_admin' : 'collaborator',
    isLoading: false,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    isAdmin: opts.isAdmin ?? false,
  });
  mockUseBu.mockReturnValue({
    currentBu: { id: 'bu-1', name: 'Test BU' } as any,
    userRole: opts.userRole ?? 'collaborator',
    isLoading: false,
    userBus: [],
    setCurrentBu: vi.fn(),
    buMembership: null,
  } as any);
  mockUseImpersonation.mockReturnValue({
    isImpersonating: opts.isImpersonating ?? false,
    impersonatedUserId: null,
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  } as any);
}

describe('useAssetPermissionsV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should grant full access to admin users', () => {
    setupMocks({ isAdmin: true });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
    expect(result.current.canViewAssets).toBe(true);
    expect(result.current.canManageInventory).toBe(true);
    expect(result.current.canManageKeys).toBe(true);
    expect(result.current.canManageGifts).toBe(true);
  });

  it('should grant full access to wildcard users', () => {
    setupMocks({ isWildcard: true });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
  });

  it('should deny all to regular users with no permissions', () => {
    setupMocks({});
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.canViewAssets).toBe(false);
    expect(result.current.canManageInventory).toBe(false);
    expect(result.current.canCheckoutInventory).toBe(false);
  });

  it('should allow view-only access with view permission', () => {
    setupMocks({ permissions: ['assets.inventory.view:bu'] });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.canViewInventory).toBe(true);
    expect(result.current.canViewAssets).toBe(true);
    expect(result.current.canManageInventory).toBe(false);
  });

  it('should allow manage with create permission', () => {
    setupMocks({ permissions: ['assets.keys.create:bu'] });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.canManageKeys).toBe(true);
    expect(result.current.canViewKeys).toBe(false); // view requires separate permission
  });

  it('should use only isWildcard during impersonation', () => {
    // During impersonation, isAdmin of CALLER should not grant access
    setupMocks({ isAdmin: true, isImpersonating: true, isWildcard: false });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.hasFullAccess).toBe(false);
  });

  it('should grant full access during impersonation when impersonated user is wildcard', () => {
    setupMocks({ isAdmin: true, isImpersonating: true, isWildcard: true });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
  });

  it('should report loading state', () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.isLoading).toBe(true);
  });

  it('should set tab access flags correctly', () => {
    setupMocks({ permissions: ['assets.inventory.view:bu', 'assets.gifts.view:bu'] });
    const { result } = renderHook(() => useAssetPermissionsV2());
    expect(result.current.canAccessInventoryTab).toBe(true);
    expect(result.current.canAccessKeysTab).toBe(false);
    expect(result.current.canAccessGiftsTab).toBe(true);
  });
});
