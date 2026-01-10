/**
 * DiscardChangesDialog - Diálogo centralizado para confirmação de descarte de alterações
 * 
 * Padrão visual e comportamental único para toda a aplicação quando
 * o usuário tenta sair de uma página com dados não salvos.
 * 
 * @example
 * <DiscardChangesDialog
 *   open={showExitDialog}
 *   onOpenChange={setShowExitDialog}
 *   onContinueEditing={() => setShowExitDialog(false)}
 *   onDiscardAndExit={() => { ... }}
 * />
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface DiscardChangesDialogProps {
  /** Se o diálogo está aberto */
  open: boolean;
  /** Callback quando o estado de abertura muda */
  onOpenChange: (open: boolean) => void;
  /** Callback quando o usuário escolhe continuar editando */
  onContinueEditing: () => void;
  /** Callback quando o usuário confirma o descarte */
  onDiscardAndExit: () => void;
  /** Título customizado (opcional) */
  title?: string;
  /** Descrição customizada (opcional) */
  description?: string;
  /** Texto do botão de continuar (opcional) */
  continueLabel?: string;
  /** Texto do botão de descartar (opcional) */
  discardLabel?: string;
  /** Se está processando a ação de descarte */
  isDiscarding?: boolean;
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onContinueEditing,
  onDiscardAndExit,
  title = 'Descartar alterações?',
  description = 'Você tem alterações não salvas. Se sair agora, todo o progresso será perdido.',
  continueLabel = 'Continuar editando',
  discardLabel = 'Descartar e sair',
  isDiscarding = false,
}: DiscardChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onContinueEditing}
            disabled={isDiscarding}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {continueLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onDiscardAndExit}
            disabled={isDiscarding}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isDiscarding ? 'Descartando...' : discardLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
