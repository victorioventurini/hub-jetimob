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

  // Get a fallback message based on the day
  const fallbackMessage = FALLBACK_MESSAGES[new Date().getDay() % FALLBACK_MESSAGES.length];
  
  const displayMessage = message || fallbackMessage;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-sidebar-accent">
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="absolute inset-0 bg-accent rounded-full blur-3xl transform translate-x-8 -translate-y-8" />
      </div>
      
      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              Cultura Jet
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refresh}
            disabled={isLoading}
            className="h-6 w-6 p-0 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-40"
            aria-label="Atualizar mensagem de cultura"
            title="Atualizar"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Message */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full bg-primary-foreground/10" />
            <Skeleton className="h-5 w-3/4 bg-primary-foreground/10" />
          </div>
        ) : (
          <p className="text-lg font-medium leading-relaxed text-primary-foreground">
            {displayMessage}
          </p>
        )}

        {/* Signature */}
        <div className="mt-4 text-right">
          <span className="text-sm italic text-primary-foreground/60">
            — Vic
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
