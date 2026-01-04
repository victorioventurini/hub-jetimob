import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureMessage } from "@/hooks/useCultureMessage";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const FALLBACK_MESSAGES = [
  "Cultura não é o que dizemos, é o que fazemos no dia a dia.",
  "Cada decisão reflete nossos valores. Faça escolhas que nos orgulhem.",
  "Simplicidade é a sofisticação máxima. Menos ruído, mais resultado.",
  "Compromisso não é cumprir tarefas, é entregar impacto.",
];

export function CultureCard() {
  const { message, isLoading, error, refresh } = useCultureMessage();

  // Always have a locally-rotating fallback so the UI can change even if the backend call is blocked (e.g. not logged in yet).
  const initialFallbackIndex = useMemo(
    () => Math.floor(Math.random() * FALLBACK_MESSAGES.length),
    []
  );
  const [fallbackIndex, setFallbackIndex] = useState(initialFallbackIndex);

  const displayMessage = message || FALLBACK_MESSAGES[fallbackIndex];

  const handleRefresh = async () => {
    // Guarantees a visible change even when we can only use local fallback/cache.
    setFallbackIndex((prev) => (prev + 1) % FALLBACK_MESSAGES.length);
    await refresh();
  };

  return (
    <Card className="relative overflow-hidden border bg-card">
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
        <div className="absolute inset-0 bg-primary rounded-full blur-2xl transform translate-x-6 -translate-y-6" />
      </div>
      
      <CardContent className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cultura Jet
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40"
            aria-label="Atualizar mensagem de cultura"
            title={error ? "Atualizar (offline)" : "Atualizar"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Message */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full bg-muted" />
            <Skeleton className="h-5 w-3/4 bg-muted" />
          </div>
        ) : (
          <p className="text-base font-medium leading-relaxed text-foreground">
            {displayMessage}
          </p>
        )}

        {/* Signature */}
        <div className="mt-3 text-right">
          <span className="text-xs italic text-muted-foreground">
            — Vic
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
