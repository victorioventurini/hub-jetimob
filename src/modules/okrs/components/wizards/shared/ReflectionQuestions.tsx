/**
 * ReflectionQuestions - Perguntas orientadoras contextuais
 * 
 * Exibe perguntas para reflexão geradas pelo Vic ou pré-definidas,
 * aparecendo como microcopy para guiar o usuário no check-in.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface ReflectionQuestion {
  id: string;
  question: string;
  hint?: string;
  source?: 'ai' | 'system';
}

export interface ReflectionQuestionsProps {
  questions: ReflectionQuestion[];
  onAnswer?: (questionId: string, answer: string) => void;
  allowAnswers?: boolean;
  className?: string;
  collapsed?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function ReflectionQuestions({
  questions,
  onAnswer,
  allowAnswers = false,
  className,
  collapsed = false,
}: ReflectionQuestionsProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) return null;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    onAnswer?.(questionId, answer);
  };

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4", className)}>
      <button 
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-1.5 rounded-md bg-primary/10">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">Perguntas para reflexão</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({questions.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground w-5 flex-shrink-0">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{q.question}</p>
                  {q.hint && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.hint}
                    </p>
                  )}
                  {q.source === 'ai' && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                      <Sparkles className="h-3 w-3" />
                      Sugerido pelo Vic
                    </span>
                  )}
                </div>
              </div>

              {allowAnswers && (
                <Textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Sua resposta (opcional)..."
                  className="min-h-[60px] text-sm resize-none ml-7"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MICROCOPY VERSION (inline questions)
// ============================================================

export interface MicrocopyQuestionProps {
  question: string;
  variant?: 'default' | 'subtle' | 'highlight';
  className?: string;
}

export function MicrocopyQuestion({
  question,
  variant = 'default',
  className,
}: MicrocopyQuestionProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-2 text-sm",
        variant === 'default' && "text-muted-foreground",
        variant === 'subtle' && "text-muted-foreground/70 italic",
        variant === 'highlight' && "text-primary font-medium",
        className
      )}
    >
      <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{question}</span>
    </div>
  );
}

// ============================================================
// PRE-BUILT QUESTION SETS
// ============================================================

export const COLLABORATOR_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'col-1',
    question: 'O que fez esse KR avançar esta semana?',
    hint: 'Pense nas ações específicas que contribuíram.',
    source: 'system',
  },
  {
    id: 'col-2',
    question: 'O avanço foi consistente ou pontual?',
    hint: 'Avalie se o progresso é sustentável.',
    source: 'system',
  },
  {
    id: 'col-3',
    question: 'Existe algum risco nas próximas semanas?',
    hint: 'Antecipe possíveis obstáculos.',
    source: 'system',
  },
];

export const COLLABORATOR_FINAL_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'col-final-1',
    question: 'O que mais impactou seus resultados esta semana?',
    source: 'system',
  },
  {
    id: 'col-final-2',
    question: 'Você precisa de ajuda em algo específico?',
    source: 'system',
  },
];

export const LEADER_DISCUSSION_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'leader-1',
    question: 'O que aprendemos com esse resultado?',
    source: 'system',
  },
  {
    id: 'leader-2',
    question: 'O problema é esforço, foco ou contexto?',
    source: 'system',
  },
];

export const INITIATIVE_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'init-1',
    question: 'Essa iniciativa ainda é a melhor alavanca?',
    source: 'system',
  },
  {
    id: 'init-2',
    question: 'Precisamos ajustar escopo ou prioridade?',
    source: 'system',
  },
];

export const STRATEGIC_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'strat-1',
    question: 'Este OKR ainda faz sentido?',
    source: 'system',
  },
  {
    id: 'strat-2',
    question: 'O que precisamos parar de fazer?',
    source: 'system',
  },
  {
    id: 'strat-3',
    question: 'Onde dobrar a aposta?',
    source: 'system',
  },
];
