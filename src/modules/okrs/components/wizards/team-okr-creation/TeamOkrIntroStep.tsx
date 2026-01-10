/**
 * TeamOkrIntroStep - Step 0: Alinhamento Inicial
 * 
 * Cap. 1 do storytelling:
 * - Mensagem motivacional do Vic
 * - Prepara mentalidade antes de criar
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles,
  ArrowRight,
  Target,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';

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
  const { invokeVic, isVicLoading } = useWizardAI();
  const [greeting, setGreeting] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Generate greeting and message on mount
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        // Get greeting
        const greetingResponse = await invokeVic(
          'vic-greeting',
          'greeting',
          { type: 'wizard-intro', additionalData: { userName, teamName } },
          'Gere uma saudação breve e calorosa para um líder que vai criar OKRs.'
        );
        setGreeting(greetingResponse.response);

        // Get motivational message
        const messageResponse = await invokeVic(
          'vic-persona',
          'team_okr_creation_intro',
          { type: 'wizard-intro', additionalData: { teamName } },
          'Gere uma mensagem curta (2-3 frases) sobre o propósito de OKRs, enfatizando que servem para fazer as coisas certas, não mais coisas.'
        );
        setMessage(messageResponse.response);
      } catch (error) {
        // Fallback messages
        setGreeting(userName ? `Olá, ${userName}!` : 'Olá!');
        setMessage('Antes de definir metas, vamos alinhar direção. OKRs não servem para fazer mais coisas — servem para fazer as coisas certas.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [invokeVic, userName, teamName]);

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center py-8">
          <div className="p-4 bg-primary/10 rounded-2xl mb-6">
            <Target className="h-12 w-12 text-primary" />
          </div>

          {isLoading ? (
            <div className="space-y-4 w-full max-w-md">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">{greeting}</h2>
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
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <p className="text-base leading-relaxed">{message}</p>
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

      {/* Footer */}
      <div className="border-t p-4 bg-muted/30">
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
