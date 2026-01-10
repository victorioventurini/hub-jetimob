/**
 * VicInsightCard - Card de insight de IA para os wizards
 * 
 * Exibe insights, perguntas orientadoras, alertas e sugestões
 * gerados pelos agentes de IA do Vic.
 * 
 * Features:
 * - Colapsável
 * - Diferentes estilos por tipo/prioridade
 * - Botão de dismissal
 */

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Lightbulb, 
  AlertTriangle, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VicTypewriterText } from '@/modules/vic';
import type { VicInsight, VicInsightType, VicInsightPriority } from '@/modules/okrs/types/wizard';
import { VIC_AGENTS, VicAgentSlug } from '@/modules/vic/types';

// ============================================================
// TYPES
// ============================================================

export interface VicInsightCardProps {
  insight: VicInsight;
  onDismiss?: (insightId: string) => void;
  collapsed?: boolean;
  className?: string;
  showSource?: boolean;
}

// ============================================================
// ICON & STYLE MAPPING
// ============================================================

const TYPE_ICONS: Record<VicInsightType, typeof HelpCircle> = {
  question: HelpCircle,
  insight: Lightbulb,
  alert: AlertTriangle,
  suggestion: Sparkles,
};

const TYPE_LABELS: Record<VicInsightType, string> = {
  question: 'Pergunta para reflexão',
  insight: 'Insight da Vic',
  alert: 'Atenção',
  suggestion: 'Sugestão',
};

const PRIORITY_STYLES: Record<VicInsightPriority, string> = {
  high: 'border-destructive/50 bg-destructive/5 dark:bg-destructive/10',
  medium: 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20',
  low: 'border-primary/30 bg-primary/5 dark:bg-primary/10',
};

const PRIORITY_ICON_STYLES: Record<VicInsightPriority, string> = {
  high: 'text-destructive',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-primary',
};

// ============================================================
// COMPONENT
// ============================================================

export function VicInsightCard({
  insight,
  onDismiss,
  collapsed = false,
  className,
  showSource = true,
}: VicInsightCardProps) {
  const [isOpen, setIsOpen] = useState(!collapsed);
  
  const Icon = TYPE_ICONS[insight.type];
  const label = TYPE_LABELS[insight.type];
  const agentInfo = VIC_AGENTS[insight.source as VicAgentSlug];

  if (insight.dismissed) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={cn(
          "rounded-lg border p-3 transition-colors",
          PRIORITY_STYLES[insight.priority],
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left">
            <div className={cn(
              "p-1.5 rounded-md bg-background/50",
              PRIORITY_ICON_STYLES[insight.priority]
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{label}</span>
                {insight.priority === 'high' && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Importante
                  </Badge>
                )}
              </div>
              {!isOpen && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {insight.content.slice(0, 60)}...
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-relaxed">
              <VicTypewriterText 
                text={insight.content} 
                speed={18}
                cursorHeight="h-3"
                priority={0}
              />
            </p>
            
            {insight.context && (
              <p className="text-xs text-muted-foreground italic">
                {insight.context}
              </p>
            )}
            
            <div className="flex items-center justify-between pt-1">
              {showSource && agentInfo && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bot className="h-3 w-3" />
                  <span>{agentInfo.name}</span>
                </div>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(insight.id);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dispensar
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================================
// VIC INSIGHTS LIST
// ============================================================

export interface VicInsightsListProps {
  insights: VicInsight[];
  onDismiss?: (insightId: string) => void;
  maxVisible?: number;
  className?: string;
}

export function VicInsightsList({
  insights,
  onDismiss,
  maxVisible = 3,
  className,
}: VicInsightsListProps) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleInsights = insights.filter(i => !i.dismissed);
  const displayedInsights = showAll 
    ? visibleInsights 
    : visibleInsights.slice(0, maxVisible);
  const hiddenCount = visibleInsights.length - displayedInsights.length;

  if (visibleInsights.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {displayedInsights.map((insight, index) => (
        <VicInsightCard
          key={insight.id}
          insight={insight}
          onDismiss={onDismiss}
          collapsed={index > 0}
        />
      ))}
      
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAll(true)}
        >
          Ver mais {hiddenCount} insight{hiddenCount > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
