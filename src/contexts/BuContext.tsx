import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BuUnit, UserBuMembership } from "@/modules/bu/types";
import { useUserBus } from "@/modules/bu/hooks/useBuData";
import { useAuth } from "@/hooks/useAuth";

interface BuContextType {
  currentBu: BuUnit | null;
  userBus: UserBuMembership[];
  isLoading: boolean;
  hasMultipleBus: boolean;
  /** Indicates if the user has explicitly selected a BU (or was auto-selected for single-BU users) */
  buSelected: boolean;
  /** Explicitly select a BU - sets buSelected to true */
  selectBu: (buId: string) => void;
  /** Switch to another BU (for users with multiple BUs) */
  switchBu: (buId: string) => void;
  /** Clear BU selection - returns to BU selection screen */
  clearBuSelection: () => void;
}

const BuContext = createContext<BuContextType | undefined>(undefined);

const BU_STORAGE_KEY = "hub_current_bu_id";
const BU_SELECTED_KEY = "hub_bu_selected";

export function BuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: userBus = [], isLoading } = useUserBus();
  const [currentBuId, setCurrentBuId] = useState<string | null>(null);
  const [buSelected, setBuSelected] = useState<boolean>(false);

  // Initialize BU state from storage on mount
  useEffect(() => {
    if (userBus.length === 0) return;

    const storedBuId = sessionStorage.getItem(BU_STORAGE_KEY);
    const storedSelected = sessionStorage.getItem(BU_SELECTED_KEY) === "true";
    
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
      sessionStorage.setItem(BU_STORAGE_KEY, singleBu.bu_id);
      sessionStorage.setItem(BU_SELECTED_KEY, "true");
    } else {
      // Multiple BUs and no valid selection - user needs to choose
      setBuSelected(false);
      setCurrentBuId(null);
    }
  }, [userBus]);

  // Clear BU when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentBuId(null);
      setBuSelected(false);
      sessionStorage.removeItem(BU_STORAGE_KEY);
      sessionStorage.removeItem(BU_SELECTED_KEY);
    }
  }, [user]);

  const selectBu = (buId: string) => {
    const hasAccess = userBus.some(m => m.bu_id === buId);
    if (hasAccess) {
      setCurrentBuId(buId);
      setBuSelected(true);
      sessionStorage.setItem(BU_STORAGE_KEY, buId);
      sessionStorage.setItem(BU_SELECTED_KEY, "true");
    }
  };

  const switchBu = (buId: string) => {
    // For switching between BUs - same as selectBu but semantically different
    selectBu(buId);
  };

  const clearBuSelection = () => {
    setCurrentBuId(null);
    setBuSelected(false);
    sessionStorage.removeItem(BU_STORAGE_KEY);
    sessionStorage.removeItem(BU_SELECTED_KEY);
  };

  const currentMembership = userBus.find(m => m.bu_id === currentBuId);
  const currentBu = currentMembership?.bu_unit || null;

  return (
    <BuContext.Provider
      value={{
        currentBu,
        userBus,
        isLoading,
        hasMultipleBus: userBus.length > 1,
        buSelected,
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
