import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { DiagnosticsSloCard } from '@/components/hub/notifications/DiagnosticsSloCard';
import { DiagnosticsHealthAlertsCard } from '@/components/hub/notifications/DiagnosticsHealthAlertsCard';
import type { OutboxStats, NotificationChannelLite, NotificationEventLite } from './constants';

interface DiagnosticsTabProps {
  outboxStats: OutboxStats | undefined;
  statsLoading: boolean;
  channels: NotificationChannelLite[];
  events: NotificationEventLite[];
}

export function DiagnosticsTab({
  outboxStats,
  statsLoading,
  channels,
  events,
}: DiagnosticsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Diagnóstico Global</h2>
        <p className="text-sm text-muted-foreground">
          SLO/SLA, Health Alerts e métricas do sistema de notificações
        </p>
      </div>

      <DiagnosticsSloCard />
      <DiagnosticsHealthAlertsCard />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Outbox</CardDescription>
            <CardTitle className="text-2xl">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.total || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Notificações processadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes
            </CardDescription>
            <CardTitle className="text-2xl text-warning">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.pending || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aguardando processamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Enviadas
            </CardDescription>
            <CardTitle className="text-2xl text-success">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.sent || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Entregues com sucesso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Falhas
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.failed || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Erros de entrega</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Canais ativos</span>
            <Badge variant="secondary">
              {channels.filter((c) => c.status === 'active').length}/{channels.length}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm">Eventos cadastrados</span>
            <Badge variant="secondary">{events.length}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm">Última notificação enviada</span>
            <span className="text-sm text-muted-foreground">
              {outboxStats?.lastProcessed
                ? new Date(outboxStats.lastProcessed).toLocaleString('pt-BR')
                : 'Nenhuma'}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm">Taxa de sucesso</span>
            <span className="text-sm font-medium">
              {outboxStats && outboxStats.total > 0
                ? `${Math.round((outboxStats.sent / outboxStats.total) * 100)}%`
                : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
