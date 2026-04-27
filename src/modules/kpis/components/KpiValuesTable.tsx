/**
 * KpiValuesTable - Tabela de Histórico de Valores
 * 
 * Exibe o histórico completo de valores de um KPI/Métrica com variações.
 * v3.x: Suporta edição e exclusão de valores inline.
 */

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { KpiValue, KpiDirection, KpiValueSource } from "../types";
import { EditKpiValueDialog } from "./EditKpiValueDialog";

export interface KpiValuesTableProps {
  values: KpiValue[];
  unit: string;
  direction: KpiDirection;
  isLoading: boolean;
  /** KPI name for dialog title */
  kpiName?: string;
  /** v3.0.0 — frequencies para input_type smart defaults na edição. */
  consolidationFrequency?: import('../types').KpiFrequencyValue | null;
  updateFrequency?: import('../types').KpiFrequencyValue | null;
  /** Whether the user can edit/delete values */
  canEdit?: boolean;
  /** Callback to update a value */
  onUpdateValue?: (
    id: string,
    data: {
      value: number;
      reference_date: string;
      notes?: string;
      input_type?: import('../types').KpiInputType;
      confidence?: import('../types').KpiConfidenceLevel;
    },
  ) => Promise<void>;
  /** Callback to delete a value */
  onDeleteValue?: (id: string) => Promise<void>;
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
  if (variation === 0) return "text-muted-foreground";
  if (direction === "up") return variation > 0 ? "text-success" : "text-destructive";
  return variation < 0 ? "text-success" : "text-destructive";
}

function getVariationIcon(variation: number) {
  if (variation > 0) return TrendingUp;
  if (variation < 0) return TrendingDown;
  return Minus;
}

function getUserInitials(name: string | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
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

function KpiValuesEmptyState() {
  return (
    <EmptyState
      icon={Calendar}
      title="Nenhum valor registrado"
      description="Nenhum valor registrado ainda."
      compact
    />
  );
}

export function KpiValuesTable({
  values,
  unit,
  direction,
  isLoading,
  kpiName = "",
  consolidationFrequency,
  updateFrequency,
  canEdit = false,
  onUpdateValue,
  onDeleteValue,
}: KpiValuesTableProps) {
  const [editingValue, setEditingValue] = useState<KpiValue | null>(null);
  const [deletingValue, setDeletingValue] = useState<KpiValue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) return <LoadingSkeleton />;
  if (!values?.length) return <KpiValuesEmptyState />;

  const sortedValues = [...values].sort(
    (a, b) => new Date(b.reference_date).getTime() - new Date(a.reference_date).getTime()
  );

  const handleDelete = async () => {
    if (!deletingValue || !onDeleteValue) return;
    setIsDeleting(true);
    try {
      await onDeleteValue(deletingValue.id);
      setDeletingValue(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const showActions = canEdit && (!!onUpdateValue || !!onDeleteValue);

  return (
    <TooltipProvider>
      <div className="w-full overflow-x-auto">
        <div className="min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead className="w-[160px]">Usuário</TableHead>
                <TableHead className="w-[100px] text-right">Anterior</TableHead>
                <TableHead className="w-[100px] text-right">Atual</TableHead>
                <TableHead className="w-[90px] text-right">Variação</TableHead>
                <TableHead className="w-[100px] text-center">Tipo</TableHead>
                <TableHead className="w-[90px] text-center">Origem</TableHead>
                <TableHead className="w-[50px] text-center">Info</TableHead>
                {showActions && (
                  <TableHead className="w-[70px] text-center">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedValues.map((value, index) => {
                const previousValue = index < sortedValues.length - 1
                  ? sortedValues[index + 1]?.value
                  : null;
                const variation = previousValue !== null
                  ? value.value - previousValue
                  : null;

                const VariationIcon = variation !== null ? getVariationIcon(variation) : null;
                const variationColor = variation !== null ? getVariationColor(variation, direction) : "";
                const hasNotes = !!value.notes?.trim();
                const SourceIcon = sourceIcons[value.source] || Edit;
                const isProjection = value.input_type === 'projection';
                const confidence = value.confidence;
                const confCfg = confidence ? confidenceConfig[confidence] : null;

                return (
                  <TableRow
                    key={value.id}
                    className={cn(
                      "group/row",
                      index % 2 === 0 ? "bg-muted/20" : "",
                      isProjection && "opacity-80",
                    )}
                  >
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {format(parseISO(value.reference_date), "dd MMM", { locale: ptBR })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(parseISO(value.reference_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

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

                    <TableCell className="text-right text-muted-foreground">
                      {previousValue !== null ? formatValue(previousValue, unit) : "—"}
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {formatValue(value.value, unit)}
                    </TableCell>

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

                    {/* v3.0.0 — Tipo (Projeção/Consolidado) + Confidence */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Badge
                          variant={isProjection ? 'outline' : 'secondary'}
                          className={cn(
                            'text-[10px] h-5 font-normal',
                            isProjection && 'border-dashed text-muted-foreground',
                          )}
                        >
                          {isProjection ? 'Projeção' : 'Consolidado'}
                        </Badge>
                        {confCfg && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] h-5 font-normal', confCfg.className)}
                              >
                                {confCfg.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Confiança: {confCfg.label}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>

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

                    {showActions && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {onUpdateValue && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingValue(value)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar valor</TooltipContent>
                            </Tooltip>
                          )}
                          {onDeleteValue && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingValue(value)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir valor</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Value Dialog */}
      {onUpdateValue && (
        <EditKpiValueDialog
          kpiValue={editingValue}
          kpiName={kpiName}
          unit={unit}
          consolidationFrequency={consolidationFrequency}
          updateFrequency={updateFrequency}
          open={!!editingValue}
          onOpenChange={(open) => { if (!open) setEditingValue(null); }}
          onSave={onUpdateValue}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingValue} onOpenChange={(open) => { if (!open) setDeletingValue(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Valor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o valor{" "}
              <strong>{deletingValue ? formatValue(deletingValue.value, unit) : ""}</strong>{" "}
              de{" "}
              <strong>
                {deletingValue
                  ? format(parseISO(deletingValue.reference_date), "dd/MM/yyyy")
                  : ""}
              </strong>
              ?
              <br />
              <span className="text-destructive font-medium">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
