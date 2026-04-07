/**
 * TeamKrsToggle — Botão para exibir/ocultar contribuições dos times nos OKRs organizacionais.
 * Reutilizável em qualquer wizard step que renderize linkedTeamKrs.
 */

import { Users, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TeamKrsToggleProps {
  visible: boolean;
  onToggle: () => void;
  className?: string;
}

export function TeamKrsToggle({ visible, onToggle, className }: TeamKrsToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 gap-1.5 text-xs text-muted-foreground', className)}
      onClick={onToggle}
    >
      {visible ? (
        <>
          <EyeOff className="h-3.5 w-3.5" />
          Ocultar times
        </>
      ) : (
        <>
          <Users className="h-3.5 w-3.5" />
          Ver times
        </>
      )}
    </Button>
  );
}
