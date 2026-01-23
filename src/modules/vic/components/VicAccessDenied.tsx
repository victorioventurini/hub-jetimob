/**
 * VicAccessDenied - Tela de acesso negado com a cara do Vic
 * 
 * Usada quando o usuário não tem permissão para acessar um recurso.
 * Tom Vic: leve, empático e construtivo.
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface VicAccessDeniedProps {
  /** Título customizado */
  title?: string;
  /** Descrição customizada */
  description?: string;
  /** Sugestão de ação */
  suggestion?: string;
  /** Link de voltar (default: /) */
  backLink?: string;
  /** Label do botão de voltar */
  backLabel?: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Modo compacto (para uso em cards) */
  compact?: boolean;
}

// ============================================================
// VIC LOCKED ICON - Ícone animado de cadeado
// ============================================================

function VicLockedIcon({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
  };

  const iconSizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/20',
        sizeClasses[size]
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-warning/10 blur-xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Lock icon with subtle shake */}
      <motion.div
        className="relative z-10"
        animate={{
          rotate: [0, -3, 3, -2, 0],
        }}
        transition={{
          duration: 0.5,
          delay: 0.3,
        }}
      >
        <Lock className={cn('text-warning', iconSizeClasses[size])} />
      </motion.div>

      {/* Floating sparkles */}
      <motion.div
        className="absolute -top-1 -right-2"
        animate={{
          y: [0, -3, 0],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Sparkles className="h-4 w-4 text-amber-500/50" />
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function VicAccessDenied({
  title = 'Eita, essa área é VIP! 🔐',
  description = 'Parece que você não tem acesso a esse conteúdo. Mas relaxa, acontece!',
  suggestion = 'Se acha que deveria ter acesso, é só chamar seu gestor ou o admin da BU.',
  backLink = '/',
  backLabel = 'Voltar pro início',
  className,
  compact = false,
}: VicAccessDeniedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-4' : 'min-h-[60vh] py-16 px-4',
        className
      )}
    >
      {/* Animated icon */}
      <VicLockedIcon size={compact ? 'md' : 'lg'} />

      {/* Copy principal com tom do Vic */}
      <div className="mt-6 space-y-3 max-w-md">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'font-bold text-foreground',
            compact ? 'text-xl' : 'text-2xl'
          )}
        >
          {title}
        </motion.h3>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'text-muted-foreground',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </motion.p>

        {/* Sugestão do Vic */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-left"
        >
          <MessageCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Dica do Vic:</span>{' '}
            {suggestion}
          </p>
        </motion.div>
      </div>

      {/* Action button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn('mt-8')}
      >
        <Button asChild variant="outline" size={compact ? 'sm' : 'default'} className="gap-2">
          <Link to={backLink}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
