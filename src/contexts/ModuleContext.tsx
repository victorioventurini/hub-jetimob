import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createBuScopedClient } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export interface HubModule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  type: "global" | "operational";
  display_order: number;
  is_enabled: boolean;
}

interface ModuleContextType {
  modules: HubModule[];
  globalModules: HubModule[];
  operationalModules: HubModule[];
  enabledOperationalModules: HubModule[];
  isLoading: boolean;
  isModuleEnabled: (slug: string) => boolean;
  getModuleBySlug: (slug: string) => HubModule | undefined;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { currentBuId, currentBu } = useBu();

  // NOTE: ModuleProvider is mounted even before BU selection (e.g. /auth, /select-bu).
  // We must NOT call useBuScopedSupabase() here because it intentionally throws when
  // currentBuId is null. Instead:
  // - Before BU selection: use global client (allowed pre-BU)
  // - After BU selection: use BU-scoped client (createBuScopedClient)
  const buClient = useMemo(() => {
    return currentBuId ? createBuScopedClient(currentBuId) : null;
  }, [currentBuId]);

  const { data: modules = [], isLoading } = useQuery({
    // IMPORTANTE: incluir user?.id no cache key para evitar "cache" com resposta anônima
    // (sem sessão) que acontece no primeiro load e só resolve após refresh.
    queryKey: queryKeys.identity.modules(user?.id ?? null, currentBu?.id ?? null),
    enabled: !authLoading && !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      if (!currentBu?.id) {
        // Se não há BU ativa, retornar apenas módulos globais.
        // Permitido usar cliente global aqui (pré-BU).
        const { data, error } = await supabase
          .from("modules")
          .select("id, name, slug, description, icon, route, type, display_order")
          .eq("status", "active")
          .eq("type", "global")
          .order("display_order");

        if (error) throw error;

        return (data || []).map((m) => ({
          ...m,
          type: m.type as "global" | "operational",
          is_enabled: true,
        })) as HubModule[];
      }

      // Se há BU ativa, usar cliente BU-scoped e a RPC de módulos.
      if (!buClient) {
        // Should never happen because currentBuId exists when currentBu exists
        throw new Error("ModuleProvider: buClient not initialized for active BU");
      }

      const { data, error } = await buClient.rpc("get_enabled_modules_for_bu", {
        p_bu_id: currentBu.id,
      });

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        icon: m.icon,
        route: m.route,
        type: m.type as "global" | "operational",
        display_order: m.display_order,
        is_enabled: m.is_enabled,
      })) as HubModule[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const globalModules = useMemo(
    () => modules.filter((m) => m.type === "global"),
    [modules]
  );

  const operationalModules = useMemo(
    () => modules.filter((m) => m.type === "operational"),
    [modules]
  );

  const enabledOperationalModules = useMemo(
    () => operationalModules.filter((m) => m.is_enabled),
    [operationalModules]
  );

  const isModuleEnabled = (slug: string): boolean => {
    const module = modules.find((m) => m.slug === slug);
    if (!module) return false;
    // Módulos globais estão sempre habilitados
    if (module.type === "global") return true;
    // Módulos operacionais dependem da config da BU
    return module.is_enabled;
  };

  const getModuleBySlug = (slug: string): HubModule | undefined => {
    return modules.find((m) => m.slug === slug);
  };

  return (
    <ModuleContext.Provider
      value={{
        modules,
        globalModules,
        operationalModules,
        enabledOperationalModules,
        isLoading,
        isModuleEnabled,
        getModuleBySlug,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error("useModules must be used within a ModuleProvider");
  }
  return context;
}
