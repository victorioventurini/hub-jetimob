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
  AlertTriangle,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { formatValueWithUnit } from "@/shared/constants/units";
import type { KrCheckinHistory } from "../hooks";
import type { OkrDirection } from "../types";

interface KrCheckinsTableProps {
  checkins: KrCheckinHistory[];
  unit: string;
  direction: OkrDirection;
  isLoading: boolean;
}

const confidenceConfig = {
  high: { label: "Alta", className: "text-status-green-muted-foreground bg-status-green-muted" },
  medium: { label: "Média", className: "text-status-yellow-muted-foreground bg-status-yellow-muted" },
  low: { label: "Baixa", className: "text-status-red-muted-foreground bg-status-red-muted" },
};

function getVariationColor(variation: number, direction: OkrDirection): string {
  if (variation === 0 || direction === "maintain") {
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

function KrCheckinsEmptyState() {
  return (
    <EmptyState
      icon={Calendar}
      title="Nenhum check-in registrado"
      description="Nenhum check-in registrado ainda."
      compact
    />
  );
}

export function KrCheckinsTable({
  checkins,
  unit,
  direction,
  isLoading,
}: KrCheckinsTableProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!checkins?.length) {
    return <KrCheckinsEmptyState />;
  }

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
                <TableHead className="w-[80px] text-center">Confiança</TableHead>
                <TableHead className="w-[50px] text-center">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkins.map((checkin, index) => {
                const variation =
                  checkin.previous_value !== null
                    ? checkin.current_value - checkin.previous_value
                    : null;

                const VariationIcon = variation !== null ? getVariationIcon(variation) : null;
                const variationColor =
                  variation !== null ? getVariationColor(variation, direction) : "";

                const hasComments = !!checkin.comments?.trim();
                const hasBlockers = !!checkin.blockers?.trim();

                return (
                  <TableRow key={checkin.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                    {/* Data */}
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {format(parseISO(checkin.date), "dd MMM", { locale: ptBR })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {format(parseISO(checkin.date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    {/* Usuário */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={checkin.user?.photo_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getUserInitials(checkin.user?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[120px]">
                          {checkin.user?.display_name || "Usuário"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Valor Anterior */}
                    <TableCell className="text-right text-muted-foreground">
                      {checkin.previous_value !== null
                        ? formatValueWithUnit(checkin.previous_value, unit)
                        : "—"}
                    </TableCell>

                    {/* Valor Atual */}
                    <TableCell className="text-right font-medium">
                      {formatValueWithUnit(checkin.current_value, unit)}
                    </TableCell>

                    {/* Variação */}
                    <TableCell className="text-right">
                      {variation !== null && VariationIcon ? (
                        <div className={cn("flex items-center justify-end gap-1", variationColor)}>
                          <VariationIcon className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">
                            {variation > 0 ? "+" : ""}
                            {formatValueWithUnit(variation, unit)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Confiança */}
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-normal",
                          confidenceConfig[checkin.confidence].className
                        )}
                      >
                        {confidenceConfig[checkin.confidence].label}
                      </Badge>
                    </TableCell>

                    {/* Info (Comentários/Bloqueadores) */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {hasComments && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 hover:bg-muted rounded" type="button">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <p className="text-sm font-medium mb-1">Comentário</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {checkin.comments}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {hasBlockers && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-1 hover:bg-muted rounded" type="button">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <p className="text-sm font-medium mb-1 text-warning">Bloqueador</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {checkin.blockers}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!hasComments && !hasBlockers && (
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
