import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BuUnit, UserBuMembership } from "@/modules/bu/types";
import { useUserBus } from "@/modules/bu/hooks/useBuData";
import { useAuth } from "@/hooks/useAuth";

interface BuContextType {
  currentBu: BuUnit | null;
  userBus: UserBuMembership[];
  isLoading: boolean;
  hasMultipleBus: boolean;
  switchBu: (buId: string) => void;
}

const BuContext = createContext<BuContextType | undefined>(undefined);

const BU_STORAGE_KEY = "hub_current_bu_id";

export function BuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: userBus = [], isLoading } = useUserBus();
  const [currentBuId, setCurrentBuId] = useState<string | null>(null);

  // Initialize current BU from storage or default
  useEffect(() => {
    if (userBus.length === 0) return;

    const storedBuId = sessionStorage.getItem(BU_STORAGE_KEY);
    
    // Check if stored BU is still valid for this user
    const validBu = userBus.find(m => m.bu_id === storedBuId);
    
    if (validBu) {
      setCurrentBuId(storedBuId);
    } else {
      // Use default BU or first available
      const defaultMembership = userBus.find(m => m.is_default) || userBus[0];
      if (defaultMembership) {
        setCurrentBuId(defaultMembership.bu_id);
        sessionStorage.setItem(BU_STORAGE_KEY, defaultMembership.bu_id);
      }
    }
  }, [userBus]);

  // Clear BU when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentBuId(null);
      sessionStorage.removeItem(BU_STORAGE_KEY);
    }
  }, [user]);

  const switchBu = (buId: string) => {
    const hasAccess = userBus.some(m => m.bu_id === buId);
    if (hasAccess) {
      setCurrentBuId(buId);
      sessionStorage.setItem(BU_STORAGE_KEY, buId);
    }
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
        switchBu,
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
