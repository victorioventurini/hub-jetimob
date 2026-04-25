import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BuUnit, UserBuMembership } from "@/modules/bu/types";
import { useUserBus } from "@/modules/bu/hooks";
import { useExternalUserBus } from "@/modules/external/hooks";
import { AuthContext, type AuthContextType } from "@/hooks/useAuth";
import { clearBuClientCache } from "@/integrations/supabase/buScopedClient";
import { setTenantId } from "@/lib/analytics";
import { queryKeys } from "@/lib/queryKeys";

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
  /**
   * True during a recent user-initiated BU switch (5s window). Consumers like
   * `usePrefetchRoute` MUST gate on this to avoid issuing requests with the
   * old BU header during the transition.
   */
  isSwitchingBu: boolean;
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
const RECENT_SELECTION_WINDOW_MS = 5000;

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

  // Timestamp of the last explicit user selection. Drives `isSwitchingBu`
  // and the protection window in the init effect.
  const lastUserSelectionAtRef = useRef<number>(0);

  // The exact BU id the user requested. Survives across `useEffect` ticks
  // even if `currentBuId` gets transiently overwritten by a stale init pass.
  // While this ref is set within the protection window, the init effect
  // refuses to fall back to `defaultBu = is_default`.
  const pendingSelectionBuIdRef = useRef<string | null>(null);

  // Force re-render when the protection window expires so `isSwitchingBu`
  // flips back to false (refs alone don't trigger renders).
  const [switchingTick, setSwitchingTick] = useState(0);

  // Combined loading state - wait for both auth AND buses to load
  const isLoading = authLoading || busLoading || (!hasInitialized && !!user);

  const isSwitchingBu = useMemo(() => {
    // `switchingTick` is intentionally read here so the memo recomputes when
    // the window-expiry timer fires.
    void switchingTick;
    return Date.now() - lastUserSelectionAtRef.current < RECENT_SELECTION_WINDOW_MS;
  }, [switchingTick]);

  // Initialize / reconcile BU state when auth or membership list changes.
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

    // ── Pending user selection takes absolute priority ──
    // The user explicitly clicked a BU within the protection window.
    // We must honor that selection even if `currentBuId` got transiently
    // overwritten by a previous run of this effect (e.g. when `userBus`
    // returned from the network without the new BU yet).
    const recentlySelected =
      Date.now() - lastUserSelectionAtRef.current < RECENT_SELECTION_WINDOW_MS;
    const pendingBuId = pendingSelectionBuIdRef.current;

    if (recentlySelected && pendingBuId) {
      const pendingExists = userBus.some((m) => m.bu_id === pendingBuId);
      if (pendingExists) {
        // Pending BU finally appeared in userBus — restore it (idempotent
        // if currentBuId already equals pendingBuId).
        if (currentBuId !== pendingBuId) {
          console.info("[BuContext.init] Restoring pending user selection", {
            pendingBuId,
            previousCurrentBuId: currentBuId,
          });
          setCurrentBuId(pendingBuId);
          setBuSelected(true);
          localStorage.setItem(BU_STORAGE_KEY, pendingBuId);
          localStorage.setItem(BU_SELECTED_KEY, "true");
        }
        // Clear the pending ref — selection has been honored.
        pendingSelectionBuIdRef.current = null;
        setHasInitialized(true);
        return;
      }

      // Pending BU not yet in userBus — keep the ref, force a refetch and
      // wait for the next pass. Do NOT touch currentBuId, do NOT fall back
      // to default. The expiry timer will surface a toast if it never arrives.
      console.warn("[BuContext.init] Pending user selection not in userBus yet — refetching", {
        pendingBuId,
        availableBuIds: userBus.map((m) => m.bu_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bu.userBusPrefix(),
        refetchType: "active",
      });
      setHasInitialized(true);
      return;
    }

    const storedBuId = localStorage.getItem(BU_STORAGE_KEY);
    const storedSelected = localStorage.getItem(BU_SELECTED_KEY) === "true";

    // Check if stored BU is still valid for this user
    const validBu = userBus.find((m) => m.bu_id === storedBuId);

    if (validBu && storedSelected) {
      // User had previously selected a BU - restore it
      setCurrentBuId(storedBuId);
      setBuSelected(true);
    } else if (validBu && !storedSelected) {
      // Stored BU is valid but the `selected` flag was lost (e.g. partial
      // storage clear). Restore it anyway — the storage id is the user's
      // most recent intent.
      console.debug("[BuContext.init] Restoring storedBuId without selected flag", { storedBuId });
      setCurrentBuId(storedBuId);
      setBuSelected(true);
      localStorage.setItem(BU_SELECTED_KEY, "true");
    } else if (storedBuId && !validBu) {
      // Stored BU is not in userBus. Could be stale cache (refetch in flight)
      // OR the user lost access. Do NOT fall back to is_default yet — wait
      // for the refetch to confirm before changing BU.
      console.warn("[BuContext.init] storedBuId not in userBus", {
        storedBuId,
        availableBuIds: userBus.map((m) => m.bu_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.bu.userBusPrefix(),
        refetchType: "active",
      });
      setHasInitialized(true);
      return;
    } else if (userBus.length === 1) {
      // Single BU user - auto-select
      const singleBu = userBus[0];
      setCurrentBuId(singleBu.bu_id);
      setBuSelected(true);
      localStorage.setItem(BU_STORAGE_KEY, singleBu.bu_id);
      localStorage.setItem(BU_SELECTED_KEY, "true");
    } else {
      // Multiple BUs and no valid stored selection.
      // Prefer the user's default membership (is_default = true) to avoid
      // blank states after login and keep behavior consistent with backend
      // current_bu_id() fallback.
      const defaultBu = userBus.find((m) => m.is_default);
      if (defaultBu) {
        console.debug("[BuContext.init] Falling back to default BU", { defaultBuId: defaultBu.bu_id });
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
  }, [userBus, authLoading, busLoading, user, currentBuId, queryClient]);

  // Surface a toast and clear the pending ref when the protection window
  // expires without the requested BU ever appearing in userBus.
  useEffect(() => {
    if (!isSwitchingBu) return;
    const elapsed = Date.now() - lastUserSelectionAtRef.current;
    const remaining = Math.max(0, RECENT_SELECTION_WINDOW_MS - elapsed);
    const timer = window.setTimeout(() => {
      const stillPending = pendingSelectionBuIdRef.current;
      if (stillPending) {
        const exists = userBus.some((m) => m.bu_id === stillPending);
        if (!exists) {
          console.warn("[BuContext] Pending BU never appeared after window — surfacing toast", {
            pendingBuId: stillPending,
          });
          toast.error("A Business Unit selecionada ainda não foi sincronizada. Tente novamente em alguns segundos.");
          pendingSelectionBuIdRef.current = null;
        }
      }
      // Trigger re-render so isSwitchingBu re-evaluates to false.
      setSwitchingTick((t) => t + 1);
    }, remaining + 50);
    return () => window.clearTimeout(timer);
  }, [isSwitchingBu, userBus]);

  // Clear BU when user logs out (avoid clearing during initial auth loading)
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCurrentBuId(null);
      setBuSelected(false);
      pendingSelectionBuIdRef.current = null;
      lastUserSelectionAtRef.current = 0;
      localStorage.removeItem(BU_STORAGE_KEY);
      localStorage.removeItem(BU_SELECTED_KEY);
    }
  }, [user, authLoading]);

  /**
   * Apply a BU switch atomically. Order is critical:
   *   1. Mark pending selection (refs) — guards init effect.
   *   2. Persist to localStorage (sync source of truth for fetch interceptor).
   *   3. Swap singleton client & globalThis BU id with `clearBuClientCache(buId)`.
   *      This guarantees no in-flight request reads a `null` BU header.
   *   4. Update React state (triggers re-renders).
   *   5. `queryClient.clear()` — fires refetches that now see the new BU.
   */
  const applyBuSwitch = useCallback(
    (buId: string, opts: { isChanging: boolean }) => {
      // 1) Pending refs FIRST so any synchronous re-render caused by setStates
      //    below sees a coherent guard.
      lastUserSelectionAtRef.current = Date.now();
      pendingSelectionBuIdRef.current = buId;

      // 2) localStorage = canonical fallback for fetch interceptor.
      localStorage.setItem(BU_STORAGE_KEY, buId);
      localStorage.setItem(BU_SELECTED_KEY, "true");

      // 3) Atomically swap the BU-scoped singleton & globalThis BU id.
      //    Passing `buId` ensures `getCurrentBuId()` never reads `null`
      //    during the transition window.
      clearBuClientCache(buId);

      // 4) React state (defer to next render).
      setCurrentBuId(buId);
      setBuSelected(true);
      setSwitchingTick((t) => t + 1);

      // 5) GA4 tenant tag.
      setTenantId(buId);

      // 6) Invalidate all BU-scoped queries — they will refetch with the new
      //    header from step 3.
      if (opts.isChanging) {
        queryClient.clear();
      }
    },
    [queryClient],
  );

  const selectBu = useCallback(
    (buId: string) => {
      const hasAccess = userBus.some((m) => m.bu_id === buId);
      if (!hasAccess) {
        // Stale cache OR user without access. Force refetch and, if the BU
        // appears, retry the selection once. Without this retry, the click
        // would silently fail when membership was just created in another tab.
        console.warn("[BuContext.selectBu] BU não acessível em userBus — refetch+retry", {
          requestedBuId: buId,
          availableBuIds: userBus.map((m) => m.bu_id),
        });
        // Mark as pending immediately so the init effect protects it during
        // the refetch window.
        lastUserSelectionAtRef.current = Date.now();
        pendingSelectionBuIdRef.current = buId;
        setSwitchingTick((t) => t + 1);

        void queryClient
          .invalidateQueries({
            queryKey: queryKeys.bu.userBusPrefix(),
            refetchType: "active",
          })
          .then(async () => {
            const refetched = queryClient.getQueriesData<UserBuMembership[]>({
              queryKey: queryKeys.bu.userBusPrefix(),
            });
            const flat = refetched.flatMap(([, data]) => data ?? []);
            const found = flat.some((m) => m.bu_id === buId);
            if (found) {
              console.info("[BuContext.selectBu] Retry após refetch — BU encontrada", { buId });
              applyBuSwitch(buId, { isChanging: true });
            } else {
              console.warn("[BuContext.selectBu] BU ainda ausente após refetch — sem acesso", { buId });
              pendingSelectionBuIdRef.current = null;
              toast.error("Você não tem acesso a esta Business Unit (ou ela ainda não foi sincronizada).");
            }
          });
        return;
      }

      const isChanging = currentBuId !== buId;
      console.info("[BuContext.selectBu]", { buId, isChanging, prevBuId: currentBuId });
      applyBuSwitch(buId, { isChanging });
    },
    [userBus, currentBuId, queryClient, applyBuSwitch],
  );

  const switchBu = useCallback(
    (buId: string) => {
      // For switching between BUs - same as selectBu but semantically different
      selectBu(buId);
    },
    [selectBu],
  );

  const clearBuSelection = () => {
    pendingSelectionBuIdRef.current = null;
    lastUserSelectionAtRef.current = 0;
    setCurrentBuId(null);
    setBuSelected(false);
    localStorage.removeItem(BU_STORAGE_KEY);
    localStorage.removeItem(BU_SELECTED_KEY);
    // Clear tenant_id for GA4 tracking
    setTenantId(null);
  };

  const currentMembership = userBus.find((m) => m.bu_id === currentBuId);
  const currentBu = currentMembership?.bu_unit || null;
  const userRole = isExternalUser ? "external" : currentMembership?.role_in_bu || null;

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
        isSwitchingBu,
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
