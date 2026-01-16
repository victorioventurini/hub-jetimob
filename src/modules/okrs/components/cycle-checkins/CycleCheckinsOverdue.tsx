/**
 * CycleCheckinsOverdue - Lista de KRs sem check-in dentro do SLA
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { type OverdueKr, formatDaysSince } from "../../hooks";
import { KrHistoryDialog } from '../KrHistoryDialog';
import { cn } from '@/lib/utils';
import { RAG_STATUS_COLORS } from '@/lib/colors';

interface CycleCheckinsOverdueProps {
  overdueKrs: OverdueKr[];
  isLoading: boolean;
}

const statusColors = {
  green: RAG_STATUS_COLORS.green.dot,
  yellow: RAG_STATUS_COLORS.yellow.dot,
  red: RAG_STATUS_COLORS.red.dot,
  not_started: RAG_STATUS_COLORS.not_started.dot,
};

const statusLabels = {
  green: 'No caminho',
  yellow: 'Em risco',
  red: 'Atrasado',
  not_started: 'Não iniciado',
};

export function CycleCheckinsOverdue({ 
  overdueKrs, 
  isLoading,
}: CycleCheckinsOverdueProps) {
  const [selectedKr, setSelectedKr] = useState<{
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
  } | null>(null);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (overdueKrs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-status-green mb-4" />
          <h3 className="text-lg font-medium mb-2">Todos os KRs em dia!</h3>
          <p className="text-muted-foreground text-sm">
            Não há KRs com check-ins atrasados neste ciclo.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <div className="bg-status-yellow-muted dark:bg-status-yellow-muted/30 border border-status-yellow/30 dark:border-status-yellow/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-yellow shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-status-yellow-muted-foreground">
              {overdueKrs.length} KR{overdueKrs.length !== 1 ? 's' : ''} sem check-in recente
            </h4>
            <p className="text-sm text-status-yellow-muted-foreground/80 mt-1">
              Os KRs abaixo não receberam check-in nos últimos 7 dias.
            </p>
          </div>
        </div>
      </div>
      
      {/* Overdue KRs List */}
      {overdueKrs.map((kr) => (
        <Card key={kr.kr_id} className="hover:bg-muted/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Owner Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={kr.owner_photo || undefined} />
                <AvatarFallback>
                  {kr.owner_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* KR Title with status dot */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", statusColors[kr.status])} />
                  <button 
                    onClick={() => setSelectedKr({
                      id: kr.kr_id,
                      title: kr.kr_title,
                      baseline: 0,
                      current_value: 0,
                      target: 100,
                      unit: '%',
                      direction: 'up',
                      status: kr.status,
                      type: 'contribution',
                      team_name: kr.team_name,
                    })}
                    className="text-sm font-medium hover:underline text-left truncate"
                  >
                    {kr.kr_title}
                  </button>
                </div>
                
                {/* Team & Owner */}
                <div className="text-xs text-muted-foreground mt-1">
                  {kr.team_name} • {kr.owner_name || 'Sem responsável'}
                </div>
                
                {/* Status & Last Check-in */}
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className={cn(
                    "text-xs",
                    kr.status === 'red' && RAG_STATUS_COLORS.red.badge,
                    kr.status === 'yellow' && RAG_STATUS_COLORS.yellow.badge,
                    kr.status === 'green' && RAG_STATUS_COLORS.green.badge,
                  )}>
                    {statusLabels[kr.status]}
                  </Badge>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {kr.last_checkin_at 
                        ? `Último check-in ${formatDaysSince(kr.days_since_checkin)}`
                        : 'Nunca teve check-in'
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKr({
                  id: kr.kr_id,
                  title: kr.kr_title,
                  baseline: 0,
                  current_value: 0,
                  target: 100,
                  unit: '%',
                  direction: 'up',
                  status: kr.status,
                  type: 'contribution',
                  team_name: kr.team_name,
                })}
                className="shrink-0"
              >
                <History className="h-4 w-4 mr-1.5" />
                Histórico
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* KR History Dialog */}
      <KrHistoryDialog
        open={!!selectedKr}
        onOpenChange={(open) => !open && setSelectedKr(null)}
        kr={selectedKr}
      />
    </div>
  );
}
