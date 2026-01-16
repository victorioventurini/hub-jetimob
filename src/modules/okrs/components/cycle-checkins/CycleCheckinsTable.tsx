/**
 * CycleCheckinsTable - Visualização em tabela dos check-ins do ciclo
 * 
 * Diferente do KrCheckinsTable que mostra check-ins de uma única KR,
 * este mostra check-ins de múltiplas KRs do ciclo.
 */

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  MessageSquare, 
  AlertTriangle,
  History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type CheckinFeedItem } from "../../hooks";
import { cn } from '@/lib/utils';
import { CONFIDENCE_COLORS, RAG_STATUS_COLORS } from '@/lib/colors';
import { Card, CardContent } from '@/components/ui/card';

interface CycleCheckinsTableProps {
  checkins: CheckinFeedItem[];
  isLoading: boolean;
  onKrClick: (kr: {
    id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    unit: string;
    direction: 'up' | 'down';
    status: 'green' | 'yellow' | 'red' | 'not_started';
    type: 'contribution' | 'enabler' | 'foundational';
    team_name?: string;
    objective_title?: string;
  }) => void;
}

const confidenceLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function getUserInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum check-in encontrado</h3>
        <p className="text-muted-foreground text-sm">
          Não há check-ins que correspondam aos filtros selecionados.
        </p>
      </CardContent>
    </Card>
  );
}

export function CycleCheckinsTable({ 
  checkins, 
  isLoading, 
  onKrClick 
}: CycleCheckinsTableProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (checkins.length === 0) return <EmptyState />;

  return (
    <TooltipProvider>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead className="w-[150px]">Usuário</TableHead>
              <TableHead className="min-w-[200px]">KR</TableHead>
              <TableHead className="w-[160px]">Objetivo</TableHead>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead className="w-[130px]">Valor</TableHead>
              <TableHead className="w-[90px]">Confiança</TableHead>
              <TableHead className="w-[60px] text-center">Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkins.map((checkin) => {
              const valueDiff = checkin.previous_value !== null 
                ? checkin.current_value - checkin.previous_value 
                : null;
              const TrendIcon = valueDiff !== null 
                ? valueDiff > 0 ? TrendingUp : valueDiff < 0 ? TrendingDown : Minus
                : null;
              const trendColor = valueDiff !== null
                ? valueDiff > 0 ? 'text-green-500' : valueDiff < 0 ? 'text-red-500' : 'text-muted-foreground'
                : '';

              return (
                <TableRow key={checkin.id} className="cursor-pointer hover:bg-muted/50">
                  {/* Data */}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(parseISO(checkin.created_at), "dd MMM HH:mm", { locale: ptBR })}
                  </TableCell>

                  {/* Usuário */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={checkin.user_photo || undefined} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(checkin.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-[100px]">
                        {checkin.user_name || 'Usuário'}
                      </span>
                    </div>
                  </TableCell>

                  {/* KR */}
                  <TableCell>
                    <button
                      onClick={() => onKrClick({
                        id: checkin.kr_id,
                        title: checkin.kr_title,
                        baseline: 0,
                        current_value: checkin.current_value,
                        target: 100,
                        unit: '%',
                        direction: 'up',
                        status: checkin.kr_status,
                        type: 'contribution',
                        team_name: checkin.team_name,
                        objective_title: checkin.objective_title,
                      })}
                      className="flex items-center gap-2 text-left hover:underline"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        RAG_STATUS_COLORS[checkin.kr_status]?.dot
                      )} />
                      <span className="text-sm font-medium truncate max-w-[180px]">
                        {checkin.kr_title}
                      </span>
                    </button>
                  </TableCell>

                  {/* Objetivo */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate block max-w-[140px]">
                      {checkin.objective_title}
                    </span>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal truncate max-w-[100px]">
                      {checkin.team_name}
                    </Badge>
                  </TableCell>

                  {/* Valor */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {checkin.previous_value !== null && (
                        <>
                          <span className="text-xs text-muted-foreground font-mono">
                            {checkin.previous_value}
                          </span>
                          <span className="text-muted-foreground">→</span>
                        </>
                      )}
                      <span className="font-mono font-medium text-sm">
                        {checkin.current_value}
                      </span>
                      {TrendIcon && valueDiff !== null && valueDiff !== 0 && (
                        <span className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                          <TrendIcon className="h-3 w-3" />
                          <span>{valueDiff > 0 ? '+' : ''}{valueDiff}</span>
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Confiança */}
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", CONFIDENCE_COLORS[checkin.confidence]?.badge)}
                    >
                      {confidenceLabels[checkin.confidence]}
                    </Badge>
                  </TableCell>

                  {/* Info */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {checkin.comments && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MessageSquare className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs whitespace-pre-wrap">{checkin.comments}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {checkin.blockers && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 text-destructive cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-xs whitespace-pre-wrap text-destructive">{checkin.blockers}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}
