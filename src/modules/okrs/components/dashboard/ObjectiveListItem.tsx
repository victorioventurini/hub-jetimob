import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateProgress, OkrDirection, OkrRagStatus } from '../../types';
import { STATUS_CONFIG, mapRagToCalculated } from '../../hooks/useOkrStatus';

interface KeyResult {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  unit: string;
  direction: OkrDirection;
  status: OkrRagStatus;
  updated_at: string;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  } | null;
}

interface Objective {
  id: string;
  title: string;
  description?: string | null;
  year: number;
  status: string;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  } | null;
  key_results?: KeyResult[];
}

interface ObjectiveListItemProps {
  objective: Objective;
  keyResults?: KeyResult[];
  isLoading?: boolean;
}

export function ObjectiveListItem({ objective, keyResults = [], isLoading }: ObjectiveListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { progress, status, krCount } = useMemo(() => {
    if (!keyResults || keyResults.length === 0) {
      return { progress: 0, status: 'not_started' as const, krCount: 0 };
    }

    const totalProgress = keyResults.reduce((acc, kr) => {
      return acc + calculateProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || 'up'
      );
    }, 0);

    const avgProgress = totalProgress / keyResults.length;
    
    // Determine overall status based on KR statuses
    const redCount = keyResults.filter(kr => kr.status === 'red').length;
    const yellowCount = keyResults.filter(kr => kr.status === 'yellow').length;
    
    let overallStatus: 'on_track' | 'at_risk' | 'off_track' | 'not_started' = 'on_track';
    if (redCount > 0) {
      overallStatus = 'off_track';
    } else if (yellowCount > 0) {
      overallStatus = 'at_risk';
    }
    
    if (avgProgress >= 100) {
      overallStatus = 'on_track';
    }

    return { 
      progress: avgProgress, 
      status: overallStatus,
      krCount: keyResults.length
    };
  }, [keyResults]);

  const statusConfig = STATUS_CONFIG[status];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-1 ring-border shadow-md"
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <ChevronRight className={cn(
                "w-4 h-4 mt-1 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium leading-snug truncate">
                      {objective.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{objective.year}</span>
                      <span>•</span>
                      <span>{krCount} KRs</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs font-medium", statusConfig.color, statusConfig.borderColor)}
                    >
                      {statusConfig.label}
                    </Badge>
                    
                    {objective.owner && (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={objective.owner.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {objective.owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-sm font-medium w-12 text-right">
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t bg-muted/20">
            {keyResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No Key Results yet
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {keyResults.map((kr) => (
                  <KeyResultRow key={kr.id} kr={kr} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function KeyResultRow({ kr }: { kr: KeyResult }) {
  const progress = calculateProgress(
    Number(kr.baseline) || 0,
    Number(kr.current_value) || 0,
    Number(kr.target) || 0,
    kr.direction || 'up'
  );
  
  const calculatedStatus = mapRagToCalculated(kr.status);
  const statusConfig = STATUS_CONFIG[calculatedStatus];

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value}%`;
    if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
    if (unit === '$') return `$ ${value.toLocaleString('en-US')}`;
    return `${value} ${unit}`;
  };

  return (
    <div className="px-4 py-3 pl-11">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{kr.title}</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
            <span>•</span>
            <span>
              {formatValue(kr.current_value, kr.unit)} / {formatValue(kr.target, kr.unit)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 w-24">
            <Progress 
              value={progress} 
              className="h-1.5 flex-1" 
            />
            <span className="text-xs font-medium w-8 text-right">
              {progress.toFixed(0)}%
            </span>
          </div>
          
          {kr.owner ? (
            <Avatar className="w-5 h-5">
              <AvatarImage src={kr.owner.photo_url || undefined} />
              <AvatarFallback className="text-[8px]">
                {kr.owner.display_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
