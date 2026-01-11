/**
 * InitiativeCulturalMessage
 * 
 * Mensagem educativa exibida antes dos botões de ação no dialog de criação.
 * Reforça o papel das iniciativas como tentativas ajustáveis.
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InitiativeCulturalMessageProps {
  className?: string;
}

export function InitiativeCulturalMessage({ className }: InitiativeCulturalMessageProps) {
  return (
    <div className={cn(
      'bg-muted/30 rounded-md p-3 text-sm text-muted-foreground border border-dashed',
      className
    )}>
      <Sparkles className="w-4 h-4 inline mr-1.5 text-primary/60" />
      Iniciativas não precisam estar perfeitas. Precisam existir, ser tentadas e ajustadas.
    </div>
  );
}
