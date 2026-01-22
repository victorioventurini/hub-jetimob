/**
 * TeamOkrDependenciesStep - Step 6: Dependências e Riscos
 * 
 * Cap. 6 do storytelling:
 * - Analisa dependências automaticamente
 * - Mostra riscos potenciais
 * - Oferece opções de ação via Facilitador
 * - AI insight persiste entre navegações
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Link2, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VicLoadingState } from '@/modules/vic';
import { VicInsightCard } from '../shared/VicInsightCard';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import type { WizardAiInsight, DetectedDependencyDraft } from '@/modules/okrs/hooks/useWizardDraft';
import type { DraftTeamKr, DraftTeamDependency } from '@/modules/okrs/types/wizard';
import { RAG_STATUS_COLORS } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrDependenciesStepProps {
  draftKrs: DraftTeamKr[];
  dependencies: DraftTeamDependency[];
  detectedDependencies: DetectedDependencyDraft[];
  aiInsight: WizardAiInsight | null;
  onDependenciesChange: (deps: DraftTeamDependency[]) => void;
  onDetectedDependenciesChange: (deps: DetectedDependencyDraft[]) => void;
  onAiInsightChange: (insight: WizardAiInsight | null) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// ============================================================
// DEPENDENCY ACTIONS
// ============================================================

const DEPENDENCY_ACTIONS = [
  { value: 'adjust_target', label: 'Ajustar a meta' },
  { value: 'create_shared', label: 'Criar KR conjunto' },
  { value: 'register_risk', label: 'Registrar como risco' },
  { value: 'ignore', label: 'Ignorar' },
];

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrDependenciesStep({
  draftKrs,
  dependencies,
  detectedDependencies,
  aiInsight,
  onDependenciesChange,
  onDetectedDependenciesChange,
  onAiInsightChange,
  onContinue,
  onBack,
  onSkip,
}: TeamOkrDependenciesStepProps) {
  const { invokeVic } = useWizardAI();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({});
  const hasAnalyzedRef = useRef(false);

  // Analyze dependencies on mount - only if not already analyzed
  useEffect(() => {
    // Skip if already have detected dependencies or no KRs
    if (detectedDependencies.length > 0 || draftKrs.length === 0 || hasAnalyzedRef.current) {
      return;
    }

    hasAnalyzedRef.current = true;
    
    const analyzeDependencies = async () => {
      setIsAnalyzing(true);
      try {
        // Build context for analysis
        const krContext = draftKrs.map((kr, i) => ({
          index: i,
          title: kr.title,
          type: kr.type,
          target: kr.target,
          unit: kr.unit,
        }));

        const response = await invokeVic(
          'alinhamento-estrategico',
          'okr-check-alignment',
          {
            type: 'dependency-analysis',
            additionalData: { krs: krContext },
          },
          `Analise estes KRs e identifique potenciais dependências com outros times ou riscos.
          Retorne JSON: { "dependencies": [{ "krIndex": 0, "description": "...", "dependsOnTeamName": "...", "severity": "low|medium|high" }], "insight": "..." }`
        );

        try {
          const parsed = JSON.parse(response.response);
          const deps: DetectedDependencyDraft[] = (parsed.dependencies || []).map((d: any) => ({
            ...d,
            krTitle: draftKrs[d.krIndex]?.title || '',
          }));
          onDetectedDependenciesChange(deps);
          
          if (parsed.insight) {
            onAiInsightChange({
              id: 'dep-insight',
              type: 'insight',
              content: parsed.insight,
              priority: deps.some(d => d.severity === 'high') ? 'high' : 'medium',
              source: 'alinhamento-estrategico',
            });
          }
        } catch {
          // If not JSON, no dependencies detected
          onDetectedDependenciesChange([]);
        }
      } catch {
        // Silently fail - no dependencies detected
        onDetectedDependenciesChange([]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeDependencies();
  }, [draftKrs, detectedDependencies.length, onDetectedDependenciesChange, onAiInsightChange]);

  // Handle action selection
  const handleActionSelect = (depIndex: number, action: string) => {
    setSelectedActions(prev => ({
      ...prev,
      [depIndex]: action,
    }));

    // If registering as risk, add to dependencies
    if (action === 'register_risk') {
      const dep = detectedDependencies[depIndex];
      const newDep: DraftTeamDependency = {
        krIndex: dep.krIndex,
        description: dep.description,
        resolution: 'register_risk',
      };
      
      // Check if already exists
      const exists = dependencies.some(d => 
        d.krIndex === newDep.krIndex && d.description === newDep.description
      );
      
      if (!exists) {
        onDependenciesChange([...dependencies, newDep]);
      }
    }
  };

  const noDependencies = !isAnalyzing && detectedDependencies.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Dependências e Riscos</h2>
              <WizardTooltipInline tooltipKey="dependencies-intro" />
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'dependencies',
                  additionalData: { krsCount: draftKrs.length },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Analisando seus KRs para identificar dependências com outros times.
            </p>
          </div>

          {/* Loading State */}
          {isAnalyzing && (
            <div className="p-8 border rounded-lg border-dashed flex flex-col items-center justify-center">
              <VicLoadingState 
                text="Analisando dependências potenciais..." 
                size="lg"
              />
            </div>
          )}

          {/* No Dependencies */}
          {noDependencies && (
            <Card className="border-success/30 bg-success-muted">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-medium mb-2">Nenhuma dependência detectada</h3>
                <p className="text-sm text-muted-foreground">
                  Seus KRs parecem ser independentes. Ótimo para o foco do time!
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Insight */}
          {aiInsight && <VicInsightCard insight={aiInsight} showSource />}

          {/* Detected Dependencies */}
          {detectedDependencies.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Dependências Detectadas
              </h3>

              {detectedDependencies.map((dep, index) => (
                <Card 
                  key={index}
                  className={cn(
                    "transition-all",
                    dep.severity === 'high' && "border-red-200 dark:border-red-800/50",
                    dep.severity === 'medium' && "border-orange-200 dark:border-orange-800/50",
                    selectedActions[index] && "opacity-70"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium">
                          {dep.krTitle}
                        </CardTitle>
                        {dep.dependsOnTeamName && (
                          <Badge variant="outline" className="text-xs">
                            <Link2 className="h-3 w-3 mr-1" />
                            Depende de: {dep.dependsOnTeamName}
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        className={cn(
                          "text-xs",
                          dep.severity === 'high' && RAG_STATUS_COLORS.red.badge,
                          dep.severity === 'medium' && RAG_STATUS_COLORS.yellow.badge,
                          dep.severity === 'low' && "bg-status-yellow-muted/70 text-status-yellow-muted-foreground"
                        )}
                      >
                        {dep.severity === 'high' ? 'Alto risco' : 
                         dep.severity === 'medium' ? 'Médio risco' : 'Baixo risco'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {dep.description}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={selectedActions[index] || ''}
                        onValueChange={(value) => handleActionSelect(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="O que você quer fazer?" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPENDENCY_ACTIONS.map(action => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedActions[index] && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {selectedActions[index] === 'ignore' 
                            ? 'Dependência ignorada'
                            : 'Ação registrada'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Registered Dependencies Summary */}
          {dependencies.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Riscos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dependencies.map((dep, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <span>{dep.description}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Continuar"
        onPrimary={onContinue}
        primaryDisabled={isAnalyzing}
        showSkip={!noDependencies}
        skipLabel="Pular"
        onSkip={onSkip}
      />
    </div>
  );
}
