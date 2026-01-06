import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Cycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
}

interface CycleSelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  cycles: Cycle[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  required?: boolean;
  showPeriodPreview?: boolean;
}

/**
 * Centralized cycle select component for OKRs.
 * Displays cycle name with period preview.
 */
export function CycleSelect({
  value,
  onValueChange,
  cycles,
  disabled = false,
  placeholder = "Selecione um ciclo",
  className,
  triggerClassName,
  required = false,
  showPeriodPreview = true,
}: CycleSelectProps) {
  const selectedCycle = cycles.find(c => c.id === value);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatPeriod = (cycle: Cycle) => {
    return `${formatDate(cycle.start_date)} → ${formatDate(cycle.end_date)}`;
  };

  const getCycleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: "Anual",
      quarterly: "Trimestral",
      semester: "Semestral",
      monthly: "Mensal",
    };
    return labels[type] || type;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder}>
            {selectedCycle && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{selectedCycle.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {cycles.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Nenhum ciclo disponível
            </div>
          ) : (
            cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{cycle.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {getCycleTypeLabel(cycle.type)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground block">
                  {formatPeriod(cycle)}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Period preview when cycle is selected */}
      {showPeriodPreview && selectedCycle && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Período: <span className="font-medium text-foreground">{formatPeriod(selectedCycle)}</span>
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                O objetivo e seus KRs herdam automaticamente o período do ciclo selecionado.
                Não é possível definir datas individuais.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

/**
 * Displays cycle period info as a badge/pill.
 * Used in cards and detail views.
 */
export function CycleBadge({ cycle, compact = false }: { cycle: Cycle | null; compact?: boolean }) {
  if (!cycle) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), compact ? "dd/MM" : "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <Calendar className="h-3 w-3" />
            {cycle.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium mb-1">Período do Ciclo</p>
          <p>{formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Displays cycle period inline.
 * Used in objective/KR detail views.
 */
export function CyclePeriodInfo({ cycle, showTooltip = true }: { cycle: Cycle | null; showTooltip?: boolean }) {
  if (!cycle) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const content = (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4" />
      <span>
        <span className="font-medium text-foreground">{cycle.name}</span>
        {" · "}
        {formatDate(cycle.start_date)} até {formatDate(cycle.end_date)}
      </span>
    </div>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          O prazo do objetivo e de todas as suas KRs é determinado por este ciclo.
          Resultados são avaliados até o final do período.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
