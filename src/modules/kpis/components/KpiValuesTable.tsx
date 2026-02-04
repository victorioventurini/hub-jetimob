/**
 * KpiValuesTable - Tabela de Histórico de Valores
 * 
 * Exibe o histórico completo de valores de um KPI/Métrica com variações.
 * Segue o padrão do KrCheckinsTable para consistência visual.
 * 
 * @see TCR v2.86.0
 */

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Calendar,
  Edit,
  Database,
  Link2,
  Plug,
  Calculator,
  Sheet,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiValue, KpiDirection, KpiValueSource } from "../types";

export interface KpiValuesTableProps {
  values: KpiValue[];
  unit: string;
  direction: KpiDirection;
  isLoading: boolean;
}

const confidenceConfig = {
  high: { label: "Alta", className: "text-status-green-muted-foreground bg-status-green-muted" },
  medium: { label: "Média", className: "text-status-yellow-muted-foreground bg-status-yellow-muted" },
  low: { label: "Baixa", className: "text-status-red-muted-foreground bg-status-red-muted" },
};

const sourceIcons: Record<KpiValueSource, React.ElementType> = {
  manual: Edit,
  api: Plug,
  webhook: Webhook,
  spreadsheet: Sheet,
  database: Database,
  integration: Link2,
  calculation: Calculator,
};

const sourceLabels: Record<KpiValueSource, string> = {
  manual: 'Manual',
  api: 'API',
  webhook: 'Webhook',
  spreadsheet: 'Planilha',
  database: 'Banco de Dados',
  integration: 'Integração',
  calculation: 'Cálculo',
};

function formatValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  if (unit === 'R$' || unit === 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
}

function getVariationColor(variation: number, direction: KpiDirection): string {
  if (variation === 0) {
    return "text-muted-foreground";
  }

  if (direction === "up") {
    return variation > 0 ? "text-success" : "text-destructive";
  }

  // down
  return variation < 0 ? "text-success" : "text-destructive";
}

function getVariationIcon(variation: number) {
  if (variation > 0) return TrendingUp;
  if (variation < 0) return TrendingDown;
  return Minus;
}

function getUserInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-sm text-muted-foreground">
        Nenhum valor registrado ainda.
      </p>
    </div>
  );
}

export function KpiValuesTable({
  values,
  unit,
  direction,
  isLoading,
}: KpiValuesTableProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!values?.length) {
    return <EmptyState />;
  }

  // Sort descending (most recent first)
  const sortedValues = [...values].sort(
    (a, b) => new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
  );

  return (
    <TooltipProvider>
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="w-[160px]">Usuário</TableHead>
                <TableHead className="w-[100px] text-right">Anterior</TableHead>
                <TableHead className="w-[100px] text-right">Atual</TableHead>
                <TableHead className="w-[90px] text-right">Variação</TableHead>
                <TableHead className="w-[90px] text-center">Origem</TableHead>
                <TableHead className="w-[50px] text-center">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedValues.map((value, index) => {
                // Calculate previous value from next item in sorted list
                const previousValue = index < sortedValues.length - 1 
                  ? sortedValues[index + 1]?.value 
                  : null;
                const variation = previousValue !== null 
                  ? value.value - previousValue 
                  : null;

                const VariationIcon = variation !== null ? getVariationIcon(variation) : null;
                const variationColor =
                  variation !== null ? getVariationColor(variation, direction) : "";

                const hasNotes = !!value.notes?.trim();
                const SourceIcon = sourceIcons[value.source] || Edit;

                return (
                  <TableRow key={value.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                    {/* Data */}
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {format(parseISO(value.reference_date), "dd MMM", { locale: ptBR })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(parseISO(value.reference_date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Usuário */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={value.created_by_user?.photo_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getUserInitials(value.created_by_user?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[120px]">
                          {value.created_by_user?.display_name || "Sistema"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Valor Anterior */}
                    <TableCell className="text-right text-muted-foreground">
                      {previousValue !== null
                        ? formatValue(previousValue, unit)
                        : "—"}
                    </TableCell>

                    {/* Valor Atual */}
                    <TableCell className="text-right font-medium">
                      {formatValue(value.value, unit)}
                    </TableCell>

                    {/* Variação */}
                    <TableCell className="text-right">
                      {variation !== null && VariationIcon ? (
                        <div className={cn("flex items-center justify-end gap-1", variationColor)}>
                          <VariationIcon className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">
                            {variation > 0 ? "+" : ""}
                            {formatValue(variation, unit)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Origem */}
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs font-normal gap-1">
                            <SourceIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {sourceLabels[value.source] || value.source}
                            </span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {sourceLabels[value.source] || value.source}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Info (Notas) */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {hasNotes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 hover:bg-muted rounded" type="button">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <p className="text-sm font-medium mb-1">Observação</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {value.notes}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
