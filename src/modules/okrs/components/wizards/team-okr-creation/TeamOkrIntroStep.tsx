/**
 * TeamOkrIntroStep - Step 0: Alinhamento Inicial
 * 
 * Cap. 1 do storytelling:
 * - Mensagem motivacional do Vic
 * - Prepara mentalidade antes de criar
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles,
  ArrowRight,
  Target,
  Quote,
} from 'lucide-react';
import { useAiSection, VicTypewriterText, VicLoadingState } from '@/modules/vic';
// ============================================================
// TYPES
// ============================================================

export interface TeamOkrIntroStepProps {
  teamName: string;
  userName?: string;
  onContinue: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrIntroStep({
  teamName,
  userName,
  onContinue,
}: TeamOkrIntroStepProps) {
  const fallbackGreeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  const fallbackMessage = 'Antes de definir metas, vamos alinhar direção. OKRs não servem para fazer mais coisas — servem para fazer as coisas certas.';

  // Resiliência centralizada: timeout + fallback + paralelo + gating de IA.
  // Se IA estiver off / BU sem config / chamada timeout → fica nos fallbacks.
  const { values } = useAiSection({
    timeoutMs: 10_000,
    slots: {
      greeting: {
        agent: 'validador-metodologico-okrs',
        actionContext: 'okr-create-objective',
        context: { type: 'wizard-intro', additionalData: { userName, teamName } },
        userQuestion: 'Gere uma saudação breve e calorosa para um líder que vai criar OKRs.',
        fallback: fallbackGreeting,
      },
      message: {
        agent: 'cultura',
        actionContext: 'dashboard-culture',
        context: { type: 'wizard-intro', additionalData: { teamName } },
        userQuestion: 'Gere uma mensagem curta (2-3 frases) sobre o propósito de OKRs, enfatizando que servem para fazer as coisas certas, não mais coisas.',
        fallback: fallbackMessage,
      },
    },
  });

  const greeting = values.greeting;
  const message = values.message;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-6">
          <div className="p-4 bg-primary/10 rounded-2xl mb-6">
            <Target className="h-12 w-12 text-primary" />
          </div>

          {greeting ? (
            <>
              <h2 className="text-2xl font-bold mb-2">
                <VicTypewriterText text={greeting} speed={36} priority={0} />
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                Vamos definir os OKRs do <span className="font-medium text-foreground">{teamName}</span>
              </p>
            </>
          ) : (
            <VicLoadingState 
              text="Preparando sua jornada de OKRs..."
              size="sm"
            />
          )}
        </div>

        {/* Vic Message Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Quote className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                {message ? (
                  <>
                    <p className="text-base leading-relaxed">
                      <VicTypewriterText text={message} speed={24} priority={1} />
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Vic, seu assistente de OKRs
                    </p>
                  </>
                ) : (
                  <VicLoadingState 
                    text="Vic está matutando..."
                    size="sm"
                    variant="inline"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What to expect */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">O que vamos fazer:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">1.</span>
              <span>Revisar o contexto estratégico da organização</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">2.</span>
              <span>Aprender com o ciclo anterior</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">3.</span>
              <span>Definir objetivos com propósito claro</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">4.</span>
              <span>Criar resultados-chave mensuráveis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-medium">5.</span>
              <span>Preparar a comunicação para o time</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer - stays fixed at bottom */}
      <div className="border-t p-4 bg-muted/30 shrink-0">
        <Button 
          onClick={onContinue} 
          className="w-full gap-2"
          size="lg"
        >
          Começar pelo contexto
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
