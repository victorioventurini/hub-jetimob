/**
 * VicErrorState - Página de erro com a cara do Vic
 * 
 * Substitui a página de erro genérica por uma versão
 * com a personalidade do Vic (IA masculino) - leve, direto e construtivo.
 */

import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, ArrowLeft, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface VicErrorStateProps {
  /** Título do erro */
  title?: string;
  /** Descrição do erro */
  description?: string;
  /** Callback para tentar novamente */
  onRetry?: () => void;
  /** Callback para voltar */
  onBack?: () => void;
  /** Label do botão retry */
  retryLabel?: string;
  /** Label do botão back */
  backLabel?: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Modo compacto */
  compact?: boolean;
  /** Mostrar detalhes técnicos */
  technicalDetails?: string | null;
}

// ============================================================
// VIC CONFUSED ICON - Animação do Vic confuso
// ============================================================

function VicConfusedIcon({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const iconSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/20',
        sizeClasses[size]
      )}
      animate={{
        rotate: [0, -5, 5, -5, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Glow effect */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full bg-primary/10 blur-xl',
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Wrench icon (Vic trying to fix) */}
      <motion.div
        className="relative z-10"
        animate={{
          rotate: [0, 20, -20, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Wrench className={cn('text-primary', iconSizeClasses[size])} />
      </motion.div>

      {/* Floating sparkles */}
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{
          y: [0, -4, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles className="h-4 w-4 text-primary/60" />
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// VIC THINKING DOTS - Animação de pontos pulsantes
// ============================================================

function VicThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function VicErrorState({
  title = 'Opa, deu ruim aqui 😅',
  description = 'Algo não saiu como planejado, mas relaxa que vou dar um jeito.',
  onRetry,
  onBack,
  retryLabel = 'Tentar de novo',
  backLabel = 'Voltar',
  className,
  compact = false,
  technicalDetails,
}: VicErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-4',
        className
      )}
    >
      {/* Animated icon */}
      <VicConfusedIcon size={compact ? 'md' : 'lg'} />

      {/* Copy principal com tom do Vic */}
      <div className="mt-6 space-y-2">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'font-bold text-foreground',
            compact ? 'text-lg' : 'text-2xl'
          )}
        >
          {title}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-muted-foreground max-w-md',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </motion.p>

        {/* Vic pensando */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-primary"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Vic matutando uma solução</span>
          <VicThinkingDots />
        </motion.div>
      </div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-8')}
      >
        {onBack && (
          <Button
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        )}
        {onRetry && (
          <Button
            size={compact ? 'sm' : 'default'}
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </motion.div>

      {/* Technical details (se fornecido) */}
      {technicalDetails && (
        <motion.details
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-full max-w-3xl rounded-lg border border-border bg-card p-4"
        >
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Detalhes técnicos (pro time de dev)
          </summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-muted-foreground font-mono">
            {technicalDetails}
          </pre>
        </motion.details>
      )}
    </motion.div>
  );
}
