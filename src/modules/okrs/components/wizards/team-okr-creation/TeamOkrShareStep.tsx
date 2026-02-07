/**
 * TeamOkrShareStep - Step 8: Compartilhar com o Time
 * 
 * Cap. 8 e 9 do storytelling:
 * - Gera resumo para comunicação
 * - Mensagem cultural de encerramento
 * - Conteúdo gerado persiste entre navegações
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Copy, CheckCircle2, Loader2, MessageSquare, Target, Users, Quote } from 'lucide-react';
import { VicLoadingState, VicTypewriterText } from '@/modules/vic';
import { WizardLastStepFooter } from '../shared';
import { useWizardAI, type ShareStepContent } from '@/modules/okrs/hooks';
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
  shareStepContent: ShareStepContent | null;
  isSubmitting?: boolean;
  onShareStepContentChange: (content: ShareStepContent | null) => void;
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
  shareStepContent,
  isSubmitting = false,
  onShareStepContentChange,
  onSubmit,
  onBack,
}: TeamOkrShareStepProps) {
  const { invokeVic } = useWizardAI();
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasGeneratedRef = useRef(false);

  // Local state for editing
  const [localSummary, setLocalSummary] = useState(shareStepContent?.summary || '');

  // Sync local state with persisted content
  useEffect(() => {
    if (shareStepContent?.summary) {
      setLocalSummary(shareStepContent.summary);
    }
  }, [shareStepContent?.summary]);

  // Generate summary and messages - only if not already persisted
  useEffect(() => {
    if (shareStepContent || hasGeneratedRef.current) return;
    
    hasGeneratedRef.current = true;

    const generateContent = async () => {
      setIsGenerating(true);
      try {
        // Generate summary
        const summaryResponse = await invokeVic(
          'revisor-comunicacao',
          'comms-review',
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

        // Generate reflection questions
        const questionsResponse = await invokeVic(
          'validador-metodologico-okrs',
          'okr-review-quality',
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

        // Generate closing message
        const closingResponse = await invokeVic(
          'cultura',
          'dashboard-culture',
          { type: 'closing' },
          `Gere uma mensagem cultural curta (1-2 frases) sobre foco e priorização para encerrar a criação de OKRs.`
        );

        const content: ShareStepContent = {
          summary: summaryResponse.response,
          closingMessage: closingResponse.response,
          reflectionQuestions: questions,
        };

        onShareStepContentChange(content);
        setLocalSummary(summaryResponse.response);
      } catch {
        // Fallback content
        const fallbackContent: ShareStepContent = {
          summary: `O ${teamName} definiu um novo objetivo: "${objectiveTitle}". Este ciclo, vamos focar em ${draftKrs.length} resultados-chave que vão nos guiar para o sucesso.`,
          reflectionQuestions: [
            'O que cada um de nós pode fazer para contribuir com esses resultados?',
            'Quais obstáculos precisamos remover juntos?',
            'Como vamos medir nosso progresso semanalmente?',
          ],
          closingMessage: 'Foco não é dizer sim para poucas coisas. É dizer não para muitas coisas boas.',
        };
        onShareStepContentChange(fallbackContent);
        setLocalSummary(fallbackContent.summary);
      } finally {
        setIsGenerating(false);
      }
    };

    generateContent();
  }, [shareStepContent, teamName, objectiveTitle, draftKrs, initiatives, onShareStepContentChange]);

  // Update persisted content when local summary changes
  const handleSummaryChange = (value: string) => {
    setLocalSummary(value);
    if (shareStepContent) {
      onShareStepContentChange({
        ...shareStepContent,
        summary: value,
      });
    }
  };

  // Copy summary to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localSummary);
      setCopied(true);
      toast.success('Resumo copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const summary = localSummary || shareStepContent?.summary || '';
  const closingMessage = shareStepContent?.closingMessage || '';
  const reflectionQuestions = shareStepContent?.reflectionQuestions || [];

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
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <VicLoadingState 
                  text="Gerando resumo..." 
                  variant="inline" 
                  size="sm"
                  className="py-4"
                />
              ) : (
                <Textarea
                  value={summary}
                  onChange={(e) => handleSummaryChange(e.target.value)}
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
                      <VicTypewriterText text={q} speed={18} priority={i} />
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
                  <p className="text-sm italic">
                    <VicTypewriterText text={closingMessage} speed={24} priority={reflectionQuestions.length} />
                  </p>
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

      <WizardLastStepFooter
        onBack={onBack}
        backDisabled={isSubmitting}
        primaryLoading={isSubmitting}
        onPrimary={onSubmit}
        primaryDisabled={isGenerating || isSubmitting}
        rightContent={
          <Button
            onClick={onSubmit}
            disabled={isGenerating || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Criando OKRs..."
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Send className="h-4 w-4" />
            Compartilhar e iniciar o ciclo
          </Button>
        }
      />
    </div>
  );
}
