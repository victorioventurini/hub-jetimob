/**
 * TeamOkrKrMetricsStep - Step 6.5: Vincular KPIs aos KRs (Opcional)
 * 
 * Permite pré-selecionar indicadores (KPIs) para vincular aos KRs
 * antes da criação. Os links serão criados automaticamente após
 * a submissão do wizard.
 * 
 * Referência: memory/features/okrs/kpi-kr-linking-ui
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Activity, 
  Target, 
  Gauge, 
  Plus, 
  Trash2, 
  Info, 
  AlertTriangle,
  CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardOptionalStepFooter } from '../shared';
import { KpiSelect } from '@/components/selects/KpiSelect';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { DraftTeamKr, DraftKrMetricLink } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrKrMetricsStepProps {
  draftKrs: DraftTeamKr[];
  draftKrMetricLinks: DraftKrMetricLink[];
  teamId?: string;
  onDraftKrMetricLinksChange: (links: DraftKrMetricLink[]) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrKrMetricsStep({
  draftKrs,
  draftKrMetricLinks,
  teamId,
  onDraftKrMetricLinksChange,
  onContinue,
  onBack,
  onSkip,
}: TeamOkrKrMetricsStepProps) {
  const [expandedKrIndex, setExpandedKrIndex] = useState<number | null>(0);
  const [showGuardrailSelect, setShowGuardrailSelect] = useState<number | null>(null);
  const [kpiNameCache, setKpiNameCache] = useState<Record<string, string>>({});

  // Get links for a specific KR
  const getLinksForKr = useCallback((krIndex: number) => {
    return draftKrMetricLinks.filter(link => link.krIndex === krIndex);
  }, [draftKrMetricLinks]);

  // Get primary KPI for a KR
  const getPrimaryForKr = useCallback((krIndex: number) => {
    return draftKrMetricLinks.find(
      link => link.krIndex === krIndex && link.role === 'primary'
    ) || null;
  }, [draftKrMetricLinks]);

  // Get guardrails for a KR
  const getGuardrailsForKr = useCallback((krIndex: number) => {
    return draftKrMetricLinks.filter(
      link => link.krIndex === krIndex && link.role === 'guardrail'
    );
  }, [draftKrMetricLinks]);

  // All KPI IDs already linked (to exclude from selects)
  const allLinkedKpiIds = useMemo(() => {
    return draftKrMetricLinks.map(link => link.kpiId);
  }, [draftKrMetricLinks]);

  // Add a link
  const handleAddLink = useCallback((
    krIndex: number, 
    kpiId: string, 
    kpiName: string, 
    role: 'primary' | 'guardrail'
  ) => {
    // If adding primary, remove existing primary for this KR first
    let updatedLinks = [...draftKrMetricLinks];
    
    if (role === 'primary') {
      updatedLinks = updatedLinks.filter(
        link => !(link.krIndex === krIndex && link.role === 'primary')
      );
    }
    
    updatedLinks.push({ krIndex, kpiId, kpiName, role });
    onDraftKrMetricLinksChange(updatedLinks);
    
    if (role === 'guardrail') {
      setShowGuardrailSelect(null);
    }
  }, [draftKrMetricLinks, onDraftKrMetricLinksChange]);

  // Remove a link
  const handleRemoveLink = useCallback((krIndex: number, kpiId: string) => {
    const updatedLinks = draftKrMetricLinks.filter(
      link => !(link.krIndex === krIndex && link.kpiId === kpiId)
    );
    onDraftKrMetricLinksChange(updatedLinks);
  }, [draftKrMetricLinks, onDraftKrMetricLinksChange]);

  // Change primary KPI
  const handleChangePrimary = useCallback((krIndex: number, kpiId: string | null) => {
    if (!kpiId) {
      // Remove primary
      const updatedLinks = draftKrMetricLinks.filter(
        link => !(link.krIndex === krIndex && link.role === 'primary')
      );
      onDraftKrMetricLinksChange(updatedLinks);
    } else {
      const kpiName = kpiNameCache[kpiId] || `KPI ${kpiId.slice(0, 8)}`;
      handleAddLink(krIndex, kpiId, kpiName, 'primary');
    }
  }, [draftKrMetricLinks, onDraftKrMetricLinksChange, handleAddLink, kpiNameCache]);

  // Count links per KR for summary
  const linksSummary = useMemo(() => {
    return draftKrs.map((_, idx) => ({
      primary: getPrimaryForKr(idx) !== null,
      guardrailCount: getGuardrailsForKr(idx).length,
    }));
  }, [draftKrs, getPrimaryForKr, getGuardrailsForKr]);

  const hasAnyLinks = draftKrMetricLinks.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Vincular Indicadores</h2>
              <Badge variant="outline" className="text-xs">Opcional</Badge>
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'kr-detail',
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Associe KPIs para monitorar o progresso de cada Key Result. 
              Você pode fazer isso agora ou depois de criar os OKRs.
            </p>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>KPI Primário:</strong> Alimenta automaticamente o progresso do KR (apenas 1 por KR)</p>
                  <p><strong>Guardrails:</strong> Monitoram limites operacionais e alertam quando ultrapassados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KRs List */}
          <div className="space-y-3">
            {draftKrs.map((kr, krIndex) => {
              const primary = getPrimaryForKr(krIndex);
              const guardrails = getGuardrailsForKr(krIndex);
              const isExpanded = expandedKrIndex === krIndex;
              const summary = linksSummary[krIndex];
              
              // Exclude KPIs already linked to this KR
              const excludeIdsForKr = [
                ...(primary ? [primary.kpiId] : []),
                ...guardrails.map(g => g.kpiId),
              ];

              return (
                <Card 
                  key={kr.id} 
                  className={cn(
                    "transition-all",
                    isExpanded && "ring-2 ring-primary/20"
                  )}
                >
                  <CardHeader 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedKrIndex(isExpanded ? null : krIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{kr.title}</span>
                        <Badge variant="secondary" className="text-xs capitalize shrink-0">
                          {kr.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {summary.primary && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-success" />
                                  Primário
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>KPI primário configurado</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {summary.guardrailCount > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Gauge className="h-3 w-3 text-warning" />
                            {summary.guardrailCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      <Separator />

                      {/* Primary KPI */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">KPI Primário</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  O KPI primário alimenta automaticamente o progresso do KR.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        <KpiSelect
                          value={primary?.kpiId}
                          onValueChange={(kpiId) => 
                            handleChangePrimary(krIndex, kpiId)
                          }
                          placeholder="Selecione o KPI primário"
                          excludeIds={guardrails.map(g => g.kpiId)}
                          teamId={teamId}
                          allowNone={true}
                          noneLabel="Nenhum"
                        />
                        
                        {primary && (
                          <p className="text-xs text-muted-foreground pl-5">
                            {primary.kpiName}
                          </p>
                        )}
                      </div>

                      {/* Guardrails */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-3.5 w-3.5 text-warning" />
                            <span className="text-xs font-medium">Guardrails</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">
                                    Guardrails monitoram limites operacionais.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          {showGuardrailSelect !== krIndex && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setShowGuardrailSelect(krIndex)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Adicionar
                            </Button>
                          )}
                        </div>

                        {/* Existing guardrails */}
                        {guardrails.length > 0 && (
                          <div className="space-y-1.5">
                            {guardrails.map((guardrail) => (
                              <div
                                key={guardrail.kpiId}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50 border"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                                  <span className="text-sm truncate">
                                    {guardrail.kpiName}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveLink(krIndex, guardrail.kpiId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add guardrail select */}
                        {showGuardrailSelect === krIndex && (
                          <div className="flex gap-2">
                            <div className="flex-1">
                            <KpiSelect
                                onValueChange={(kpiId) => {
                                  if (kpiId) {
                                    const kpiName = kpiNameCache[kpiId] || `KPI ${kpiId.slice(0, 8)}`;
                                    handleAddLink(krIndex, kpiId, kpiName, 'guardrail');
                                  }
                                }}
                                placeholder="Selecione um indicador"
                                excludeIds={excludeIdsForKr}
                                teamId={teamId}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowGuardrailSelect(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}

                        {guardrails.length === 0 && showGuardrailSelect !== krIndex && (
                          <p className="text-xs text-muted-foreground pl-5">
                            Nenhum guardrail configurado
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          {hasAnyLinks && (
            <Card className="border-success/30 bg-success-muted">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {draftKrMetricLinks.length} indicador{draftKrMetricLinks.length > 1 ? 'es' : ''} pré-selecionado{draftKrMetricLinks.length > 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <WizardOptionalStepFooter
        onBack={onBack}
        onSkip={onSkip}
        onPrimary={onContinue}
        skipLabel="Pular"
        primaryLabel={hasAnyLinks ? "Continuar" : "Pular"}
      />
    </div>
  );
}
