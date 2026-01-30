import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BuUnit, UserBuMembership } from "@/modules/bu/types";
import { useUserBus } from "@/modules/bu/hooks";
import { useExternalUserBus } from "@/modules/external/hooks";
import { AuthContext, type AuthContextType } from "@/hooks/useAuth";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";

interface BuContextType {
  /** Selected BU id (available even if bu_unit data isn't loaded) */
  currentBuId: string | null;
  currentBu: BuUnit | null;
  userBus: UserBuMembership[];
  isLoading: boolean;
  hasMultipleBus: boolean;
  /** The user's role in the current BU */
  userRole: UserBuMembership["role_in_bu"] | "external" | null;
  /** Indicates if the user has explicitly selected a BU (or was auto-selected for single-BU users) */
  buSelected: boolean;
  /** True if user is an external partner (has access via partner_contacts) */
  isExternalUser: boolean;
  /** Explicitly select a BU - sets buSelected to true */
  selectBu: (buId: string) => void;
  /** Switch to another BU (for users with multiple BUs) */
  switchBu: (buId: string) => void;
  /** Clear BU selection - returns to BU selection screen */
  clearBuSelection: () => void;
}

export const BuContext = createContext<BuContextType | undefined>(undefined);

const BU_STORAGE_KEY = "hub_current_bu_id";
const BU_SELECTED_KEY = "hub_bu_selected";

export function BuProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Use optional AuthContext access to avoid throwing when outside AuthProvider
  const authContext = useContext(AuthContext) as AuthContextType | undefined;
  const user = authContext?.user ?? null;
  const authLoading = authContext?.isLoading ?? true;
  const { data: internalBus = [], isLoading: internalBusLoading } = useUserBus();
  const { data: externalBus = [], isLoading: externalBusLoading } = useExternalUserBus();
  
  // Combine internal and external BUs
  // Internal memberships take priority if user has both
  const userBus = useMemo(() => {
    if (internalBus.length > 0) {
      return internalBus;
    }
    // Cast external BUs to UserBuMembership format
    return externalBus as unknown as UserBuMembership[];
  }, [internalBus, externalBus]);
  
  const isExternalUser = internalBus.length === 0 && externalBus.length > 0;
  const busLoading = internalBusLoading || externalBusLoading;
  
  const [currentBuId, setCurrentBuId] = useState<string | null>(() => {
    return localStorage.getItem(BU_STORAGE_KEY);
  });
  const [buSelected, setBuSelected] = useState<boolean>(() => {
    return localStorage.getItem(BU_SELECTED_KEY) === "true";
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  // Combined loading state - wait for both auth AND buses to load
  const isLoading = authLoading || busLoading || (!hasInitialized && !!user);

  // Initialize BU state from storage on mount
  useEffect(() => {
    // Wait for auth to complete before initializing
    if (authLoading) return;
    
    // If user is not logged in, mark as initialized
    if (!user) {
      setHasInitialized(true);
      return;
    }
    
    // Wait for bus data to load
    if (busLoading) return;
    
    // If no BUs available yet but user is logged in, wait
    if (userBus.length === 0) {
      setHasInitialized(true);
      return;
    }

    const storedBuId = localStorage.getItem(BU_STORAGE_KEY);
    const storedSelected = localStorage.getItem(BU_SELECTED_KEY) === "true";
    
    // Check if stored BU is still valid for this user
    const validBu = userBus.find(m => m.bu_id === storedBuId);
    
    if (validBu && storedSelected) {
      // User had previously selected a BU - restore it
      setCurrentBuId(storedBuId);
      setBuSelected(true);
    } else if (userBus.length === 1) {
      // Single BU user - auto-select
      const singleBu = userBus[0];
      setCurrentBuId(singleBu.bu_id);
      setBuSelected(true);
      localStorage.setItem(BU_STORAGE_KEY, singleBu.bu_id);
      localStorage.setItem(BU_SELECTED_KEY, "true");
    } else {
      // Multiple BUs and no valid stored selection.
      // Prefer the user's default membership (is_default = true) to avoid blank states
      // after login and keep behavior consistent with backend current_bu_id() fallback.
      const defaultBu = userBus.find((m) => m.is_default);
      if (defaultBu) {
        setCurrentBuId(defaultBu.bu_id);
        setBuSelected(true);
        localStorage.setItem(BU_STORAGE_KEY, defaultBu.bu_id);
        localStorage.setItem(BU_SELECTED_KEY, "true");
      } else {
        // No explicit default: user needs to choose
        setBuSelected(false);
        setCurrentBuId(null);
      }
    }
    
    setHasInitialized(true);
  }, [userBus, authLoading, busLoading, user]);

  // Clear BU when user logs out (avoid clearing during initial auth loading)
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCurrentBuId(null);
      setBuSelected(false);
      localStorage.removeItem(BU_STORAGE_KEY);
      localStorage.removeItem(BU_SELECTED_KEY);
    }
  }, [user, authLoading]);

  const selectBu = useCallback((buId: string) => {
    const hasAccess = userBus.some(m => m.bu_id === buId);
    if (hasAccess) {
      const isChanging = currentBuId !== buId;
      setCurrentBuId(buId);
      setBuSelected(true);
      localStorage.setItem(BU_STORAGE_KEY, buId);
      localStorage.setItem(BU_SELECTED_KEY, "true");
      
      // Invalidate all BU-scoped queries and client cache when changing BU
      if (isChanging) {
        console.log("[BuContext] BU changed, clearing query cache and BU client");
        // Clear BU-scoped Supabase client cache to force re-creation with new BU ID
        clearBuClientCache();
        queryClient.clear();
      }
    }
  }, [userBus, currentBuId, queryClient]);

  const switchBu = useCallback((buId: string) => {
    // For switching between BUs - same as selectBu but semantically different
    selectBu(buId);
  }, [selectBu]);

  const clearBuSelection = () => {
    setCurrentBuId(null);
    setBuSelected(false);
    localStorage.removeItem(BU_STORAGE_KEY);
    localStorage.removeItem(BU_SELECTED_KEY);
  };

  const currentMembership = userBus.find(m => m.bu_id === currentBuId);
  const currentBu = currentMembership?.bu_unit || null;
  const userRole = isExternalUser ? "external" : (currentMembership?.role_in_bu || null);

  return (
    <BuContext.Provider
      value={{
        currentBuId,
        currentBu,
        userBus,
        isLoading,
        hasMultipleBus: userBus.length > 1,
        userRole,
        buSelected,
        isExternalUser,
        selectBu,
        switchBu,
        clearBuSelection,
      }}
    >
      {children}
    </BuContext.Provider>
  );
}

export function useBu() {
  const context = useContext(BuContext);
  if (context === undefined) {
    throw new Error("useBu must be used within a BuProvider");
  }
  return context;
}
