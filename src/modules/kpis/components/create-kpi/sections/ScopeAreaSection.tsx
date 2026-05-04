import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AreaSelect, TeamSelect } from "@/components/selects";
import { Badge } from "@/components/ui/badge";
import { InfoNotice } from "@/components/ui/info-notice";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Info, Lock } from "lucide-react";
import { FormDescription } from "@/components/ui/form";
import type { KpiScope } from "../../../types";
import type { CreateKpiFormValues } from "../schema";

interface Props {
  form: UseFormReturn<CreateKpiFormValues>;
  scopeLabels: Record<KpiScope, string>;
  buName?: string;
  canCreateStrategicScopes: boolean;
  watchIndicatorType: string;
  watchScope: KpiScope;
  watchLifecycleStatus: string;
  watchTeamId?: string;
  inferredAreaName: string | null;
  isLoadingArea: boolean;
  onScopeChange: (scope: KpiScope) => void;
}

export function ScopeAreaSection({
  form,
  scopeLabels,
  buName,
  canCreateStrategicScopes,
  watchIndicatorType,
  watchScope,
  watchLifecycleStatus,
  watchTeamId,
  inferredAreaName,
  isLoadingArea,
  onScopeChange,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Escopo
                <HelpTooltip
                  content={
                    <div className="space-y-1">
                      <p>
                        <strong>Time:</strong> Indicador específico de um time (área
                        inferida automaticamente).
                      </p>
                      <p>
                        <strong>Área:</strong> Indicador compartilhado por toda uma área.
                      </p>
                      <p>
                        <strong>{buName || "Organização"}:</strong> Indicador global
                        visível para toda a BU.
                      </p>
                      {!canCreateStrategicScopes && (
                        <p className="text-muted-foreground text-xs mt-2">
                          <Lock className="h-3 w-3 inline mr-1" />
                          Escopos Área e Global requerem permissões de administrador.
                        </p>
                      )}
                    </div>
                  }
                />
              </FormLabel>
              <Select onValueChange={onScopeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(scopeLabels) as KpiScope[]).map((sc) => {
                    const isMetricBlocked =
                      watchIndicatorType === "metric" && sc !== "team";
                    const isStrategicBlocked =
                      (sc === "org" || sc === "area") && !canCreateStrategicScopes;
                    if (isMetricBlocked) return null;
                    return (
                      <SelectItem key={sc} value={sc} disabled={isStrategicBlocked}>
                        {scopeLabels[sc]}
                        {isStrategicBlocked && (
                          <Lock className="h-3 w-3 inline ml-1 text-muted-foreground" />
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchScope === "area" ? (
          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Área {watchLifecycleStatus === "active" && (
                    <span className="text-destructive">*</span>
                  )}
                  <HelpTooltip content="Domínio estratégico responsável por este indicador." />
                </FormLabel>
                <FormControl>
                  <AreaSelect
                    value={field.value}
                    onValueChange={(val) => field.onChange(val ?? undefined)}
                    placeholder="Selecione..."
                    triggerClassName="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : watchScope === "team" ? (
          <FormItem>
            <FormLabel>
              Área (inferida)
              <HelpTooltip content="A área é automaticamente inferida do time selecionado." />
            </FormLabel>
            <div className="h-10 flex items-center">
              {isLoadingArea ? (
                <span className="text-sm text-muted-foreground">Carregando...</span>
              ) : inferredAreaName ? (
                <Badge variant="secondary" className="text-sm">
                  {inferredAreaName}
                </Badge>
              ) : watchTeamId ? (
                <span className="text-sm text-muted-foreground">
                  Time sem área definida
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Selecione um time</span>
              )}
            </div>
          </FormItem>
        ) : null}
      </div>

      {watchScope === "org" && (
        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">Responsabilidade Operacional</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Esta KPI é Global, mas quem responde por ela no dia a dia é:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="responsible_area_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Área Responsável {watchLifecycleStatus === "active" && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <AreaSelect
                      value={field.value}
                      onValueChange={(val) => field.onChange(val ?? undefined)}
                      placeholder="Selecione..."
                      triggerClassName="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsible_team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Time Responsável <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <TeamSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Selecione..."
                      triggerClassName="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <InfoNotice variant="info">
            KPIs Globais impactam toda a organização e requerem uma área operacionalmente
            responsável por acompanhar e agir em desvios.
          </InfoNotice>
        </div>
      )}

      {watchScope === "area" && (
        <FormField
          control={form.control}
          name="responsible_team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Time Responsável <span className="text-destructive">*</span>
                <HelpTooltip content="Time principal responsável por acompanhar este indicador da área." />
              </FormLabel>
              <FormControl>
                <TeamSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Selecione..."
                  triggerClassName="w-full"
                />
              </FormControl>
              <FormDescription>
                Time accountable por acompanhar e agir nos desvios deste indicador.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
