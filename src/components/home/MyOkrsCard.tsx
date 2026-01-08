import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, RefreshCw, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { usePendingCheckins, getDayName } from '@/modules/okrs/hooks/usePendingCheckins';
import { CheckinDialog } from '@/modules/okrs/components/CheckinDialog';
import { OkrProgressBar } from '@/modules/okrs/components/OkrProgressBar';
import { cn } from '@/lib/utils';

export function MyOkrsCard() {
  const { data: pendingCheckins, isLoading } = usePendingCheckins();
  
  const [selectedKr, setSelectedKr] = useState<any>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);

  // Sort: overdue first, then by days since check-in
  const sortedCheckins = [...(pendingCheckins || [])].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    return (b.days_since_checkin || 999) - (a.days_since_checkin || 999);
  });

  // Take top 3 for display
  const displayCheckins = sortedCheckins.slice(0, 3);
  const overdueCount = pendingCheckins?.filter(c => c.is_overdue).length || 0;
  const totalCount = pendingCheckins?.length || 0;

  const handleCheckin = (kr: any) => {
    setSelectedKr({
      id: kr.kr_id,
      title: kr.kr_title,
      baseline: kr.baseline,
      current_value: kr.current_value,
      target: kr.target,
      direction: kr.direction,
      unit: kr.unit,
      status: kr.status,
      team_id: kr.team_id,
      is_shared: kr.is_shared,
      team_name: kr.team_name,
    });
    setCheckinOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingCheckins || pendingCheckins.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Target className="h-4 w-4 text-primary" />
            Meus OKRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Todos os seus OKRs estão em dia!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Target className="h-4 w-4 text-primary" />
              Meus OKRs
              {overdueCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {overdueCount} pendente{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Link to="/okrs">
                Ver todos
                <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayCheckins.map((kr) => (
            <div
              key={kr.kr_id}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                kr.is_overdue
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border/50 bg-muted/30 hover:bg-muted/50'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{kr.kr_title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {kr.team_name} • {kr.objective_title}
                  </p>
                </div>
                {kr.is_overdue ? (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atrasado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {getDayName(kr.checkin_day)}
                  </Badge>
                )}
              </div>

              <div className="mb-2">
                <OkrProgressBar
                  baseline={kr.baseline}
                  current={kr.current_value}
                  target={kr.target}
                  direction={kr.direction}
                  status={kr.status}
                  unit={kr.unit}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {kr.last_checkin_at ? (
                    <>
                      Último check-in:{' '}
                      {kr.days_since_checkin !== null
                        ? `há ${kr.days_since_checkin} dia${kr.days_since_checkin !== 1 ? 's' : ''}`
                        : 'hoje'}
                    </>
                  ) : (
                    <span className="text-amber-600">Nunca atualizado</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={kr.is_overdue ? 'default' : 'outline'}
                  className="h-7 text-xs gap-1"
                  onClick={() => handleCheckin(kr)}
                >
                  <RefreshCw className="h-3 w-3" />
                  Check-in
                </Button>
              </div>
            </div>
          ))}

          {totalCount > 3 && (
            <Button
              asChild
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
            >
              <Link to="/okrs">
                +{totalCount - 3} outros OKRs
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Checkin Dialog */}
      {selectedKr && (
        <CheckinDialog
          open={checkinOpen}
          onOpenChange={setCheckinOpen}
          kr={selectedKr}
        />
      )}
    </>
  );
}
