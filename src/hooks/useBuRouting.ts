/**
 * BU-Aware Routing Hook
 * 
 * Provides utilities for BU-scoped navigation and route helpers.
 */

import { useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useBu } from '@/contexts/BuContext';
import { getBuScopedPath, extractBuIdFromPath, isBuScopedPath } from '@/lib/buRouting';

interface UseBuRoutingReturn {
  /** Generate a BU-scoped path using current BU or specified BU */
  getBuPath: (path: string, buId?: string) => string;
  /** Navigate to a BU-scoped path */
  navigateToBu: (path: string, buId?: string) => void;
  /** The BU ID from the current URL (if in a BU-scoped route) */
  urlBuId: string | null;
  /** Whether the current route is BU-scoped */
  isInBuScope: boolean;
  /** Check if user has access to a specific BU */
  hasAccessToBu: (buId: string) => boolean;
}

/**
 * Hook for BU-aware routing operations
 */
export function useBuRouting(): UseBuRoutingReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const { buId: paramBuId } = useParams<{ buId?: string }>();
  const { currentBuId, userBus } = useBu();

  // Get BU ID from URL params or extract from path
  const urlBuId = paramBuId || extractBuIdFromPath(location.pathname);
  
  const isInBuScope = isBuScopedPath(location.pathname);

  const hasAccessToBu = useCallback((buId: string): boolean => {
    return userBus.some(m => m.bu_id === buId);
  }, [userBus]);

  const getBuPath = useCallback((path: string, buId?: string): string => {
    const targetBuId = buId || urlBuId || currentBuId;
    if (!targetBuId) {
      console.warn('[useBuRouting] No BU ID available for path generation');
      return path;
    }
    return getBuScopedPath(targetBuId, path);
  }, [urlBuId, currentBuId]);

  const navigateToBu = useCallback((path: string, buId?: string): void => {
    const fullPath = getBuPath(path, buId);
    navigate(fullPath);
  }, [getBuPath, navigate]);

  return {
    getBuPath,
    navigateToBu,
    urlBuId,
    isInBuScope,
    hasAccessToBu,
  };
}

/**
 * Hook to assert current BU ID is present
 * Throws error if used in a context without BU selection
 */
export function useRequiredBuId(): string {
  const { currentBuId } = useBu();
  
  if (!currentBuId) {
    throw new Error(
      '[useRequiredBuId] Bu ID is required but not available. ' +
      'Make sure this component is rendered within BuRequiredRoute or BuScopedRoute.'
    );
  }
  
  return currentBuId;
}
