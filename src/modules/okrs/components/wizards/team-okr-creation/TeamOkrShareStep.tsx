/**
 * TeamOkrShareStep - Step 8: Compartilhar com o Time
 * 
 * Cap. 8 e 9 do storytelling:
 * - Gera resumo para comunicação
 * - Mensagem cultural de encerramento
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send,
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Target,
  Users,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { toast } from 'sonner';
import type { DraftTeamKr, DraftTeamInitiative } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrShareStepProps {
  teamName: string;
  objectiveTitle: string;
  draftKrs: DraftTeamKr[];
  initiatives: DraftTeamInitiative[];
  isSubmitting?: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrShareStep({
  teamName,
  objectiveTitle,
  draftKrs,
  initiatives,
  isSubmitting = false,
  onSubmit,
  onBack,
}: TeamOkrShareStepProps) {
  const { invokeVic } = useWizardAI();
  const [summary, setSummary] = useState<string>('');
  const [closingMessage, setClosingMessage] = useState<string>('');
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate summary and messages
  useEffect(() => {
    const generateContent = async () => {
      setIsGenerating(true);
      try {
        // Generate summary
        const summaryResponse = await invokeVic(
          'revisor-comunicacao',
          'okr_summary',
          {
            type: 'okr-summary',
            title: objectiveTitle,
            additionalData: {
              teamName,
              krs: draftKrs.map(kr => ({
                title: kr.title,
                type: kr.type,
                target: kr.target,
                unit: kr.unit,
              })),
              initiativesCount: initiatives.length,
            },
          },
          `Gere um resumo claro e inspirador para compartilhar com o time sobre estes OKRs.
          Inclua: contexto do porquê dessas escolhas, os KRs de forma simples, e uma chamada para ação.
          Máximo 150 palavras, em linguagem simples e direta.`
        );
        setSummary(summaryResponse.response);

        // Generate reflection questions
        const questionsResponse = await invokeVic(
          'coach-okrs',
          'reflection_questions',
          {
            type: 'reflection',
            title: objectiveTitle,
            additionalData: { krs: draftKrs.map(kr => kr.title) },
          },
          `Sugira 3 perguntas curtas para provocar reflexão no time sobre estes OKRs.
          Retorne apenas as 3 perguntas, uma por linha.`
        );
        const questions = questionsResponse.response
          .split('\n')
          .filter(q => q.trim())
          .slice(0, 3);
        setReflectionQuestions(questions);

        // Generate closing message
        const closingResponse = await invokeVic(
          'cultura',
          'closing_message',
          { type: 'closing' },
          `Gere uma mensagem cultural curta (1-2 frases) sobre foco e priorização para encerrar a criação de OKRs.`
        );
        setClosingMessage(closingResponse.response);
      } catch {
        // Fallback content
        setSummary(`O ${teamName} definiu um novo objetivo: "${objectiveTitle}". Este ciclo, vamos focar em ${draftKrs.length} resultados-chave que vão nos guiar para o sucesso.`);
        setReflectionQuestions([
          'O que cada um de nós pode fazer para contribuir com esses resultados?',
          'Quais obstáculos precisamos remover juntos?',
          'Como vamos medir nosso progresso semanalmente?',
        ]);
        setClosingMessage('Foco não é dizer sim para poucas coisas. É dizer não para muitas coisas boas.');
      } finally {
        setIsGenerating(false);
      }
    };

    generateContent();
  }, [invokeVic, teamName, objectiveTitle, draftKrs, initiatives]);

  // Copy summary to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Resumo copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold mb-1">Preparar Comunicação</h2>
            <p className="text-sm text-muted-foreground">
              Revise o resumo gerado e prepare-se para compartilhar com o time.
            </p>
          </div>

          {/* Summary Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Resumo para o Time
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando resumo...
                </div>
              ) : (
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
              )}
            </CardContent>
          </Card>

          {/* OKR Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                OKRs Criados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">{objectiveTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {teamName} • {draftKrs.length} KR{draftKrs.length > 1 ? 's' : ''}
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                {draftKrs.map((kr, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{kr.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {kr.type}
                    </Badge>
                  </div>
                ))}
              </div>

              {initiatives.length > 0 && (
                <>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    {initiatives.length} iniciativa{initiatives.length > 1 ? 's' : ''} planejada{initiatives.length > 1 ? 's' : ''}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reflection Questions */}
          {!isGenerating && reflectionQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Perguntas para o Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {reflectionQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-medium">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Closing Message */}
          {!isGenerating && closingMessage && (
            <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Quote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm italic">{closingMessage}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Guardião da Cultura
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Final Message */}
          <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
            <CardContent className="p-6 text-center">
              <p className="text-sm">
                Esses OKRs não são mais trabalho.
                <br />
                <strong>São uma aposta clara do que realmente importa neste ciclo.</strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 bg-muted/30 flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2" disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button 
          onClick={onSubmit} 
          className="flex-1 gap-2"
          disabled={isGenerating || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando OKRs...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Compartilhar e iniciar o ciclo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
