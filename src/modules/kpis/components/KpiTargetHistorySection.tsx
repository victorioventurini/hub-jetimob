import { useState } from "react";
import { History, User, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useKpiTargetHistory, type KpiTargetHistoryEntry } from "../hooks/useKpiTargetHistory";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * v2.86.0: Seção de histórico de alterações de Meta ou Benchmark
 * 
 * Mostra histórico automático de alterações de target_value e target_source,
 * registrado pelo trigger trg_kpi_target_history.
 */

interface KpiTargetHistorySectionProps {
  kpiId: string | null;
  unit?: string;
  className?: string;
}

export function KpiTargetHistorySection({ kpiId, unit = "", className }: KpiTargetHistorySectionProps) {
  const { history, isLoading } = useKpiTargetHistory(kpiId);
  const [isOpen, setIsOpen] = useState(false);

  // Não renderizar se não há histórico
  if (!isLoading && history.length === 0) {
    return null;
  }

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    if (unit === "%") return `${value.toFixed(1)}%`;
    if (unit === "R$") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString("pt-BR");
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("space-y-2", className)}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Metas
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent" />
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {history.map((entry, index) => (
                <HistoryEntry 
                  key={entry.id} 
                  entry={entry} 
                  formatValue={formatValue} 
                  formatDateTime={formatDateTime}
                  isLast={index === history.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface HistoryEntryProps {
  entry: KpiTargetHistoryEntry;
  formatValue: (value: number | null) => string;
  formatDateTime: (dateStr: string) => string;
  isLast: boolean;
}

function HistoryEntry({ entry, formatValue, formatDateTime, isLast }: HistoryEntryProps) {
  const hasValueChange = entry.old_target_value !== entry.new_target_value;
  const hasSourceChange = entry.old_target_source !== entry.new_target_source;

  return (
    <div className={cn(
      "p-3 text-sm",
      !isLast && "border-b border-border"
    )}>
      {/* Header: Data e Usuário */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {formatDateTime(entry.changed_at)}
        </span>
        {entry.changed_by_user && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="h-4 w-4">
              <AvatarImage src={entry.changed_by_user.photo_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {entry.changed_by_user.display_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span>{entry.changed_by_user.display_name}</span>
          </div>
        )}
      </div>

      {/* Mudança de Valor */}
      {hasValueChange && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground font-medium text-xs">Meta:</span>
          <span className="text-muted-foreground line-through">
            {formatValue(entry.old_target_value)}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {formatValue(entry.new_target_value)}
          </span>
        </div>
      )}

      {/* Mudança de Fonte */}
      {hasSourceChange && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Fonte:</span>{" "}
          {entry.new_target_source || <span className="italic">(removida)</span>}
        </div>
      )}
    </div>
  );
}
