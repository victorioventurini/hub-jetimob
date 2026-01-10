/**
 * VicLoadingState - Loading moderno com identidade Vic
 * 
 * Substitui os spinners genéricos por uma animação
 * moderna que faz alusão à IA Vic.
 */

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface VicLoadingStateProps {
  /** Texto a exibir durante o loading */
  text?: string;
  /** Tamanho: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Variante visual */
  variant?: 'default' | 'inline' | 'card';
  /** Classes CSS adicionais */
  className?: string;
}

// ============================================================
// SIZE CONFIGS
// ============================================================

const SIZE_CONFIGS = {
  sm: {
    icon: 'h-4 w-4',
    text: 'text-xs',
    dots: 'h-1 w-1',
    gap: 'gap-1.5',
    padding: 'p-2',
  },
  md: {
    icon: 'h-5 w-5',
    text: 'text-sm',
    dots: 'h-1.5 w-1.5',
    gap: 'gap-2',
    padding: 'p-4',
  },
  lg: {
    icon: 'h-8 w-8',
    text: 'text-base',
    dots: 'h-2 w-2',
    gap: 'gap-3',
    padding: 'p-6',
  },
};

// ============================================================
// VIC THINKING DOTS - Animação de pontos pulsantes
// ============================================================

function VicThinkingDots({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const config = SIZE_CONFIGS[size];
  
  return (
    <div className={cn('flex items-center', config.gap)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn('rounded-full bg-primary', config.dots)}
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
// VIC SPARKLE ANIMATION - Ícone com animação
// ============================================================

function VicSparkleIcon({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const config = SIZE_CONFIGS[size];
  
  return (
    <motion.div
      animate={{
        rotate: [0, 10, -10, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="relative"
    >
      <Sparkles className={cn('text-primary', config.icon)} />
      
      {/* Glow effect */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full bg-primary/20 blur-sm',
          config.icon
        )}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function VicLoadingState({
  text = 'Vic está pensando...',
  size = 'md',
  variant = 'default',
  className,
}: VicLoadingStateProps) {
  const config = SIZE_CONFIGS[size];

  // Inline variant - minimal
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <VicSparkleIcon size={size} />
        <span className={cn('text-muted-foreground', config.text)}>
          {text}
        </span>
        <VicThinkingDots size={size} />
      </div>
    );
  }

  // Card variant - com fundo e borda
  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-lg border bg-primary/5 border-primary/20',
          config.padding,
          className
        )}
      >
        <div className="flex items-center gap-3">
          <VicSparkleIcon size={size} />
          <div className="flex-1">
            <span className={cn('text-foreground font-medium', config.text)}>
              {text}
            </span>
            <div className="mt-1.5">
              <VicThinkingDots size={size} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant - centralizado
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.padding,
        className
      )}
    >
      <VicSparkleIcon size={size} />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn('text-muted-foreground mt-3', config.text)}
      >
        {text}
      </motion.p>
      <div className="mt-2">
        <VicThinkingDots size={size} />
      </div>
    </motion.div>
  );
}

// ============================================================
// VIC GENERATING CARD - Para estados de geração em cards
// ============================================================

export interface VicGeneratingCardProps {
  /** Texto descritivo */
  text?: string;
  /** Classes CSS adicionais */
  className?: string;
}

export function VicGeneratingCard({
  text = 'Analisando...',
  className,
}: VicGeneratingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="relative flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
          <Sparkles className="h-5 w-5 text-primary relative z-10" />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{text}</span>
            <VicThinkingDots size="sm" />
          </div>
          
          {/* Progress bar animation */}
          <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ width: '30%' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
