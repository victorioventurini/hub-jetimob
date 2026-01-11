import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useVicConfig, useVicAgentActivations, VIC_AGENTS } from "@/modules/vic";
import type { VicAgentSlug } from "@/modules/vic";
import { useState, useEffect } from "react";
import { queryKeys } from "@/lib/queryKeys";

export function BuIaSettings() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const { updateConfig, isUpdating } = useVicConfig();
  const { activations, isLoading: isLoadingActivations, toggleAgent, isToggling } = useVicAgentActivations();
  
  // Local form state
  const [iaEnabled, setIaEnabled] = useState(true);
  const [iaMode, setIaMode] = useState<"manual" | "assisted">("manual");
  const [maxUserCalls, setMaxUserCalls] = useState<string>("");
  const [maxBuCalls, setMaxBuCalls] = useState<string>("");

  // Fetch current config
  const { data: iaConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: queryKeys.vic.buConfig(currentBu?.id ?? null),
    queryFn: async () => {
      if (!currentBu?.id) return null;

      const { data, error } = await supabase
        .from("bu_ia_config")
        .select("id, bu_id, ia_enabled, ia_mode, max_calls_per_user_day, max_calls_per_bu_day, created_at, updated_at")
        .eq("bu_id", currentBu.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data;
    },
    enabled: !!currentBu?.id,
  });

  // Fetch global agents
  const { data: globalAgents, isLoading: isLoadingAgents } = useQuery({
    queryKey: queryKeys.vic.globalAgents(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("id, name, slug, description, is_active")
        .eq("scope", "global")
        .eq("is_active", true)
        .not("slug", "in", "(vic-persona,vic-greeting)")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Sync local state with fetched config
  useEffect(() => {
    if (iaConfig) {
      setIaEnabled(iaConfig.ia_enabled);
      setIaMode(iaConfig.ia_mode as "manual" | "assisted");
      setMaxUserCalls(iaConfig.max_calls_per_user_day?.toString() || "");
      setMaxBuCalls(iaConfig.max_calls_per_bu_day?.toString() || "");
    }
  }, [iaConfig]);

  const handleSaveConfig = () => {
    updateConfig({
      ia_enabled: iaEnabled,
      ia_mode: iaMode,
      max_calls_per_user_day: maxUserCalls ? parseInt(maxUserCalls) : null,
      max_calls_per_bu_day: maxBuCalls ? parseInt(maxBuCalls) : null,
    });
  };

  const getAgentActivation = (agentId: string) => {
    const activation = activations?.find((a) => a.agent_id === agentId);
    return activation?.is_enabled ?? true; // Default to enabled
  };

  const isLoading = isLoadingConfig || isLoadingAgents || isLoadingActivations;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main IA Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Vic (IA)</CardTitle>
              <CardDescription>
                Configure como a IA interage nesta Business Unit
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ia-enabled" className="text-base">
                Habilitar IA
              </Label>
              <p className="text-sm text-muted-foreground">
                Ativa ou desativa todas as funcionalidades do Vic nesta BU
              </p>
            </div>
            <Switch
              id="ia-enabled"
              checked={iaEnabled}
              onCheckedChange={setIaEnabled}
            />
          </div>

          <Separator />

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base">Modo de interação</Label>
            <RadioGroup
              value={iaMode}
              onValueChange={(v) => setIaMode(v as "manual" | "assisted")}
              className="grid grid-cols-2 gap-4"
              disabled={!iaEnabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="mode-manual" />
                <Label htmlFor="mode-manual" className="flex flex-col cursor-pointer">
                  <span className="font-medium">Manual</span>
                  <span className="text-xs text-muted-foreground">
                    Vic aparece apenas por botão
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assisted" id="mode-assisted" />
                <Label htmlFor="mode-assisted" className="flex flex-col cursor-pointer">
                  <span className="font-medium">Assistido</span>
                  <span className="text-xs text-muted-foreground">
                    Sugestões contextuais discretas
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Rate Limits */}
          <div className="space-y-4">
            <Label className="text-base">Limites de uso (opcional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-user" className="text-sm">
                  Máx. chamadas/usuário/dia
                </Label>
                <Input
                  id="max-user"
                  type="number"
                  placeholder="Ilimitado"
                  value={maxUserCalls}
                  onChange={(e) => setMaxUserCalls(e.target.value)}
                  disabled={!iaEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-bu" className="text-sm">
                  Máx. chamadas/BU/dia
                </Label>
                <Input
                  id="max-bu"
                  type="number"
                  placeholder="Ilimitado"
                  value={maxBuCalls}
                  onChange={(e) => setMaxBuCalls(e.target.value)}
                  disabled={!iaEnabled}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

      {/* Agent Toggles */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Agentes</CardTitle>
              <CardDescription>
                Ative ou desative agentes específicos para esta BU
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {globalAgents?.map((agent) => {
              const isEnabled = getAgentActivation(agent.id);
              const slugKey = agent.slug as VicAgentSlug | null;
              const agentMeta = slugKey && slugKey in VIC_AGENTS ? VIC_AGENTS[slugKey] : null;

              return (
                <div
                  key={agent.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      {!iaEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          IA desabilitada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {agent.description || agentMeta?.description}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled && iaEnabled}
                    onCheckedChange={(checked) =>
                      toggleAgent({ agentId: agent.id, isEnabled: checked })
                    }
                    disabled={!iaEnabled || isToggling}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
