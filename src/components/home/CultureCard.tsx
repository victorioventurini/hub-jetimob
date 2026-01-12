import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureMessage } from "@/hooks/useCultureMessage";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VicTypewriterText } from "@/modules/vic";

const FALLBACK_MESSAGES = [
  "Cultura não é o que dizemos, é o que fazemos no dia a dia.",
  "Cada decisão reflete nossos valores. Faça escolhas que nos orgulhem.",
  "Simplicidade é a sofisticação máxima. Menos ruído, mais resultado.",
  "Compromisso não é cumprir tarefas, é entregar impacto.",
];

export function CultureCard() {
  const { message, isLoading } = useCultureMessage();

  const initialFallbackIndex = useMemo(
    () => Math.floor(Math.random() * FALLBACK_MESSAGES.length),
    []
  );
  const [fallbackIndex] = useState(initialFallbackIndex);
  const [messageKey, setMessageKey] = useState(0);

  const displayMessage = message || FALLBACK_MESSAGES[fallbackIndex];

  // Reset typewriter when message changes
  useEffect(() => {
    setMessageKey((prev) => prev + 1);
  }, [displayMessage]);

  return (
    <section className="w-full py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cultura Jet
        </span>
      </div>

      {/* Message with Typewriter Effect */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <Skeleton className="h-10 w-full bg-muted" />
            <Skeleton className="h-10 w-3/4 bg-muted" />
          </motion.div>
        ) : (
          <motion.div
            key={`message-${messageKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="font-handwriting text-3xl md:text-4xl lg:text-5xl leading-snug text-foreground">
              <VicTypewriterText text={displayMessage} speed={42} cursorHeight="h-8" />
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature */}
      <div className="mt-4 text-right">
        <span className="text-sm italic text-muted-foreground">— Vic</span>
      </div>
    </section>
  );
}
