/**
 * LeaderInsightsStep — Step read-only de insights gerados pelo sistema/IA.
 *
 * Diferente do `HighlightsAndRisksStep` (CRUD livre), este step:
 * - Renderiza cards de insights estagnados/bloqueados/alto-impacto/pediu-ajuda/atrasados
 * - Suporta opcionalmente uma seção de "Insights do Vic" (IA), com descarte
 * - Não permite criar novos itens — apenas ler e descartar (quando habilitado)
 *
 * Mantém o contrato do framework: data-driven, agnóstico de persona,
 * decisões inline ubíquas via `_InlineDecisionsSlot`.
 */

import { memo, useMemo } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingDown,
  Zap,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HIGHLIGHT_CARD_STYLES, RAG_STATUS_COLORS } from '@/lib/colors';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { LeaderInsightsStepConfig } from '../types';
import type { LeaderInsightItem, LeaderInsightsData } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface LeaderInsightsStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: LeaderInsightsStepConfig;
  data: LeaderInsightsData;
  onDataChange: (next: LeaderInsightsData) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

const INSIGHT_TYPE_CONFIG: Record<
  LeaderInsightItem['type'],
  { icon: typeof Lightbulb; label: string; cardClass: string; iconClass: string }
> = {
  stagnant: {
    icon: TrendingDown,
    label: 'Estagnado',
    cardClass: HIGHLIGHT_CARD_STYLES.stagnant.card,
    iconClass: HIGHLIGHT_CARD_STYLES.stagnant.icon,
  },
  blocked: {
    icon: AlertTriangle,
    label: 'Bloqueado',
    cardClass: HIGHLIGHT_CARD_STYLES.blocked.card,
    iconClass: HIGHLIGHT_CARD_STYLES.blocked.icon,
  },
  initiative_impact: {
    icon: Zap,
    label: 'Alto Impacto',
    cardClass: HIGHLIGHT_CARD_STYLES.initiative_impact.card,
    iconClass: HIGHLIGHT_CARD_STYLES.initiative_impact.icon,
  },
  help_requested: {
    icon: HelpCircle,
    label: 'Pediu Ajuda',
    cardClass: HIGHLIGHT_CARD_STYLES.help_requested.card,
    iconClass: HIGHLIGHT_CARD_STYLES.help_requested.icon,
  },
  overdue: {
    icon: Clock,
    label: 'Atrasado',
    cardClass: HIGHLIGHT_CARD_STYLES.overdue.card,
    iconClass: HIGHLIGHT_CARD_STYLES.overdue.icon,
  },
};

const PRIORITY_ORDER: Record<LeaderInsightItem['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const LeaderInsightsStep = memo(function LeaderInsightsStep({
  persona,
  version,
  stepId,
  config,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: LeaderInsightsStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const dismissed = data.dismissedIds ?? [];
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);

  const visibleInsights = useMemo(
    () =>
      [...(data.insights ?? [])]
        .filter((i) => !dismissedSet.has(i.id))
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [data.insights, dismissedSet],
  );

  const aiInsights = useMemo(
    () => visibleInsights.filter((i) => i.source === 'ai'),
    [visibleInsights],
  );
  const systemInsights = useMemo(
    () => visibleInsights.filter((i) => i.source === 'system'),
    [visibleInsights],
  );

  const showAi = config.showAiInsights !== false && aiInsights.length > 0;

  const handleDismiss = (id: string) => {
    onDataChange({
      insights: data.insights,
      dismissedIds: [...dismissed, id],
    });
  };

  const totalCount = visibleInsights.length;
  const headerBadge = totalCount > 0 ? `${totalCount}` : undefined;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Lightbulb}
          title={label.title}
          description={label.subtitle}
          variant="primary"
          badge={headerBadge}
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-success mb-4" />
            <h4 className="font-medium text-lg">Tudo em ordem!</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Não foram identificados pontos críticos que precisem de atenção imediata.
            </p>
          </div>
        ) : (
          <>
            {showAi && (
              <section className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Insights do Vic
                </h4>
                {aiInsights.map((insight) => {
                  const cfg = INSIGHT_TYPE_CONFIG[insight.type];
                  const Icon = cfg.icon;
                  return (
                    <Card key={insight.id} className={cn('transition-colors', cfg.cardClass)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', cfg.iconClass)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-sm">{insight.title}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  insight.priority === 'high' && RAG_STATUS_COLORS.red.badge,
                                  insight.priority === 'medium' && RAG_STATUS_COLORS.yellow.badge,
                                  insight.priority === 'low' && 'bg-muted text-muted-foreground',
                                )}
                              >
                                {cfg.label}
                              </Badge>
                            </div>
                            {insight.description && (
                              <p className="text-sm text-muted-foreground">
                                {insight.description}
                              </p>
                            )}
                          </div>
                          {config.dismissable && insight.dismissable !== false && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleDismiss(insight.id)}
                            >
                              Dispensar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            )}

            {systemInsights.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Destaques do Sistema
                </h4>
                {systemInsights.map((insight) => {
                  const cfg = INSIGHT_TYPE_CONFIG[insight.type];
                  const Icon = cfg.icon;
                  return (
                    <Card key={insight.id} className={cn('transition-colors', cfg.cardClass)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', cfg.iconClass)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-sm">{insight.title}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  insight.priority === 'high' && RAG_STATUS_COLORS.red.badge,
                                  insight.priority === 'medium' && RAG_STATUS_COLORS.yellow.badge,
                                  insight.priority === 'low' && 'bg-muted text-muted-foreground',
                                )}
                              >
                                {cfg.label}
                              </Badge>
                            </div>
                            {insight.description && (
                              <p className="text-sm text-muted-foreground">
                                {insight.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </WizardStepScaffold>
  );
});
