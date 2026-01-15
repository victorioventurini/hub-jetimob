/**
 * AskToVic - Componente de apoio inteligente contextual
 * 
 * REGRAS DE OURO:
 * - É um ÍCONE, nunca um botão
 * - Visual discreto
 * - Sempre com tooltip "Perguntar ao Vic"
 * - Nunca bloqueia o fluxo do usuário
 * - Nunca é obrigatório
 * 
 * "O usuário sente que tem um mentor disponível, não um professor interrompendo."
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAskToVic } from '../hooks';
import type { AskToVicProps } from '../types/ask-to-vic';

const SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const CONTAINER_SIZE_CLASSES = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

const VARIANT_CLASSES = {
  default: 'text-muted-foreground hover:text-primary hover:bg-primary/10',
  subtle: 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50',
  primary: 'text-primary/80 hover:text-primary hover:bg-primary/10',
};

export function AskToVic({
  context,
  size = 'md',
  variant = 'default',
  onApply,
  className,
  disabled = false,
}: AskToVicProps) {
  const { ask, getAgentForContext, isEnabled, isLoading } = useAskToVic();

  const agentInfo = getAgentForContext(context);
  const isDisabled = disabled || !isEnabled || isLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isDisabled) {
      ask(context, onApply);
    }
  };

  // Se IA está desabilitada, mostrar ícone discreto com tooltip explicativo
  if (!isEnabled && !isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full cursor-not-allowed opacity-40',
              CONTAINER_SIZE_CLASSES[size],
              className
            )}
          >
            <Sparkles className={cn(SIZE_CLASSES[size], 'text-muted-foreground')} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs text-muted-foreground">IA desativada nesta BU</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          className={cn(
            'inline-flex items-center justify-center rounded-full transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            CONTAINER_SIZE_CLASSES[size],
            VARIANT_CLASSES[variant],
            isDisabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          aria-label="Perguntar ao Vic"
        >
          <Sparkles 
            className={cn(
              SIZE_CLASSES[size],
              'transition-transform duration-200',
              !isDisabled && 'group-hover:scale-110'
            )} 
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-medium text-sm">Perguntar ao Vic</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {agentInfo.description}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Versão inline para usar junto a labels e títulos
 */
export function AskToVicInline({
  context,
  onApply,
  className,
}: Pick<AskToVicProps, 'context' | 'onApply' | 'className'>) {
  return (
    <AskToVic
      context={context}
      size="sm"
      variant="subtle"
      onApply={onApply}
      className={cn('ml-1 align-middle', className)}
    />
  );
}

/**
 * Versão para headers de step com mais destaque
 */
export function AskToVicStepHelper({
  context,
  onApply,
  className,
}: Pick<AskToVicProps, 'context' | 'onApply' | 'className'>) {
  return (
    <AskToVic
      context={context}
      size="md"
      variant="primary"
      onApply={onApply}
      className={className}
    />
  );
}
