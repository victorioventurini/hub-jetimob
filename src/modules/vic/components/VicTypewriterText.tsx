/**
 * VicTypewriterText - Efeito de digitação estilo Vic
 * 
 * Usado para todos os textos gerados por IA,
 * simulando a digitação letra por letra.
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  /** Se deve iniciar a digitação imediatamente */
  autoStart?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Cor do cursor */
  cursorClassName?: string;
  /** Altura do cursor */
  cursorHeight?: string;
  /** Se deve mostrar a assinatura "— Vic" ao final */
  showSignature?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

function VicTypewriterTextComponent({
  text,
  speed = 25,
  onComplete,
  autoStart = true,
  className,
  cursorClassName,
  cursorHeight = 'h-4',
  showSignature = false,
}: VicTypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const startTyping = useCallback(() => {
    if (!text || isTyping) return;
    
    setDisplayedText('');
    setIsTyping(true);
    setIsComplete(false);
  }, [text, isTyping]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && text && !isTyping && !isComplete) {
      startTyping();
    }
  }, [autoStart, text, isTyping, isComplete, startTyping]);

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
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, isTyping, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(false);
    setIsComplete(false);
    if (autoStart) {
      startTyping();
    }
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

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
  speed = 20,
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
 * - Em streaming: acompanha o texto conforme chega (sem “pular” para o final)
 * - Em modo estático: garante que mesmo texto vindo inteiro apareça “digitando”
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

    // Se o texto mudou “por completo” (ex: regenerate), reinicia
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
        // Se o texto mudou “por completo” durante o intervalo
        if (current && !text.startsWith(current)) return '';

        const remaining = text.length - current.length;
        if (remaining <= 0) return current;

        // Alvo: completar rápido quando veio tudo de uma vez,
        // e acompanhar suave quando está em streaming.
        const targetTicks = isStreaming ? 12 : 80;
        const step = Math.max(1, Math.ceil(remaining / targetTicks));

        const nextLen = Math.min(text.length, current.length + step);
        return text.slice(0, nextLen);
      });
    }, 12);

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
