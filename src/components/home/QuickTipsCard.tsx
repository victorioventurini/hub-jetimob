/**
 * QuickTipsCard - Card de dicas de produtividade personalizadas
 * 
 * Usa o agente coach-produtividade para gerar dicas baseadas no
 * contexto rico do usuário (role, OKRs, check-ins, etc).
 * 
 * Features:
 * - Dicas personalizadas via IA
 * - Cache inteligente por turno
 * - Fallback com dicas estáticas por perfil
 * - Indicador visual quando dica é da IA
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductivityTip } from "@/hooks/useProductivityTip";

export function QuickTipsCard() {
  const { tip, isLoading, isFromAI, refresh } = useProductivityTip();

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-medium">
            <Lightbulb className="h-4 w-4 text-warning" />
            Dica do Dia
            {isFromAI && (
              <Sparkles className="h-3 w-3 text-status-purple" aria-label="Gerada por IA" />
            )}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Atualizar dica"
          >
            <RefreshCw className={cn(
              "h-3.5 w-3.5 text-muted-foreground",
              isLoading && "animate-spin"
            )} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tip}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
