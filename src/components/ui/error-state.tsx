import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onBack?: () => void;
  retryLabel?: string;
  backLabel?: string;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  onBack,
  retryLabel = "Tentar novamente",
  backLabel = "Voltar",
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-destructive/10 flex items-center justify-center mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        <AlertCircle
          className={cn(
            "text-destructive",
            compact ? "w-6 h-6" : "w-8 h-8"
          )}
        />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground mb-1",
          compact ? "text-base" : "text-xl"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground max-w-md",
          compact ? "text-sm mb-4" : "text-base mb-6"
        )}
      >
        {description}
      </p>
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        )}
        {onRetry && (
          <Button
            size={compact ? "sm" : "default"}
            onClick={onRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
