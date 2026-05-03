/**
 * EditKpiScopeSection — Escopo, Área e Responsabilidade Operacional
 * Extraído de EditKpiDialog.tsx (refatoração P1.4)
 */
import type { UseFormReturn } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AreaSelect, TeamSelect } from '@/components/selects';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { InfoNotice } from '@/components/ui/info-notice';
import { Info, Lock } from 'lucide-react';
import type { KpiMetric, KpiScope } from '../../types';
import type { EditKpiFormValues } from './editKpiSchema';

interface ScopePermissions {
  canChangeScope: boolean;
  allowedScopes: KpiScope[];
  allowedTeamIds: string[];
}

interface EditKpiScopeSectionProps {
  form: UseFormReturn<EditKpiFormValues>;
  kpi: KpiMetric | null;
  scopeLabels: Record<KpiScope, string>;
  scopePermissions: ScopePermissions;
  onScopeChange: (scope: KpiScope) => void;
  inferredAreaName: string | null;
  isLoadingArea: boolean;
}

export function EditKpiScopeSection({
  form,
  kpi,
  scopeLabels,
  scopePermissions,
  onScopeChange,
  inferredAreaName,
  isLoadingArea,
}: EditKpiScopeSectionProps) {
  const watchScope = form.watch('scope');
  const watchLifecycleStatus = form.watch('lifecycle_status');
  const watchTeamId = form.watch('team_id');

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                Escopo
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {scopePermissions.canChangeScope ? (
                        scopePermissions.allowedScopes.length === 1 ? (
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : null
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {!scopePermissions.canChangeScope ? (
                        <p>
                          {kpi?.scope === 'org' || kpi?.scope === 'area'
                            ? 'Apenas administradores podem alterar o escopo de KPIs Globais ou de Área.'
                            : 'Você não tem permissão para alterar o escopo deste indicador.'}
                        </p>
                      ) : scopePermissions.allowedScopes.length === 1 ? (
                        <p>
                          Como líder de time, você pode mover este indicador para outros times que
                          lidera.
                        </p>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Select
                onValueChange={(val) => onScopeChange(val as KpiScope)}
                value={field.value}
                disabled={!scopePermissions.canChangeScope}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(scopeLabels) as KpiScope[])
                    .filter((sc) =>
                      scopePermissions.canChangeScope
                        ? scopePermissions.allowedScopes.includes(sc)
                        : sc === field.value,
                    )
                    .map((sc) => (
                      <SelectItem key={sc} value={sc}>
                        {scopeLabels[sc]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {scopePermissions.canChangeScope &&
                scopePermissions.allowedScopes.length === 1 && (
                  <FormDescription>
                    Você pode mover para outro time que lidera.
                  </FormDescription>
                )}
              <FormMessage />
            </FormItem>
          )}
        />

        {watchScope === 'area' ? (
          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Área{' '}
                  {watchLifecycleStatus === 'active' && (
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
        ) : watchScope === 'team' ? (
          <FormItem>
            <FormLabel>Área (inferida)</FormLabel>
            <div className="h-10 flex items-center">
              {isLoadingArea ? (
                <span className="text-sm text-muted-foreground">Carregando...</span>
              ) : inferredAreaName ? (
                <Badge variant="secondary" className="text-sm">
                  {inferredAreaName}
                </Badge>
              ) : watchTeamId ? (
                <span className="text-sm text-muted-foreground">Time sem área definida</span>
              ) : (
                <span className="text-sm text-muted-foreground">Selecione um time</span>
              )}
            </div>
          </FormItem>
        ) : null}
      </div>

      {watchScope === 'org' && (
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
                    Área Responsável{' '}
                    {watchLifecycleStatus === 'active' && (
                      <span className="text-destructive">*</span>
                    )}
                    <HelpTooltip content="Qual área é responsável por acompanhar e agir em desvios deste indicador global?" />
                  </FormLabel>
                  <FormControl>
                    <AreaSelect
                      value={field.value}
                      onValueChange={(val) => field.onChange(val ?? undefined)}
                      placeholder="Selecione..."
                      triggerClassName="w-full"
                      includeNone={watchLifecycleStatus !== 'active'}
                      noneLabel="Nenhuma área"
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
                    <HelpTooltip content="Time accountable por acompanhar e agir em desvios deste indicador global." />
                  </FormLabel>
                  <FormControl>
                    <TeamSelect
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
          </div>

          <InfoNotice variant="info">
            KPIs Globais impactam toda a organização e requerem uma área operacionalmente
            responsável por acompanhar e agir em desvios.
          </InfoNotice>
        </div>
      )}

      {watchScope === 'area' && (
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
                  onValueChange={(val) => field.onChange(val ?? undefined)}
                  placeholder="Selecione..."
                  triggerClassName="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
