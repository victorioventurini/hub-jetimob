/**
 * HelpTooltip - Tooltip de ajuda padronizado com ícone HelpCircle
 * 
 * Uso para campos, labels ou conceitos que precisam de explicação adicional.
 * Segue o padrão visual do Hub com ícone discreto e tooltip informativo.
 * 
 * @example
 * <Label>
 *   Threshold <HelpTooltip content="Valor mínimo para considerar aceitável" />
 * </Label>
 * 
 * @example
 * <HelpTooltip 
 *   content={
 *     <div>
 *       <strong>% vs p.p.:</strong>
 *       <ul>
 *         <li>% para valores percentuais</li>
 *         <li>p.p. para diferenças absolutas</li>
 *       </ul>
 *     </div>
 *   } 
 * />
 */

import * as React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface HelpTooltipProps {
  /** Conteúdo do tooltip (texto ou JSX) */
  content: React.ReactNode;
  /** Lado do tooltip (padrão: top) */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alinhamento do tooltip */
  align?: 'start' | 'center' | 'end';
  /** Variante do ícone */
  variant?: 'help' | 'info';
  /** Tamanho do ícone */
  size?: 'sm' | 'md' | 'lg';
  /** Classes adicionais para o ícone */
  className?: string;
  /** Classes adicionais para o conteúdo do tooltip */
  contentClassName?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function HelpTooltip({
  content,
  side = 'top',
  align = 'center',
  variant = 'help',
  size = 'md',
  className,
  contentClassName,
}: HelpTooltipProps) {
  const Icon = variant === 'help' ? HelpCircle : Info;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Icon
            className={cn(
              'text-muted-foreground cursor-help inline-block ml-1 hover:text-foreground transition-colors',
              sizeClasses[size],
              className
            )}
            aria-label="Ajuda"
          />
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className={cn('max-w-xs', contentClassName)}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Variante inline para uso dentro de texto
 */
export function InlineHelp({
  term,
  explanation,
  className,
}: {
  term: string;
  explanation: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="underline decoration-dotted decoration-muted-foreground cursor-help">
        {term}
      </span>
      <HelpTooltip content={explanation} size="sm" />
    </span>
  );
}
