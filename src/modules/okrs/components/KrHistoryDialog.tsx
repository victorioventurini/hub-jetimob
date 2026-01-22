import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ChartLine,
  ExternalLink,
  Table as TableIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useKrHistory } from "../hooks";
import { KrEvolutionChart } from "./KrEvolutionChart";
import { KrCheckinsTable } from "./KrCheckinsTable";
import { formatValueWithUnit } from "../constants/krUnits";
import { cn } from "@/lib/utils";
import type { OkrDirection } from "../types";

interface KrData {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: OkrDirection;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  type: 'contribution' | 'enabler' | 'foundational';
  owner_name?: string | null;
  owner_photo?: string | null;
  team_name?: string;
  objective_title?: string;
}

interface KrHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: KrData | null;
}

const statusColors = {
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
  not_started: 'bg-status-gray',
};

const statusLabels = {
  green: 'No caminho',
  yellow: 'Em risco',
  red: 'Atrasado',
  not_started: 'Não iniciado',
};

const typeLabels = {
  contribution: 'Contribuição',
  enabler: 'Habilitador',
  foundational: 'Fundacional',
};

const directionLabels: Record<OkrDirection, string> = {
  up: '↑ Maior é melhor',
  down: '↓ Menor é melhor',
  maintain: '= Manter valor',
};

export function KrHistoryDialog({ open, onOpenChange, kr }: KrHistoryDialogProps) {
  const { data: historyData, isLoading } = useKrHistory(kr?.id);

  if (!kr) return null;

  const progress = kr.target !== kr.baseline
    ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100))
    : kr.direction === 'maintain' && kr.current_value >= kr.target
      ? 100
      : 0;

  const ownerInitials = kr.owner_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const TrendIcon = historyData?.trend === 'up' ? TrendingUp : historyData?.trend === 'down' ? TrendingDown : Minus;
  
  const getTrendColor = () => {
    if (kr.direction === 'maintain') return 'text-muted-foreground';
    if (kr.direction === 'up') {
      return historyData?.trend === 'up' ? 'text-success' : historyData?.trend === 'down' ? 'text-danger' : 'text-muted-foreground';
    }
    return historyData?.trend === 'down' ? 'text-success' : historyData?.trend === 'up' ? 'text-danger' : 'text-muted-foreground';
  };
  
  const trendColor = getTrendColor();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3">
          {/* Header with title and badges */}
          <div className="flex items-start gap-3">
            <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", statusColors[kr.status])} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight pr-8">
                {kr.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {typeLabels[kr.type]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {statusLabels[kr.status]}
                </Badge>
                {kr.team_name && (
                  <span className="text-xs text-muted-foreground">• {kr.team_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Current value and trend */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Valor atual</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">
                  {formatValueWithUnit(kr.current_value, kr.unit)}
                </span>
                {historyData && (
                  <>
                    <TrendIcon className={cn("w-5 h-5", trendColor)} />
                    {historyData.variation !== null && (
                      <span className={cn("text-sm font-medium", trendColor)}>
                        {historyData.variation > 0 ? '+' : ''}{historyData.variation.toFixed(1)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                Meta
              </div>
              <span className="text-lg font-semibold">
                {formatValueWithUnit(kr.target, kr.unit)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Base: {formatValueWithUnit(kr.baseline, kr.unit)}</span>
              <span>{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {kr.owner_name && (
              <div className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={kr.owner_photo || undefined} />
                  <AvatarFallback className="text-[9px]">{ownerInitials}</AvatarFallback>
                </Avatar>
                <span>{kr.owner_name}</span>
              </div>
            )}
            {kr.objective_title && (
              <div className="flex items-center gap-1">
                <span className="truncate max-w-[200px]">{kr.objective_title}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>Direção: {directionLabels[kr.direction]}</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart" className="gap-2">
                  <ChartLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Evolução</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico Completo</span>
                  {historyData?.totalCheckins ? (
                    <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                      {historyData.totalCheckins}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : historyData?.checkins?.length ? (
                  <KrEvolutionChart
                    checkins={historyData.checkins}
                    baseline={kr.baseline}
                    target={kr.target}
                    unit={kr.unit}
                    direction={kr.direction}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ChartLine className="h-12 w-12 opacity-30 mb-3" />
                    <p className="text-sm">Nenhum check-in registrado ainda.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="table" className="mt-4">
                <KrCheckinsTable
                  checkins={historyData?.checkins || []}
                  unit={kr.unit}
                  direction={kr.direction}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>

            {/* Link to context page (optional) */}
            {historyData?.checkins?.length ? (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link to={`/okrs/checkins?q=${encodeURIComponent(kr.title)}`}>
                    Ver no contexto do ciclo
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
