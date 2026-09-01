/**
 * WizardStepBoundary — limite de erro local por step de wizard.
 *
 * Se um step falhar em runtime (ex.: componente resolvido como `undefined`,
 * React #130), o usuário vê uma mensagem contida no step, com opção de voltar,
 * em vez de perder o ritual inteiro. O rascunho permanece salvo.
 *
 * A falha é registrada em `app_error_logs` com `wizard` + `step` no metadata.
 */
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';

export interface WizardStepBoundaryProps {
  /** Identificador do wizard (ex.: 'collaborator-checkin'). */
  wizard: string;
  /** Step atual — também usado como `key` para resetar o boundary ao navegar. */
  step: string;
  onBack?: () => void;
  children: ReactNode;
}

export function WizardStepBoundary({ wizard, step, onBack, children }: WizardStepBoundaryProps) {
  return (
    <ErrorBoundary
      key={`${wizard}:${step}`}
      context={{ wizard, step }}
      fallback={
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="h-6 w-6 mx-auto text-destructive" aria-hidden />
          <div>
            <p className="font-medium">Não foi possível carregar esta etapa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu rascunho está salvo. Volte para a etapa anterior e siga o ritual — o time de
              produto já foi notificado automaticamente.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Voltar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
