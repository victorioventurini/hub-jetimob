/**
 * TeamOkrObjectiveStep - Step 3: Definindo o Objetivo
 * 
 * Cap. 4 do storytelling:
 * - Perguntas guiadas sobre impacto
 * - Feedback em tempo real do Coach de OKRs
 * - Seleção de OKR organizacional pai
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { useDebounce } from '@/hooks/useDebounce';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { VicTypewriterText, VicLoadingState } from '@/modules/vic';
import type { OrgObjectiveContext } from './TeamOkrContextStep';
import { FEEDBACK_STYLES } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrObjectiveStepProps {
  teamName: string;
  orgObjectives: OrgObjectiveContext[];
  objectiveTitle: string;
  objectiveDescription: string;
  selectedOrgObjectiveId: string | null;
  onObjectiveTitleChange: (value: string) => void;
  onObjectiveDescriptionChange: (value: string) => void;
  onOrgObjectiveSelect: (id: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface AIFeedback {
  type: 'warning' | 'suggestion' | 'success';
  message: string;
  alternatives?: string[];
}

// ============================================================
// GUIDING QUESTIONS
// ============================================================

const GUIDING_QUESTIONS = [
  {
    id: 'success',
    question: 'Se esse ciclo fosse considerado um sucesso, o que teria mudado?',
    placeholder: 'Ex: Nossa taxa de conversão teria dobrado...',
  },
  {
    id: 'impact',
    question: 'Quem sentiria esse impacto primeiro?',
    placeholder: 'Ex: Nossos clientes do segmento enterprise...',
  },
  {
    id: 'inspire',
    question: 'Esse objetivo inspira ou só descreve trabalho?',
    placeholder: 'Reflita se o objetivo motiva o time...',
  },
];

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrObjectiveStep({
  teamName,
  orgObjectives,
  objectiveTitle,
  objectiveDescription,
  selectedOrgObjectiveId,
  onObjectiveTitleChange,
  onObjectiveDescriptionChange,
  onOrgObjectiveSelect,
  onContinue,
  onBack,
}: TeamOkrObjectiveStepProps) {
  const { invokeVic } = useWizardAI();
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Debounce objective title for AI analysis
  const debouncedTitle = useDebounce(objectiveTitle, 800);

  // Track last analyzed title to avoid duplicate calls
  const lastAnalyzedRef = useRef<string | null>(null);

  // Analyze objective with AI
  useEffect(() => {
    // Skip if title is too short or same as last analyzed
    if (!debouncedTitle || debouncedTitle.length < 10) {
      setAiFeedback(null);
      setIsAnalyzing(false);
      return;
    }
    
    // Skip if already analyzed this exact title
    if (lastAnalyzedRef.current === debouncedTitle) {
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setIsAnalyzing(false);
        setAiFeedback(null);
      }
    }, 20000); // 20s timeout
    
    const analyzeObjective = async () => {
      lastAnalyzedRef.current = debouncedTitle;
      setIsAnalyzing(true);
      
      try {
        const response = await invokeVic(
          'coach-okrs',
          'okr-review-quality',
          {
            type: 'objective-creation',
            title: debouncedTitle,
            additionalData: { teamName },
          },
          `Avalie este objetivo de time: "${debouncedTitle}". 
          Se estiver operacional demais, diga brevemente o problema e sugira reformulação.
          Se estiver amplo demais, sugira foco.
          Se estiver bom, confirme brevemente.
          Responda em JSON: { "type": "warning" | "suggestion" | "success", "message": "...", "alternatives": ["..."] }`
        );

        if (isCancelled) return;

        try {
          const parsed = JSON.parse(response.response);
          setAiFeedback(parsed);
        } catch {
          // If not JSON, treat as success with message
          setAiFeedback({
            type: 'suggestion',
            message: response.response,
          });
        }
      } catch {
        if (!isCancelled) {
          setAiFeedback(null);
        }
      } finally {
        if (!isCancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    analyzeObjective();
    
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [debouncedTitle, teamName]); // Remove invokeVic - causes new ref each render

  // Handle alternative selection
  const handleSelectAlternative = useCallback((alt: string) => {
    onObjectiveTitleChange(alt);
  }, [onObjectiveTitleChange]);

  // Validation
  const canContinue = useMemo(() => {
    return objectiveTitle.trim().length >= 10 && selectedOrgObjectiveId;
  }, [objectiveTitle, selectedOrgObjectiveId]);

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Definindo o Objetivo</h2>
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'objective',
                  teamName,
                  objectiveTitle,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Um bom objetivo descreve o <strong>porquê</strong>, não o como.
            </p>
          </div>

          {/* Guiding Questions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              Perguntas para reflexão
            </div>
            
            {GUIDING_QUESTIONS.map((q, index) => (
              <Card 
                key={q.id}
                className={cn(
                  "transition-all",
                  index === currentQuestionIndex && "ring-2 ring-primary/50",
                  index < currentQuestionIndex && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <Label className="text-sm font-medium">{q.question}</Label>
                  {index === currentQuestionIndex && (
                    <Textarea
                      placeholder={q.placeholder}
                      className="mt-2 resize-none"
                      rows={2}
                      onFocus={() => setCurrentQuestionIndex(index)}
                      onBlur={() => {
                        if (index < GUIDING_QUESTIONS.length - 1) {
                          setCurrentQuestionIndex(index + 1);
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Objective Title */}
          <div className="space-y-3">
            <Label htmlFor="objective-title" className="text-sm font-medium">
              Título do Objetivo
            </Label>
            <div className="relative">
              <Input
                id="objective-title"
                placeholder="Escreva um objetivo inspirador e claro..."
                value={objectiveTitle}
                onChange={(e) => onObjectiveTitleChange(e.target.value)}
                className={cn(
                  "pr-10",
                  aiFeedback?.type === 'warning' && "border-orange-500",
                  aiFeedback?.type === 'success' && "border-green-500"
                )}
              />
              {isAnalyzing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* AI Feedback */}
            {aiFeedback && !isAnalyzing && (
              <div className={cn(
                "p-4 rounded-xl border text-sm space-y-3",
                aiFeedback.type === 'warning' && FEEDBACK_STYLES.warning.container,
                aiFeedback.type === 'suggestion' && FEEDBACK_STYLES.suggestion.container,
                aiFeedback.type === 'success' && FEEDBACK_STYLES.success.container
              )}>
                {/* Header with icon */}
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    aiFeedback.type === 'warning' && "bg-status-yellow/20",
                    aiFeedback.type === 'suggestion' && "bg-info/20",
                    aiFeedback.type === 'success' && "bg-status-green/20"
                  )}>
                    {aiFeedback.type === 'warning' && <AlertCircle className={cn("h-4 w-4", FEEDBACK_STYLES.warning.icon)} />}
                    {aiFeedback.type === 'suggestion' && <Sparkles className={cn("h-4 w-4", FEEDBACK_STYLES.suggestion.icon)} />}
                    {aiFeedback.type === 'success' && <CheckCircle2 className={cn("h-4 w-4", FEEDBACK_STYLES.success.icon)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm leading-relaxed",
                      aiFeedback.type === 'warning' && FEEDBACK_STYLES.warning.text,
                      aiFeedback.type === 'suggestion' && FEEDBACK_STYLES.suggestion.text,
                      aiFeedback.type === 'success' && FEEDBACK_STYLES.success.text
                    )}>
                      <VicTypewriterText text={aiFeedback.message} speed={18} priority={0} />
                    </p>
                  </div>
                </div>

                {/* Alternatives */}
                {aiFeedback.alternatives && aiFeedback.alternatives.length > 0 && (
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lightbulb className="h-3 w-3" />
                      Sugestões alternativas
                    </p>
                    <div className="grid gap-2">
                      {aiFeedback.alternatives.map((alt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectAlternative(alt)}
                          className={cn(
                            "text-left w-full px-3 py-2.5 rounded-lg text-xs",
                            "bg-background/80 hover:bg-background",
                            "border border-border/50 hover:border-primary/50",
                            "transition-all duration-200",
                            "hover:shadow-sm hover:translate-x-0.5",
                            "group flex items-center gap-2"
                          )}
                        >
                          <span className="flex-1">{alt}</span>
                          <span className="text-muted-foreground group-hover:text-primary transition-colors text-[10px]">
                            usar →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description (optional) */}
          <div className="space-y-3">
            <Label htmlFor="objective-description" className="text-sm font-medium">
              Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="objective-description"
              placeholder="Adicione contexto sobre por que esse objetivo é importante..."
              value={objectiveDescription}
              onChange={(e) => onObjectiveDescriptionChange(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Link to Org Objective */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Objetivo Organizacional Relacionado
            </Label>
            <div className="space-y-2">
              {orgObjectives.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => onOrgObjectiveSelect(obj.id)}
                  className={cn(
                    "w-full p-3 border rounded-lg text-left transition-all",
                    selectedOrgObjectiveId === obj.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{obj.title}</span>
                    {selectedOrgObjectiveId === obj.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {obj.progress}% concluído • {obj.keyResultsCount} KRs
                  </p>
                </button>
              ))}
              {orgObjectives.length === 0 && (
                <p className="text-sm text-muted-foreground p-3 border rounded-lg border-dashed">
                  Nenhum objetivo organizacional disponível para vincular.
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Escolher KRs"
        onPrimary={onContinue}
        primaryDisabled={!canContinue}
      />
    </div>
  );
}
