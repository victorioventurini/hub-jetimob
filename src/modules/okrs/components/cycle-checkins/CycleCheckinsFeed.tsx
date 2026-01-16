/**
 * CycleCheckinsFeed - Feed cronológico de check-ins
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type CheckinFeedItem } from "../../hooks";
import { KrHistoryDialog } from '../KrHistoryDialog';
import { cn } from '@/lib/utils';
import { CONFIDENCE_COLORS, RAG_STATUS_COLORS } from '@/lib/colors';
import { CycleCheckinsViewToggle, type CheckinsViewMode } from './CycleCheckinsViewToggle';
import { CycleCheckinsTable } from './CycleCheckinsTable';
import { CycleCheckinsEvolution } from './CycleCheckinsEvolution';

export type { CheckinsViewMode };

interface CycleCheckinsFeedProps {
  checkins: CheckinFeedItem[];
  isLoading: boolean;
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  onPageChange: (page: number) => void;
  viewMode?: CheckinsViewMode;
  onViewModeChange?: (mode: CheckinsViewMode) => void;
}

const confidenceLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export function CycleCheckinsFeed({ 
  checkins, 
  isLoading, 
  pagination,
  onPageChange,
  viewMode = 'cards',
  onViewModeChange,
}: CycleCheckinsFeedProps) {
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
    objective_title?: string;
  } | null>(null);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header with toggle */}
        {onViewModeChange && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Carregando...</span>
            <CycleCheckinsViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
          </div>
        )}
        {viewMode === 'table' ? (
          <CycleCheckinsTable checkins={[]} isLoading={true} onKrClick={() => {}} />
        ) : (
          [...Array(5)].map((_, i) => (
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
          ))
        )}
      </div>
    );
  }
  
  if (checkins.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header with toggle */}
        {onViewModeChange && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">0 check-ins</span>
            <CycleCheckinsViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
          </div>
        )}
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum check-in encontrado</h3>
            <p className="text-muted-foreground text-sm">
              Não há check-ins que correspondam aos filtros selecionados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header with count and toggle */}
      {onViewModeChange && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {pagination?.total ?? checkins.length} check-ins
          </span>
          <CycleCheckinsViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
      )}
      
      {/* Conditional content: Evolution, Table or Cards */}
      {viewMode === 'evolution' ? (
        <CycleCheckinsEvolution 
          checkins={checkins} 
          isLoading={false}
        />
      ) : viewMode === 'table' ? (
        <CycleCheckinsTable 
          checkins={checkins} 
          isLoading={false} 
          onKrClick={setSelectedKr}
        />
      ) : (
        /* Cards view */
        checkins.map((checkin) => {
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
            <Card key={checkin.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={checkin.user_photo || undefined} />
                    <AvatarFallback>
                      {checkin.user_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header: User & Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{checkin.user_name || 'Usuário'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {format(parseISO(checkin.created_at), "d MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    {/* KR Title with status dot */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", RAG_STATUS_COLORS[checkin.kr_status]?.dot)} />
                      <button 
                        onClick={() => setSelectedKr({
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
                        className="text-sm font-medium hover:underline text-left truncate"
                      >
                        {checkin.kr_title}
                      </button>
                    </div>
                    
                    {/* Objective & Team */}
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {checkin.objective_title} • {checkin.team_name}
                    </div>
                    
                    {/* Value & Confidence */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-mono font-medium">{checkin.current_value}</span>
                        {TrendIcon && (
                          <span className={cn("flex items-center gap-0.5", trendColor)}>
                            <TrendIcon className="h-3.5 w-3.5" />
                            {valueDiff !== null && valueDiff !== 0 && (
                              <span className="text-xs">
                                {valueDiff > 0 ? '+' : ''}{valueDiff}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className={cn("text-xs", CONFIDENCE_COLORS[checkin.confidence]?.badge)}>
                        {confidenceLabels[checkin.confidence]}
                      </Badge>
                    </div>
                    
                    {/* Comments/Blockers */}
                    {(checkin.comments || checkin.blockers) && (
                      <div className="mt-2 space-y-1">
                        {checkin.comments && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{checkin.comments}</span>
                          </div>
                        )}
                        {checkin.blockers && (
                          <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{checkin.blockers}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedKr({
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
                    className="shrink-0"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
      
      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.total_pages} ({pagination.total} check-ins)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* KR History Dialog */}
      <KrHistoryDialog
        open={!!selectedKr}
        onOpenChange={(open) => !open && setSelectedKr(null)}
        kr={selectedKr}
      />
    </div>
  );
}
