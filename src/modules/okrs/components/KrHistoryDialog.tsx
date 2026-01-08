import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  User,
  Calendar,
  ArrowRight,
  MessageSquare,
  ChartLine,
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
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  not_started: 'bg-muted-foreground',
};

const statusLabels = {
  green: 'No caminho',
  yellow: 'Em risco',
  red: 'Atrasado',
  not_started: 'Não iniciado',
};

const confidenceColors = {
  high: 'text-green-600 bg-green-100 dark:bg-green-950',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
  low: 'text-red-600 bg-red-100 dark:bg-red-950',
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

            {/* History Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Histórico de Check-ins
                {historyData?.totalCheckins ? (
                  <Badge variant="secondary" className="text-xs">
                    {historyData.totalCheckins}
                  </Badge>
                ) : null}
              </h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !historyData?.checkins?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum check-in registrado ainda.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[100px]">Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="w-[80px]">Confiança</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead className="w-[120px]">Usuário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.checkins.map((checkin, index) => (
                        <TableRow key={checkin.id}>
                          <TableCell className="text-xs">
                            {format(parseISO(checkin.date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              {checkin.previous_value !== null && (
                                <>
                                  <span className="text-muted-foreground">
                                    {formatValueWithUnit(checkin.previous_value, kr.unit)}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              )}
                              <span className="font-medium">
                                {formatValueWithUnit(checkin.current_value, kr.unit)}
                              </span>
                              {index === 0 && (
                                <Badge variant="outline" className="text-[10px] ml-1">atual</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px]", confidenceColors[checkin.confidence])}
                            >
                              {confidenceLabels[checkin.confidence]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {checkin.comments ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help max-w-[150px]">
                                    <MessageSquare className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{checkin.comments}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  {checkin.comments}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {checkin.user ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={checkin.user.photo_url || undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {checkin.user.display_name
                                      .split(' ')
                                      .map(n => n[0])
                                      .slice(0, 2)
                                      .join('')
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate max-w-[80px]">
                                  {checkin.user.display_name.split(' ')[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
