/**
 * PublicAssetRedirect - Legacy Route Handler
 * 
 * Handles the legacy route /assets/:code for backward compatibility
 * with physical labels (QR codes) already printed.
 * 
 * Behavior:
 * - If user NOT authenticated → render PublicAsset (public view)
 * - If user authenticated → resolve asset, switch BU if needed, redirect to internal view
 * 
 * This ensures that:
 * 1. QR codes on physical labels continue to work
 * 2. Logged-in users always land in the correct BU context
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";
import PublicAsset from "./PublicAsset";

type ResolveState = "checking" | "public" | "resolving" | "redirecting" | "error";

export default function PublicAssetRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { userBus, isLoading: buLoading, selectBu, currentBuId } = useBu();
  // Uses global client since this page runs before BU selection
  
  const [state, setState] = useState<ResolveState>("checking");
  const [targetAssetId, setTargetAssetId] = useState<string | null>(null);
  const [targetBuId, setTargetBuId] = useState<string | null>(null);

  useEffect(() => {
    async function resolveAsset() {
      // Wait for auth to finish loading
      if (authLoading) return;
      
      // If not authenticated, show public view
      if (!user) {
        setState("public");
        return;
      }

      // Wait for BU data
      if (buLoading) return;

      // User is authenticated - resolve the asset
      setState("resolving");

      if (!code) {
        setState("error");
        return;
      }

      try {
        // Use the global resolver function to find asset by code
        const { data, error } = await supabase.rpc("resolve_asset_by_code_global", {
          code_text: code,
        });

        if (error || !data || data.length === 0) {
          // Asset not found - show public view (which has "not found" state)
          setState("public");
          return;
        }

        const { asset_id, bu_id } = data[0];

        // Check if user has access to this BU
        const hasAccess = userBus.some((m) => m.bu_id === bu_id);

        if (!hasAccess) {
          // User doesn't have access - show public view
          // (they can still see basic info)
          setState("public");
          return;
        }

        // Store target info
        setTargetAssetId(asset_id);
        setTargetBuId(bu_id);

        // If already in correct BU, redirect immediately
        if (currentBuId === bu_id) {
          navigate(`/assets/inventory/${asset_id}`, { replace: true });
          return;
        }

        // Switch BU first
        setState("redirecting");
        selectBu(bu_id);
      } catch (err) {
        console.error("[PublicAssetRedirect] Error resolving asset:", err);
        setState("public"); // Fallback to public view
      }
    }

    resolveAsset();
  }, [code, user, authLoading, buLoading, userBus, currentBuId, navigate, selectBu]);

  // After BU switch, navigate to asset
  useEffect(() => {
    if (state === "redirecting" && targetAssetId && targetBuId && currentBuId === targetBuId) {
      navigate(`/assets/inventory/${targetAssetId}`, { replace: true });
    }
  }, [state, currentBuId, targetAssetId, targetBuId, navigate]);

  // Show loading while checking auth
  if (state === "checking" || state === "resolving" || state === "redirecting") {
    return (
      <LoadingState 
        fullPage 
        text={state === "redirecting" ? "Trocando de BU..." : "Carregando..."}
      />
    );
  }

  // Show public view for unauthenticated users or when asset resolution fails
  return <PublicAsset />;
}
