import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, Users, Target, Clock, ArrowRight } from 'lucide-react';
import { usePendingCheckins, useTeamPendingCheckins } from '../hooks/usePendingCheckins';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface OkrAlertsCardProps {
  teamId?: string;
  isLeader?: boolean;
  className?: string;
}

export function OkrAlertsCard({ teamId, isLeader = false, className }: OkrAlertsCardProps) {
  const { data: myPendingCheckins } = usePendingCheckins();
  const { data: teamPendingCheckins } = useTeamPendingCheckins(isLeader ? teamId : undefined);
  const { profile } = useAuth();

  const alerts: Alert[] = [];

  // User-level alerts
  const myOverdue = myPendingCheckins?.filter(c => c.is_overdue) || [];
  if (myOverdue.length > 0) {
    alerts.push({
      id: 'my-overdue',
      type: 'error',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: `${myOverdue.length} KR${myOverdue.length > 1 ? 's' : ''} sem check-in`,
      description: 'Você tem Key Results que precisam de atualização urgente',
    });
  }

  const myNeverUpdated = myPendingCheckins?.filter(c => !c.last_checkin_at) || [];
  if (myNeverUpdated.length > 0 && myNeverUpdated.length !== myOverdue.length) {
    alerts.push({
      id: 'never-updated',
      type: 'warning',
      icon: <Clock className="h-4 w-4" />,
      title: `${myNeverUpdated.length} KR${myNeverUpdated.length > 1 ? 's' : ''} nunca atualizado${myNeverUpdated.length > 1 ? 's' : ''}`,
      description: 'Inicie o acompanhamento registrando o primeiro check-in',
    });
  }

  // Team-level alerts (for leaders)
  if (isLeader && teamPendingCheckins) {
    const teamOverdue = teamPendingCheckins.filter(c => c.is_overdue);
    const uniqueOwners = new Set(teamOverdue.map(c => c.owner_user_id).filter(Boolean));
    
    if (uniqueOwners.size > 0) {
      alerts.push({
        id: 'team-members-overdue',
        type: 'warning',
        icon: <Users className="h-4 w-4" />,
        title: `${uniqueOwners.size} membro${uniqueOwners.size > 1 ? 's' : ''} com check-in atrasado`,
        description: 'Membros do time precisam atualizar seus OKRs',
      });
    }

    // Check for KRs at risk (yellow status)
    const atRiskKrs = teamPendingCheckins.filter(c => c.status === 'yellow');
    if (atRiskKrs.length > 0) {
      alerts.push({
        id: 'team-at-risk',
        type: 'warning',
        icon: <Target className="h-4 w-4" />,
        title: `${atRiskKrs.length} KR${atRiskKrs.length > 1 ? 's' : ''} em risco`,
        description: 'Key Results que precisam de atenção para voltar ao caminho',
      });
    }

    // Check for KRs off track (red status)
    const offTrackKrs = teamPendingCheckins.filter(c => c.status === 'red');
    if (offTrackKrs.length > 0) {
      alerts.push({
        id: 'team-off-track',
        type: 'error',
        icon: <AlertCircle className="h-4 w-4" />,
        title: `${offTrackKrs.length} KR${offTrackKrs.length > 1 ? 's' : ''} fora do caminho`,
        description: 'Key Results que provavelmente não serão atingidos sem intervenção',
      });
    }
  }

  // No alerts
  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'info':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
    }
  };

  return (
    <Card className={cn('animate-fade-in', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertas
          <Badge variant="secondary" className="ml-1">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              getAlertStyles(alert.type)
            )}
          >
            <div className="mt-0.5 shrink-0">{alert.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs opacity-80">{alert.description}</p>
            </div>
          </div>
        ))}
        
        {/* Link to Check-ins Page */}
        {isLeader && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/okrs/checkins">
              Ver todos os check-ins
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
