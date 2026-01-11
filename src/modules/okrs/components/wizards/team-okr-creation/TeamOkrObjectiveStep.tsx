/**
 * TeamOkrObjectiveStep - Step 3: Definindo o Objetivo
 * 
 * Cap. 4 do storytelling:
 * - Perguntas guiadas sobre impacto
 * - Feedback em tempo real do Coach de OKRs
 * - Seleção de OKR organizacional pai
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Analyze objective with AI
  useEffect(() => {
    const analyzeObjective = async () => {
      if (!debouncedTitle || debouncedTitle.length < 10) {
        setAiFeedback(null);
        return;
      }

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
        setAiFeedback(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeObjective();
  }, [debouncedTitle, invokeVic, teamName]);

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
                "p-3 rounded-lg text-sm flex items-start gap-2",
                aiFeedback.type === 'warning' && "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400",
                aiFeedback.type === 'suggestion' && "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400",
                aiFeedback.type === 'success' && "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
              )}>
                {aiFeedback.type === 'warning' && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                {aiFeedback.type === 'suggestion' && <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />}
                {aiFeedback.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                <div className="space-y-2">
                  <p><VicTypewriterText text={aiFeedback.message} speed={18} priority={0} /></p>
                  {aiFeedback.alternatives && aiFeedback.alternatives.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Sugestões:</p>
                      {aiFeedback.alternatives.map((alt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSelectAlternative(alt)}
                          className="block text-left w-full p-2 rounded bg-background/50 hover:bg-background text-xs"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
