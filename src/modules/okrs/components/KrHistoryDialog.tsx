import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  User,
  Calendar,
  ArrowRight,
  ChartLine,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useKrHistory } from "../hooks/useKrHistory";
import { KrEvolutionChart } from "./KrEvolutionChart";
import { formatValueWithUnit } from "../constants/krUnits";
import { cn } from "@/lib/utils";

interface KrData {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: 'up' | 'down';
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

const confidenceColors = {
  high: 'text-status-green-muted-foreground bg-status-green-muted',
  medium: 'text-status-yellow-muted-foreground bg-status-yellow-muted',
  low: 'text-status-red-muted-foreground bg-status-red-muted',
};

const confidenceLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const typeLabels = {
  contribution: 'Contribuição',
  enabler: 'Habilitador',
  foundational: 'Fundacional',
};

export function KrHistoryDialog({ open, onOpenChange, kr }: KrHistoryDialogProps) {
  const { data: historyData, isLoading } = useKrHistory(kr?.id);

  if (!kr) return null;

  const progress = kr.target !== kr.baseline
    ? Math.min(100, Math.max(0, ((kr.current_value - kr.baseline) / (kr.target - kr.baseline)) * 100))
    : 0;

  const ownerInitials = kr.owner_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const TrendIcon = historyData?.trend === 'up' ? TrendingUp : historyData?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = kr.direction === 'up'
    ? historyData?.trend === 'up' ? 'text-green-500' : historyData?.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
    : historyData?.trend === 'down' ? 'text-green-500' : historyData?.trend === 'up' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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
              <span>Direção: {kr.direction === 'up' ? '↑ Maior é melhor' : '↓ Menor é melhor'}</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Evolution Chart */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ChartLine className="w-4 h-4" />
                Evolução
              </h3>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : historyData?.checkins ? (
                <KrEvolutionChart
                  checkins={historyData.checkins}
                  baseline={kr.baseline}
                  target={kr.target}
                  unit={kr.unit}
                  direction={kr.direction}
                />
              ) : null}
            </div>

            {/* Link to Full Check-ins Page */}
            {historyData?.checkins?.length ? (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link to={`/okrs/checkins?q=${encodeURIComponent(kr.title)}`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver histórico completo de check-ins
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {historyData.totalCheckins}
                    </Badge>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm border-t">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nenhum check-in registrado ainda.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
