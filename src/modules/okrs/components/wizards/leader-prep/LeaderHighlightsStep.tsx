/**
 * LeaderHighlightsStep - Etapa 2 do Wizard Líder Prep
 * 
 * Destaques automáticos do sistema:
 * - KRs travados há 2+ semanas
 * - Iniciativas que impactam múltiplos KRs
 * - Colaboradores que sinalizaram ajuda
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  AlertTriangle,
  TrendingDown,
  Zap,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VicInsightsList } from '../shared/VicInsightCard';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import type { LeaderHighlight, VicInsight } from '@/modules/okrs/types/wizard';
import { HIGHLIGHT_CARD_STYLES, RAG_STATUS_COLORS } from '@/lib/colors';
import { ProjectsSummary } from '@/modules/projects/components/ProjectsSummary';

// ============================================================
// TYPES
// ============================================================

export interface LeaderHighlightsStepProps {
  highlights: LeaderHighlight[];
  aiInsights: VicInsight[];
  teamId?: string;
  isLoading?: boolean;
  onContinue: () => void;
  onBack: () => void;
  onDismissInsight?: (id: string) => void;
}

const HIGHLIGHT_CONFIG = {
  stagnant: {
    icon: TrendingDown,
    label: 'Estagnado',
    className: HIGHLIGHT_CARD_STYLES.stagnant.card,
    iconClass: HIGHLIGHT_CARD_STYLES.stagnant.icon,
  },
  blocked: {
    icon: AlertTriangle,
    label: 'Bloqueado',
    className: HIGHLIGHT_CARD_STYLES.blocked.card,
    iconClass: HIGHLIGHT_CARD_STYLES.blocked.icon,
  },
  initiative_impact: {
    icon: Zap,
    label: 'Alto Impacto',
    className: HIGHLIGHT_CARD_STYLES.initiative_impact.card,
    iconClass: HIGHLIGHT_CARD_STYLES.initiative_impact.icon,
  },
  help_requested: {
    icon: HelpCircle,
    label: 'Pediu Ajuda',
    className: HIGHLIGHT_CARD_STYLES.help_requested.card,
    iconClass: HIGHLIGHT_CARD_STYLES.help_requested.icon,
  },
  overdue: {
    icon: Clock,
    label: 'Atrasado',
    className: HIGHLIGHT_CARD_STYLES.overdue.card,
    iconClass: HIGHLIGHT_CARD_STYLES.overdue.icon,
  },
};

// ============================================================
// COMPONENT
// ============================================================

export function LeaderHighlightsStep({
  highlights,
  aiInsights,
  teamId,
  isLoading,
  onContinue,
  onBack,
  onDismissInsight,
}: LeaderHighlightsStepProps) {
  // Sort highlights by priority
  const sortedHighlights = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...highlights].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [highlights]);

  const hasContent = highlights.length > 0 || aiInsights.length > 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Pontos que merecem conversa</h3>
              <WizardTooltipInline tooltipKey="leader-highlights" />
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'leader-prep',
                  step: 'highlights',
                  userRole: 'lider',
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              O sistema identificou esses itens para atenção
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-success mb-4" />
              <h4 className="font-medium text-lg">Tudo em ordem!</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Não foram identificados pontos críticos que precisem de atenção imediata.
              </p>
            </div>
          ) : (
            <>
              {/* AI Insights */}
              {aiInsights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Insights do Vic
                  </h4>
                  <VicInsightsList
                    insights={aiInsights}
                    onDismiss={onDismissInsight}
                  />
                </div>
              )}

              {/* System Highlights */}
              {sortedHighlights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Destaques do Sistema
                  </h4>
                  {sortedHighlights.map((highlight) => {
                    const config = HIGHLIGHT_CONFIG[highlight.type];
                    const Icon = config.icon;

                    return (
                      <Card
                        key={highlight.id}
                        className={cn("transition-colors", config.className)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconClass)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{highlight.title}</p>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    highlight.priority === 'high' && RAG_STATUS_COLORS.red.badge,
                                    highlight.priority === 'medium' && RAG_STATUS_COLORS.yellow.badge,
                                    highlight.priority === 'low' && "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {highlight.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button onClick={onContinue} className="flex-1">
            Preparar pauta
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
