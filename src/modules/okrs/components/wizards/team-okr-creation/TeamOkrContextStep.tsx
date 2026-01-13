/**
 * TeamOkrContextStep - Step 1: Contexto Organizacional
 * 
 * Cap. 2 do storytelling:
 * - Exibe OKRs organizacionais
 * - Mostra KPIs estratégicos
 * - Pergunta sobre impacto potencial
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, TrendingUp, Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VicGeneratingCard } from '@/modules/vic';
import { WizardStepFooter } from '../shared';
import { VicInsightCard } from '../shared/VicInsightCard';
import { WizardTooltipInline, WizardTipCard } from '../shared/WizardTooltips';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import type { VicInsight } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface OrgObjectiveContext {
  id: string;
  title: string;
  progress: number;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  keyResultsCount: number;
}

export interface StrategicKpi {
  id: string;
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
}

export interface TeamOkrContextStepProps {
  teamName: string;
  orgObjectives: OrgObjectiveContext[];
  strategicKpis: StrategicKpi[];
  isLoading?: boolean;
  impactReflection: string;
  onImpactReflectionChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_COLORS = {
  green: 'bg-status-green-muted text-status-green-muted-foreground',
  yellow: 'bg-status-yellow-muted text-status-yellow-muted-foreground',
  red: 'bg-status-red-muted text-status-red-muted-foreground',
  not_started: 'bg-muted text-muted-foreground',
};

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrContextStep({
  teamName,
  orgObjectives,
  strategicKpis,
  isLoading = false,
  impactReflection,
  onImpactReflectionChange,
  onContinue,
  onBack,
}: TeamOkrContextStepProps) {
  const { invokeVic } = useWizardAI();
  const [aiInsight, setAiInsight] = useState<VicInsight | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  
  // Guard to prevent multiple invocations
  const hasInvokedRef = useRef(false);
  const contextIdRef = useRef<string | null>(null);

  // Generate strategic insight - only once per context
  useEffect(() => {
    if (orgObjectives.length === 0) return;
    
    // Create a stable ID for the context
    const contextId = orgObjectives.map(o => o.id).sort().join('-');
    
    // Skip if already invoked for this exact context
    if (hasInvokedRef.current && contextIdRef.current === contextId) {
      return;
    }
    
    const generateInsight = async () => {
      hasInvokedRef.current = true;
      contextIdRef.current = contextId;
      setIsGeneratingInsight(true);
      
      try {
        const response = await invokeVic(
          'alinhamento-estrategico',
          'okr-check-alignment',
          {
            type: 'org-context',
            additionalData: {
              objectives: orgObjectives.map(o => o.title),
              kpis: strategicKpis.map(k => k.name),
            },
          },
          'Resuma em 2-3 frases as prioridades estratégicas deste ciclo e como o time pode impactá-las.',
          { silent: true }
        );

        setAiInsight({
          id: 'context-insight',
          type: 'insight',
          content: response.response,
          priority: 'medium',
          source: 'alinhamento-estrategico',
        });
      } catch {
        // Silently fail - insight is optional
      } finally {
        setIsGeneratingInsight(false);
      }
    };

    generateInsight();
  }, [orgObjectives, strategicKpis]); // Remove invokeVic from deps - it changes every render

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Contexto Estratégico</h2>
              <WizardTooltipInline tooltipKey="context-intro" />
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'overview',
                  additionalData: {
                    orgObjectivesCount: orgObjectives.length,
                    kpisCount: strategicKpis.length,
                  },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Antes de criar OKRs, veja o que a organização está priorizando.
            </p>
          </div>

          {/* Org Objectives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Objetivos Organizacionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orgObjectives.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum objetivo organizacional definido para este ciclo.
                </p>
              ) : (
                orgObjectives.map(obj => (
                  <div key={obj.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{obj.title}</p>
                      <Badge className={cn("shrink-0 text-xs", STATUS_COLORS[obj.status])}>
                        {obj.progress}%
                      </Badge>
                    </div>
                    <Progress value={obj.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {obj.keyResultsCount} resultado{obj.keyResultsCount !== 1 ? 's' : ''}-chave
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Strategic KPIs */}
          {strategicKpis.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  KPIs Estratégicos da BU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {strategicKpis.map(kpi => (
                    <div key={kpi.id} className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">{kpi.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold">
                          {kpi.currentValue}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {kpi.targetValue} {kpi.unit}
                        </span>
                      </div>
                      <div className={cn(
                        "text-xs mt-1",
                        kpi.trend === 'up' && "text-green-600",
                        kpi.trend === 'down' && "text-red-600",
                        kpi.trend === 'flat' && "text-muted-foreground"
                      )}>
                        {kpi.trend === 'up' && '↑ Subindo'}
                        {kpi.trend === 'down' && '↓ Descendo'}
                        {kpi.trend === 'flat' && '→ Estável'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insight */}
          {isGeneratingInsight ? (
            <VicGeneratingCard text="Analisando contexto estratégico..." />
          ) : aiInsight ? (
            <VicInsightCard insight={aiInsight} showSource />
          ) : null}

          {/* Impact Reflection */}
          <div className="space-y-3">
            <Label htmlFor="impact-reflection" className="text-sm font-medium">
              Onde você acredita que o {teamName} pode gerar mais impacto neste ciclo?
            </Label>
            <Textarea
              id="impact-reflection"
              placeholder="Reflita sobre as prioridades estratégicas e escreva sua percepção..."
              value={impactReflection}
              onChange={(e) => onImpactReflectionChange(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Esta reflexão é opcional, mas ajuda a alinhar seu pensamento.
            </p>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Continuar"
        onPrimary={onContinue}
      />
    </div>
  );
}
