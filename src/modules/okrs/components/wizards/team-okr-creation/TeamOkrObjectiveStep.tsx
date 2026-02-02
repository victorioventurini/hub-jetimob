/**
 * TeamOkrObjectiveStep - Step 3: Definindo o Objetivo
 * 
 * Cap. 4 do storytelling:
 * - Perguntas guiadas sobre impacto
 * - Validação manual com Coach de OKRs
 * - Seleção de OKR organizacional pai
 * - Feedback persiste ao trocar de aba
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizardAI, type ObjectiveValidationFeedback } from '@/modules/okrs/hooks';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import { ObjectiveInputWithValidation } from './ObjectiveInputWithValidation';
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
  objectiveValidationFeedback: ObjectiveValidationFeedback | null;
  objectiveValidatedAt: string | null;
  onObjectiveTitleChange: (value: string) => void;
  onObjectiveDescriptionChange: (value: string) => void;
  onOrgObjectiveSelect: (id: string | null) => void;
  onValidationFeedbackChange: (feedback: ObjectiveValidationFeedback | null, validatedAt: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
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
  objectiveValidationFeedback,
  objectiveValidatedAt,
  onObjectiveTitleChange,
  onObjectiveDescriptionChange,
  onOrgObjectiveSelect,
  onValidationFeedbackChange,
  onContinue,
  onBack,
}: TeamOkrObjectiveStepProps) {
  const { invokeVic } = useWizardAI();
  const [isValidating, setIsValidating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Parse AI response to feedback format
  const parseAiResponse = useCallback((responseText: string): ObjectiveValidationFeedback => {
    try {
      let cleanResponse = responseText.trim();
      const jsonBlockMatch = cleanResponse.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (jsonBlockMatch) {
        cleanResponse = jsonBlockMatch[1].trim();
      }
      const parsed = JSON.parse(cleanResponse);
      // Ensure alternatives is always an array with at least 3 items
      return {
        type: parsed.type || 'suggestion',
        message: parsed.message || responseText,
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives.slice(0, 3) : [],
      };
    } catch {
      return {
        type: 'suggestion',
        message: responseText,
        alternatives: [],
      };
    }
  }, []);

  // Build context string from user inputs for better suggestions
  const buildContextForAI = useCallback(() => {
    const selectedOrg = orgObjectives.find(o => o.id === selectedOrgObjectiveId);
    return `
    Time: ${teamName}
    Objetivo Organizacional Relacionado: ${selectedOrg?.title || 'Nenhum selecionado'}
    Descrição adicional: ${objectiveDescription || 'Nenhuma'}
    `;
  }, [teamName, orgObjectives, selectedOrgObjectiveId, objectiveDescription]);

  // Handle validation with AI - now always suggests 3 alternatives
  const handleValidate = useCallback(async () => {
    if (objectiveTitle.trim().length < 10) return;
    
    setIsValidating(true);
    
    try {
      const contextInfo = buildContextForAI();
      const response = await invokeVic(
        'validador-metodologico-okrs',
        'okr-review-quality',
        {
          type: 'objective-creation',
          title: objectiveTitle,
          additionalData: { teamName, context: contextInfo },
        },
        `Avalie este objetivo de time: "${objectiveTitle}".
        Contexto: ${contextInfo}
        
        IMPORTANTE: Sempre sugira EXATAMENTE 3 alternativas de objetivos que sejam:
        - Inspiracionais (descrevem o "porquê", não o "como")
        - Mensuráveis indiretamente por KRs
        - Alinhados ao contexto do time e objetivo organizacional
        
        Se estiver operacional demais, diga brevemente o problema.
        Se estiver amplo demais, sugira foco.
        Se estiver bom, confirme brevemente mas ainda assim sugira 3 alternativas para o usuário considerar.
        
        Responda APENAS em JSON válido: { "type": "warning" | "suggestion" | "success", "message": "...", "alternatives": ["alternativa 1", "alternativa 2", "alternativa 3"] }`
      );

      const feedback = parseAiResponse(response.response);
      onValidationFeedbackChange(feedback, new Date().toISOString());
    } catch (error) {
      console.error('Failed to validate objective:', error);
      onValidationFeedbackChange({
        type: 'success',
        message: 'Objetivo registrado. Continue com a definição.',
        alternatives: [],
      }, new Date().toISOString());
    } finally {
      setIsValidating(false);
    }
  }, [objectiveTitle, teamName, buildContextForAI, invokeVic, parseAiResponse, onValidationFeedbackChange]);

  // Handle requesting more suggestions
  const handleRequestMoreSuggestions = useCallback(async () => {
    setIsValidating(true);
    
    try {
      const contextInfo = buildContextForAI();
      const currentAlternatives = objectiveValidationFeedback?.alternatives || [];
      
      const response = await invokeVic(
        'validador-metodologico-okrs',
        'okr-review-quality',
        {
          type: 'objective-creation',
          title: objectiveTitle,
          additionalData: { 
            teamName, 
            context: contextInfo,
            previousSuggestions: currentAlternatives,
          },
        },
        `O usuário quer mais sugestões de objetivos para o time "${teamName}".
        Objetivo atual: "${objectiveTitle}"
        Contexto: ${contextInfo}
        
        Sugestões anteriores (NÃO repita): ${currentAlternatives.join(', ')}
        
        Sugira EXATAMENTE 3 NOVAS alternativas de objetivos que sejam:
        - Diferentes das anteriores
        - Inspiracionais (descrevem o "porquê", não o "como")
        - Mensuráveis indiretamente por KRs
        - Alinhados ao contexto do time e objetivo organizacional
        
        Responda APENAS em JSON válido: { "type": "suggestion", "message": "Aqui estão mais opções para você considerar:", "alternatives": ["nova 1", "nova 2", "nova 3"] }`
      );

      const newFeedback = parseAiResponse(response.response);
      // Merge with existing feedback, keeping the original message context
      onValidationFeedbackChange({
        type: 'suggestion',
        message: newFeedback.message || 'Mais opções para você considerar:',
        alternatives: newFeedback.alternatives,
      }, new Date().toISOString());
    } catch (error) {
      console.error('Failed to get more suggestions:', error);
    } finally {
      setIsValidating(false);
    }
  }, [objectiveTitle, teamName, objectiveValidationFeedback, buildContextForAI, invokeVic, parseAiResponse, onValidationFeedbackChange]);

  // Handle edit - clear validation
  const handleEdit = useCallback(() => {
    onValidationFeedbackChange(null, null);
  }, [onValidationFeedbackChange]);

  // Handle alternative selection
  const handleSelectAlternative = useCallback((alt: string) => {
    onObjectiveTitleChange(alt);
    // Clear validation so user needs to revalidate with new text
    onValidationFeedbackChange(null, null);
  }, [onObjectiveTitleChange, onValidationFeedbackChange]);

  // Validation - requires validated objective
  const canContinue = useMemo(() => {
    return (
      objectiveTitle.trim().length >= 10 && 
      selectedOrgObjectiveId && 
      objectiveValidatedAt
    );
  }, [objectiveTitle, selectedOrgObjectiveId, objectiveValidatedAt]);

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

          {/* Objective Title with Validation */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Título do Objetivo
            </Label>
            <ObjectiveInputWithValidation
              value={objectiveTitle}
              onChange={onObjectiveTitleChange}
              feedback={objectiveValidationFeedback}
              validatedAt={objectiveValidatedAt}
              isValidating={isValidating}
              onValidate={handleValidate}
              onEdit={handleEdit}
              onSelectAlternative={handleSelectAlternative}
              onRequestMoreSuggestions={handleRequestMoreSuggestions}
              minLength={10}
            />
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
