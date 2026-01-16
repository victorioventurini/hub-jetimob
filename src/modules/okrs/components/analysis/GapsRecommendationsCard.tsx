/**
 * GapsRecommendationsCard - Card com gaps identificados e recomendações
 */

import { AlertTriangle, Users, Link2Off, Activity, Compass, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AnalysisGaps } from "../../hooks";

export interface GapItem {
  icon: React.ElementType;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count?: number;
  type: string;
}

interface GapsRecommendationsCardProps {
  gaps: AnalysisGaps;
  className?: string;
  onAskVicAboutGap?: (gapType: string, gapData: GapItem) => void;
}

export function GapsRecommendationsCard({ 
  gaps, 
  className,
  onAskVicAboutGap,
}: GapsRecommendationsCardProps) {
  const gapItems: GapItem[] = [];

  // Teams without OKRs
  if (gaps.teamsWithoutOkrs.length > 0) {
    gapItems.push({
      icon: Users,
      title: 'Times sem OKRs',
      description: gaps.teamsWithoutOkrs.map(t => t.name).join(', '),
      severity: 'high',
      count: gaps.teamsWithoutOkrs.length,
      type: 'teams-without-okrs',
    });
  }

  // Org KRs without team links
  if (gaps.orgKrsWithoutTeamLinks.length > 0) {
    gapItems.push({
      icon: Link2Off,
      title: 'KRs org sem vinculação',
      description: gaps.orgKrsWithoutTeamLinks.slice(0, 3).map(kr => kr.title).join('; ') + 
        (gaps.orgKrsWithoutTeamLinks.length > 3 ? '...' : ''),
      severity: 'medium',
      count: gaps.orgKrsWithoutTeamLinks.length,
      type: 'krs-without-links',
    });
  }

  // Teams with low health
  if (gaps.teamsWithLowHealth.length > 0) {
    gapItems.push({
      icon: Activity,
      title: 'Times em risco',
      description: gaps.teamsWithLowHealth.map(t => `${t.name} (${t.healthScore}%)`).join(', '),
      severity: 'high',
      count: gaps.teamsWithLowHealth.length,
      type: 'teams-low-health',
    });
  }

  // Uncovered strategic areas
  if (gaps.strategicAreasUncovered.length > 0) {
    gapItems.push({
      icon: Compass,
      title: 'Áreas estratégicas descobertas',
      description: gaps.strategicAreasUncovered.join(', '),
      severity: 'medium',
      count: gaps.strategicAreasUncovered.length,
      type: 'uncovered-areas',
    });
  }

  const severityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const hasNoGaps = gapItems.length === 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Gaps e Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasNoGaps ? (
          <div className="text-center py-6 text-muted-foreground">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium">Nenhum gap crítico identificado</p>
            <p className="text-xs mt-1">A estrutura das OKRs está bem alinhada</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {gapItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0",
                      item.severity === 'high' 
                        ? 'bg-red-100 dark:bg-red-900/30' 
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        item.severity === 'high' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.count && (
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", severityColors[item.severity])}
                          >
                            {item.count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    {onAskVicAboutGap && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                            onClick={() => onAskVicAboutGap(item.type, item)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pedir ações ao Vic</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
