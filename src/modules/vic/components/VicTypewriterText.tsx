/**
 * VicTypewriterText - Efeito de digitação estilo Vic
 * 
 * Usado para todos os textos gerados pelo Vic (IA),
 * simulando a digitação letra por letra.
 * 
 * Suporta sequenciamento via VicTypewriterQueueProvider para evitar
 * múltiplos blocos animando simultaneamente.
 * 
 * VELOCIDADE GLOBAL: ~12-15 caracteres por segundo (natural)
 * Humanos digitam ~5-8 chars/segundo, leitura rápida ~25 chars/segundo
 */

import { useState, useEffect, useCallback, memo, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVicTypewriterQueue } from '../contexts/VicTypewriterQueue';

// ============================================================
// VELOCIDADE GLOBAL - Ajuste aqui para todas as animações do Vic
// ============================================================
const VIC_TYPING_SPEED_MS = 8; // 8ms por caractere = ~120 chars/segundo

// ============================================================
// TYPES
// ============================================================

export interface VicTypewriterTextProps {
  /** Texto a ser digitado */
  text: string;
  /** Velocidade de digitação em ms (menor = mais rápido) */
  speed?: number;
  /** Callback quando a digitação termina */
  onComplete?: () => void;
  /** Se deve iniciar a digitação imediatamente (ou aguardar fila) */
  autoStart?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Cor do cursor */
  cursorClassName?: string;
  /** Altura do cursor */
  cursorHeight?: string;
  /** Se deve mostrar a assinatura "— Vic" ao final */
  showSignature?: boolean;
  /** Prioridade na fila (menor = primeiro). Default: 0 */
  priority?: number;
}

// ============================================================
// COMPONENT
// ============================================================

function VicTypewriterTextComponent({
  text,
  speed = VIC_TYPING_SPEED_MS, // Usa velocidade global
  onComplete,
  autoStart = true,
  className,
  cursorClassName,
  cursorHeight = 'h-4',
  showSignature = false,
  priority = 0,
}: VicTypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [canStart, setCanStart] = useState(false);
  
  const queue = useVicTypewriterQueue();
  const instanceId = useId();
  const registeredTextRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startTyping = useCallback(() => {
    if (!text || isTyping) return;
    
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);
  }, [isTyping, text]);
  
  // Register with queue if available
  useEffect(() => {
    if (!autoStart || !text) return;
    
    // Already registered for this text
    if (registeredTextRef.current === text) return;
    
    // Cleanup previous registration
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    // Reset state for new text
    setDisplayedText('');
    setIsTyping(false);
    setIsComplete(false);
    setCanStart(false);
    
    registeredTextRef.current = text;
    
    if (queue) {
      cleanupRef.current = queue.register(instanceId, priority, () => {
        setCanStart(true);
      });
      
      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        registeredTextRef.current = null;
      };
    } else {
      // No queue provider - start immediately
      setCanStart(true);
    }
  }, [autoStart, text, queue, instanceId, priority]);
  
  // Start typing when canStart becomes true
  useEffect(() => {
    if (canStart && text && !isTyping && !isComplete) {
      startTyping();
    }
  }, [canStart, text, isTyping, isComplete, startTyping]);

  // Typing effect
  useEffect(() => {
    if (!isTyping || !text) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        setIsComplete(true);
        clearInterval(typingInterval);
        
        // Notify queue that we're done
        if (queue) {
          queue.notifyComplete(instanceId);
        }
        
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, isTyping, onComplete, queue, instanceId]);

  return (
    <span className={cn('inline', className)}>
      {displayedText}
      <AnimatePresence>
        {isTyping && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className={cn(
              'inline-block ml-0.5 w-0.5 bg-primary align-middle rounded-full',
              cursorHeight,
              cursorClassName
            )}
          />
        )}
      </AnimatePresence>
      {showSignature && isComplete && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="ml-2 text-muted-foreground text-sm italic"
        >
          — Vic
        </motion.span>
      )}
    </span>
  );
}

export const VicTypewriterText = memo(VicTypewriterTextComponent);

// ============================================================
// VIC TYPEWRITER BLOCK - Para blocos de texto maiores
// ============================================================

export interface VicTypewriterBlockProps {
  /** Texto a ser digitado */
  text: string;
  /** Velocidade de digitação */
  speed?: number;
  /** Callback quando completo */
  onComplete?: () => void;
  /** Classes CSS adicionais */
  className?: string;
  /** Se deve mostrar assinatura */
  showSignature?: boolean;
}

export function VicTypewriterBlock({
  text,
  speed = VIC_TYPING_SPEED_MS, // Usa velocidade global
  onComplete,
  className,
  showSignature = true,
}: VicTypewriterBlockProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) return;

    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, onComplete]);

  return (
    <div className={cn('relative', className)}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {displayedText}
        {isTyping && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block ml-0.5 w-0.5 h-4 bg-primary align-middle rounded-full"
          />
        )}
      </p>
      {showSignature && !isTyping && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xs text-muted-foreground mt-2 flex items-center gap-1"
        >
          <span className="inline-block w-1 h-1 rounded-full bg-primary" />
          Vic
        </motion.p>
      )}
    </div>
  );
}

// ============================================================
// VIC STREAMING TEXT - Para textos que vêm de streaming
// ============================================================

export interface VicStreamingTextProps {
  /** Texto atual (pode ser parcial durante streaming) */
  text: string;
  /** Se está em streaming */
  isStreaming: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

/**
 * VicStreamingText - Exibe texto com efeito de digitação progressivo
 * 
 * MUDANÇA IMPORTANTE: Velocidade FIXA de 1 caractere por tick
 * - Antes: Dividia o texto restante por targetTicks, fazendo textos longos parecerem rápidos
 * - Agora: 1 caractere a cada 70ms = ~14 chars/segundo (velocidade natural constante)
 * 
 * Em streaming: acompanha o texto conforme chega
 * Em modo estático: mesmo texto vindo inteiro aparece "digitando" naturalmente
 */
export function VicStreamingText({
  text,
  isStreaming,
  className,
}: VicStreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset hard quando não tem texto
    if (!text) {
      setDisplayedText('');
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Se o texto mudou "por completo" (ex: regenerate), reinicia
    if (displayedText && !text.startsWith(displayedText)) {
      setDisplayedText('');
    }

    // Já está completo
    if (displayedText.length >= text.length) return;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      setDisplayedText((current) => {
        // Se o texto mudou "por completo" durante o intervalo
        if (current && !text.startsWith(current)) return '';

        const remaining = text.length - current.length;
        if (remaining <= 0) return current;

        // VELOCIDADE FIXA: 1 caractere por tick
        // Isso garante velocidade constante independente do tamanho da resposta
        // NÃO usa mais a fórmula (remaining / targetTicks) que acelerava textos longos
        const step = 1;

        const nextLen = Math.min(text.length, current.length + step);
        return text.slice(0, nextLen);
      });
    }, VIC_TYPING_SPEED_MS); // Usa velocidade global (70ms = ~14 chars/segundo)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, isStreaming, displayedText]);

  const showCursor = isStreaming || displayedText.length < text.length;

  return (
    <span className={cn('inline', className)}>
      {displayedText}
      <AnimatePresence>
        {showCursor && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block ml-0.5 w-0.5 h-4 bg-primary align-middle rounded-full"
          />
        )}
      </AnimatePresence>
    </span>
  );
}
