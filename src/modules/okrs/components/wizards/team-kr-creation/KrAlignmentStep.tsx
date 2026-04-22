/**
 * KrAlignmentStep - Step 2: Alinhamento Estratégico
 *
 * Conectar os KRs com a estratégia maior da empresa.
 *
 * Resiliência de IA: usa `useAiSection` (timeout + fallback + gating + anti-double-fetch).
 * Ver `.lovable/memory/standards/ai/use-ai-section-hook.md`.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, TrendingUp, History } from 'lucide-react';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { VicInsightCard } from '../shared/VicInsightCard';
import { useAiSection } from '@/modules/vic';
import type { VicInsight } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface StrategicPriority {
  id: string;
  title: string;
  description?: string;
}

export interface StrategicKpi {
  id: string;
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

export interface KrAlignmentStepProps {
  objectiveTitle: string;
  strategicPriorities?: StrategicPriority[];
  strategicKpis?: StrategicKpi[];
  strategicReflection: string;
  onReflectionChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

const ALIGNMENT_FALLBACK =
  'Conecte cada KR a uma prioridade estratégica visível: o KR deve mover um número que a organização já está observando. Quando essa ligação não existe, a entrega vira esforço sem evidência de impacto.';

export function KrAlignmentStep({
  objectiveTitle,
  strategicPriorities = [],
  strategicKpis = [],
  strategicReflection,
  onReflectionChange,
  onContinue,
  onBack,
}: KrAlignmentStepProps) {
  const { values } = useAiSection({
    timeoutMs: 12_000,
    slots: {
      alignmentInsight: {
        agent: 'alinhamento-estrategico',
        actionContext: 'okr-check-alignment',
        context: {
          type: 'strategic-alignment',
          additionalData: {
            objectiveTitle,
            priorities: strategicPriorities.map((p) => p.title),
          },
        },
        userQuestion: `Analise este objetivo de time e sugira como os KRs podem se conectar às prioridades estratégicas.
          Objetivo: "${objectiveTitle}"
          Prioridades organizacionais: ${strategicPriorities.map((p) => p.title).join(', ') || 'Não informadas'}
          Responda em 2-3 frases curtas e diretas.`,
        fallback: ALIGNMENT_FALLBACK,
      },
    },
  });

  const aiInsight = useMemo<VicInsight>(
    () => ({
      id: 'alignment-insight',
      type: 'insight',
      content: values.alignmentInsight,
      priority: 'medium',
      source: 'alinhamento-estrategico',
    }),
    [values.alignmentInsight],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Alinhamento Estratégico</h2>
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'alignment',
                  objectiveTitle,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Como os KRs desse objetivo se conectam à estratégia maior?
            </p>
          </div>

          {/* AI Insight (sempre renderiza — fallback imediato, IA sobrescreve quando responde) */}
          <VicInsightCard insight={aiInsight} showSource />

          {/* Strategic Priorities */}
          {strategicPriorities.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Prioridades Organizacionais do Ciclo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {strategicPriorities.map((priority) => (
                    <div key={priority.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">{priority.title}</p>
                      {priority.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {priority.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategic KPIs */}
          {strategicKpis.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  KPIs Estratégicos da BU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {strategicKpis.map((kpi) => (
                    <div key={kpi.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">{kpi.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium">{kpi.value}</p>
                        <Badge
                          variant="outline"
                          className={
                            kpi.trend === 'up'
                              ? 'text-success'
                              : kpi.trend === 'down'
                                ? 'text-danger'
                                : ''
                          }
                        >
                          {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state if no priorities/KPIs */}
          {strategicPriorities.length === 0 && strategicKpis.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma prioridade ou KPI estratégico configurado para este ciclo.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Strategic Reflection */}
          <div className="space-y-2">
            <Label htmlFor="reflection">
              Reflexão estratégica
              <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
            </Label>
            <Textarea
              id="reflection"
              placeholder="O que esse objetivo precisa provar para realmente ajudar a empresa?"
              value={strategicReflection}
              onChange={(e) => onReflectionChange(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Essa reflexão ajuda a manter o foco nos resultados que realmente importam.
            </p>
          </div>

          {/* Ask to Vic prompts */}
          <div className="p-4 border rounded-lg border-dashed">
            <p className="text-sm font-medium mb-2">Pergunte ao Vic:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• "Como um KR se conecta à estratégia da empresa?"</li>
              <li>• "Quando um KR está desalinhado, o que costuma dar errado?"</li>
            </ul>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Escolher os tipos de KR"
        onPrimary={onContinue}
      />
    </div>
  );
}
