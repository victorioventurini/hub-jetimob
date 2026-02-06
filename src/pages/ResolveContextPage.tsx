import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/globalClient";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { useExternalUser } from "@/modules/external/hooks/useExternalUser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

type EntityType = 
  | "asset" 
  | "team" 
  | "user" 
  | "ticket" 
  | "okr_org_objective" 
  | "okr_team_objective"
  | "okr_org_kr"
  | "okr_team_kr"
  | "keyring"
  | "gift"
  | "kpi"
  | "checkin"
  | "health_alert";

interface EntityConfig {
  targetPath: (id: string, additionalData?: Record<string, string>) => string;
  label: string;
  /** If true, resolve additional data before generating targetPath */
  resolveAdditionalData?: (id: string) => Promise<Record<string, string> | null>;
}

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  asset: {
    targetPath: (id) => `/assets/inventory/${id}`,
    label: "item do inventário",
  },
  team: {
    targetPath: (id) => `/teams/${id}`,
    label: "time",
  },
  user: {
    targetPath: (id) => `/users/${id}`,
    label: "usuário",
  },
  ticket: {
    targetPath: (id) => `/tickets/${id}`,
    label: "ticket",
  },
  okr_org_objective: {
    targetPath: (id) => `/okrs/org/${id}`,
    label: "objetivo organizacional",
  },
  okr_team_objective: {
    targetPath: (id) => `/okrs/team/${id}`,
    label: "objetivo de time",
  },
  okr_org_kr: {
    targetPath: (id, data) => data?.objective_id 
      ? `/okrs/org-view/${data.objective_id}?kr=${id}` 
      : `/okrs/org-view?kr=${id}`,
    label: "KR organizacional",
    resolveAdditionalData: async (id) => {
      const { data } = await supabase
        .from("okr_org_key_results")
        .select("org_objective_id")
        .eq("id", id)
        .maybeSingle();
      return data?.org_objective_id ? { objective_id: data.org_objective_id } : null;
    },
  },
  okr_team_kr: {
    targetPath: (id) => `/okrs?kr=${id}`,
    label: "KR de time",
  },
  keyring: {
    targetPath: (id) => `/assets/keys?keyring=${id}`,
    label: "chaveiro",
  },
  gift: {
    targetPath: (id) => `/assets/gifts?item=${id}`,
    label: "brinde",
  },
  kpi: {
    targetPath: (id) => `/kpis?metric=${id}`,
    label: "KPI",
  },
  checkin: {
    // Check-ins redirect to the parent KR
    targetPath: (id) => `/okrs?checkin=${id}`,
    label: "check-in",
  },
  health_alert: {
    targetPath: () => `/hub/notifications?tab=diagnostics`,
    label: "alerta de saúde",
  },
};

async function resolveBuId(entity: EntityType, id: string): Promise<string | null> {
  switch (entity) {
    case "asset": {
      const { data } = await supabase
        .from("asset_inventory")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "team": {
      const { data } = await supabase
        .from("teams")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "user": {
      const { data } = await supabase
        .from("profiles")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "ticket": {
      const { data } = await supabase
        .from("tickets")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "okr_org_objective": {
      const { data } = await supabase
        .from("okr_org_objectives")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "okr_team_objective": {
      const { data } = await supabase
        .from("okr_team_objectives")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "keyring": {
      const { data } = await supabase
        .from("asset_keyrings")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "gift": {
      const { data } = await supabase
        .from("asset_gift_items")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "okr_org_kr": {
      const { data } = await supabase
        .from("okr_org_key_results")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "okr_team_kr": {
      const { data } = await supabase
        .from("okr_team_key_results")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "kpi": {
      const { data } = await supabase
        .from("kpi_metrics")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    case "checkin": {
      // Resolve BU from the parent KR
      const { data } = await supabase
        .from("okr_checkins")
        .select("kr_id")
        .eq("id", id)
        .maybeSingle();
      
      if (!data?.kr_id) return null;
      
      // Get BU from the KR
      const { data: krData } = await supabase
        .from("okr_team_key_results")
        .select("bu_id")
        .eq("id", data.kr_id)
        .maybeSingle();
      
      return krData?.bu_id ?? null;
    }
    case "health_alert": {
      const { data } = await supabase
        .from("notification_health_alerts")
        .select("bu_id")
        .eq("id", id)
        .maybeSingle();
      return data?.bu_id ?? null;
    }
    default:
      return null;
  }
}

type ResolveStatus = "loading" | "no_access" | "not_found" | "error" | "switching";

export default function ResolveContextPage() {
  const { entity, id } = useParams<{ entity: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { userBus, isLoading: buLoading, selectBu, currentBuId } = useBu();
  const { allBuIds: externalBuIds, isLoading: externalLoading } = useExternalUser();
  
  const [status, setStatus] = useState<ResolveStatus>("loading");
  const [targetBuId, setTargetBuId] = useState<string | null>(null);
  const [targetPath, setTargetPath] = useState<string | null>(null);

  useEffect(() => {
    async function resolveContext() {
      // Wait for auth, BU data, and external data to load
      if (authLoading || buLoading || externalLoading) return;
      
      // If not authenticated, redirect to login with return URL
      if (!user) {
        navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
        return;
      }

      // Validate entity type
      if (!entity || !id || !(entity in ENTITY_CONFIGS)) {
        console.warn("[ResolveContext] Invalid entity or id:", { entity, id });
        setStatus("not_found");
        return;
      }

      const config = ENTITY_CONFIGS[entity as EntityType];
      
      try {
        // Resolve bu_id for the entity
        const buId = await resolveBuId(entity as EntityType, id);

        if (!buId) {
          console.warn("[ResolveContext] Could not determine BU for resource:", id);
          setStatus("not_found");
          return;
        }

        // Check if user has access to this BU
        // First check internal memberships
        let hasAccess = userBus.some(m => m.bu_id === buId);
        
        // Fallback: check if user is an external partner with access to this BU
        if (!hasAccess && externalBuIds.length > 0) {
          hasAccess = externalBuIds.includes(buId);
          console.log("[ResolveContext] External partner access check:", { buId, hasAccess, externalBuIds });
        }
        
        if (!hasAccess) {
          console.warn("[ResolveContext] User does not have access to BU:", buId);
          setStatus("no_access");
          return;
        }

        // Resolve additional data if needed (e.g., objective_id for org KRs)
        let additionalData: Record<string, string> | null = null;
        if (config.resolveAdditionalData) {
          additionalData = await config.resolveAdditionalData(id);
        }

        // Store target info for after BU switch
        const finalPath = config.targetPath(id, additionalData ?? undefined);
        setTargetBuId(buId);
        setTargetPath(finalPath);

        // If already on correct BU, navigate immediately
        if (currentBuId === buId) {
          navigate(finalPath, { replace: true });
          return;
        }

        // Switch to the correct BU
        setStatus("switching");
        selectBu(buId);
        
      } catch (err) {
        console.error("[ResolveContext] Error resolving context:", err);
        setStatus("error");
      }
    }

    resolveContext();
  }, [entity, id, user, userBus, externalBuIds, authLoading, buLoading, externalLoading, navigate, location.pathname, currentBuId, selectBu]);

  // After BU switch, navigate to target
  useEffect(() => {
    if (status === "switching" && targetBuId && targetPath && currentBuId === targetBuId) {
      navigate(targetPath, { replace: true });
    }
  }, [status, currentBuId, targetBuId, targetPath, navigate]);

  // Loading state
  if (status === "loading" || status === "switching") {
    return (
      <LoadingState 
        fullPage 
        text={status === "switching" ? "Trocando de Business Unit..." : "Carregando..."} 
      />
    );
  }

  // Not found state
  if (status === "not_found") {
    const config = entity && entity in ENTITY_CONFIGS 
      ? ENTITY_CONFIGS[entity as EntityType] 
      : null;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Recurso não encontrado</CardTitle>
            <CardDescription>
              {config 
                ? `O ${config.label} solicitado não existe ou foi removido.`
                : "O recurso solicitado não foi encontrado."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o início
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No access state
  if (status === "no_access") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Sem permissão</CardTitle>
            <CardDescription>
              Você não tem acesso a esta Business Unit ou o recurso pertence a uma BU diferente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="gap-2 w-full">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o início
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/select-bu">
                Trocar de Business Unit
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Erro ao carregar</CardTitle>
          <CardDescription>
            Ocorreu um erro ao tentar acessar este recurso. Tente novamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o início
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
