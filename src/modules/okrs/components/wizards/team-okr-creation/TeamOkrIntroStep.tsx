/**
 * TeamOkrIntroStep - Step 0: Alinhamento Inicial
 * 
 * Cap. 1 do storytelling:
 * - Mensagem motivacional do Vic
 * - Prepara mentalidade antes de criar
 */

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles,
  ArrowRight,
  Target,
  Quote,
} from 'lucide-react';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { useVicEnabled } from '@/modules/vic/hooks/useVicAgent';
import { VicTypewriterText, VicLoadingState } from '@/modules/vic';
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
  const { invokeVic } = useWizardAI();
  const { isReady, buId } = useOptionalBuClient();
  const { isEnabled: isIaEnabled, isLoading: isIaConfigLoading } = useVicEnabled();
  const [greeting, setGreeting] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fallback messages
  const fallbackGreeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  const fallbackMessage = 'Antes de definir metas, vamos alinhar direção. OKRs não servem para fazer mais coisas — servem para fazer as coisas certas.';

  // Generate greeting and message on mount
  // Use ref to prevent multiple invocations due to callback changes
  const hasFetched = useRef(false);
  
  useEffect(() => {
    // Wait for auth/client readiness
    if (!isReady) return;

    // If no BU selected yet (or user is pre-BU), do not call IA.
    if (!buId) {
      setGreeting(fallbackGreeting);
      setMessage(fallbackMessage);
      setIsLoading(false);
      return;
    }

    // Wait for IA config to load
    if (isIaConfigLoading) return;

    // If IA is not enabled, use fallback immediately
    if (!isIaEnabled) {
      setGreeting(fallbackGreeting);
      setMessage(fallbackMessage);
      setIsLoading(false);
      return;
    }

    // Prevent multiple invocations
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Get greeting using coach-okrs agent
        const greetingResponse = await invokeVic(
          'coach-okrs',
          'okr-create-objective',
          { type: 'wizard-intro', additionalData: { userName, teamName } },
          'Gere uma saudação breve e calorosa para um líder que vai criar OKRs.',
          { silent: true }
        );
        setGreeting(greetingResponse.response);

        // Get motivational message using cultura agent
        const messageResponse = await invokeVic(
          'cultura',
          'dashboard-culture',
          { type: 'wizard-intro', additionalData: { teamName } },
          'Gere uma mensagem curta (2-3 frases) sobre o propósito de OKRs, enfatizando que servem para fazer as coisas certas, não mais coisas.',
          { silent: true }
        );
        setMessage(messageResponse.response);
      } catch (error) {
        // Fallback messages - silently use fallback without propagating error
        console.warn('[TeamOkrIntroStep] IA call failed, using fallback:', error);
        setGreeting(fallbackGreeting);
        setMessage(fallbackMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, buId, isIaConfigLoading, isIaEnabled]);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-6">
          <div className="p-4 bg-primary/10 rounded-2xl mb-6">
            <Target className="h-12 w-12 text-primary" />
          </div>

          {isLoading ? (
            <VicLoadingState 
              text="Preparando sua jornada de OKRs..."
              size="sm"
            />
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">
                <VicTypewriterText text={greeting} speed={36} priority={0} />
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                Vamos definir os OKRs do <span className="font-medium text-foreground">{teamName}</span>
              </p>
            </>
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
                {isLoading ? (
                  <VicLoadingState 
                    text="Vic está pensando..."
                    size="sm"
                    variant="inline"
                  />
                ) : (
                  <>
                    <p className="text-base leading-relaxed">
                      <VicTypewriterText text={message} speed={24} priority={1} />
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Vic, sua assistente de OKRs
                    </p>
                  </>
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
      <div className="border-t p-4 bg-muted/30 flex-shrink-0">
        <Button 
          onClick={onContinue} 
          className="w-full gap-2"
          size="lg"
          disabled={isLoading}
        >
          Começar pelo contexto
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
