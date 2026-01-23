import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Clock, 
  Book,
  ThumbsUp,
  X,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HealthAlert {
  id: string;
  bu_id: string;
  alert_type: string;
  severity: string;
  detected_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  last_notified_at: string | null;
  cooldown_minutes: number;
  escalation_level: string;
  consecutive_occurrences: number;
}

interface Runbook {
  id: string;
  alert_type: string;
  severity: string;
  markdown_content: string;
}

const severityConfig = {
  info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-muted' },
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const alertTypeLabels: Record<string, string> = {
  outbox_backlog: 'Fila Acumulada',
  high_failure_rate: 'Alta Taxa de Falhas',
  channel_down: 'Canal Fora do Ar',
  event_disabled_mandatory: 'Evento Obrigatório Desabilitado',
};

export function DiagnosticsHealthAlertsCard() {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<HealthAlert | null>(null);
  const [runbookAlert, setRunbookAlert] = useState<HealthAlert | null>(null);
  const [ackNotes, setAckNotes] = useState('');

  // Health alerts query
  const { data: healthAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.notifications.healthAlerts(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_health_alerts' as any)
        .select('id, bu_id, alert_type, severity, detected_at, resolved_at, metadata, is_active, last_notified_at, cooldown_minutes, escalation_level, consecutive_occurrences')
        .order('detected_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data as unknown as HealthAlert[]) || [];
    },
  });

  // Runbooks query
  const { data: runbooks = [] } = useQuery({
    queryKey: queryKeys.notifications.healthRunbooks(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_health_runbooks' as any)
        .select('id, alert_type, severity, markdown_content');
      
      if (error) throw error;
      return (data as unknown as Runbook[]) || [];
    },
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { error } = await supabase.rpc('acknowledge_health_alert', {
        p_alert_id: alertId,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.healthAlerts(), refetchType: 'active' });
      setSelectedAlert(null);
      setAckNotes('');
      toast.success('Alerta reconhecido');
    },
    onError: (error) => {
      toast.error('Erro ao reconhecer alerta', { description: error.message });
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { error } = await supabase.rpc('resolve_health_alert', {
        p_alert_id: alertId,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.healthAlerts(), refetchType: 'active' });
      setSelectedAlert(null);
      setAckNotes('');
      toast.success('Alerta resolvido');
    },
    onError: (error) => {
      toast.error('Erro ao resolver alerta', { description: error.message });
    },
  });

  const activeAlerts = healthAlerts.filter(a => a.is_active);
  const recentResolvedAlerts = healthAlerts.filter(a => !a.is_active && 
    new Date(a.resolved_at || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const getRunbook = (alertType: string) => runbooks.find(r => r.alert_type === alertType);

  const getCooldownRemaining = (alert: HealthAlert) => {
    if (!alert.last_notified_at) return null;
    const lastNotified = new Date(alert.last_notified_at).getTime();
    const cooldownMs = alert.cooldown_minutes * 60 * 1000;
    const remaining = (lastNotified + cooldownMs) - Date.now();
    if (remaining <= 0) return null;
    return Math.ceil(remaining / 60000); // minutes
  };

  if (alertsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Health Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Health Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="destructive">{activeAlerts.length} ativo(s)</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Alertas de saúde do sistema de notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeAlerts.length === 0 && recentResolvedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum alerta ativo</p>
            </div>
          ) : (
            <>
              {/* Active Alerts */}
              {activeAlerts.map(alert => {
                const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
                const SeverityIcon = config.icon;
                const cooldownRemaining = getCooldownRemaining(alert);
                const runbook = getRunbook(alert.alert_type);
                
                return (
                  <div 
                    key={alert.id} 
                    className={cn('p-4 rounded-lg border', config.bg)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <SeverityIcon className={cn('h-5 w-5 mt-0.5', config.color)} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {alertTypeLabels[alert.alert_type] || alert.alert_type}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {alert.escalation_level}
                            </Badge>
                            {alert.consecutive_occurrences > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                x{alert.consecutive_occurrences}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Detectado {formatDistanceToNow(new Date(alert.detected_at), { locale: ptBR, addSuffix: true })}
                          </p>
                          {cooldownRemaining && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              Próxima notificação em {cooldownRemaining}min
                            </div>
                          )}
                          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {alert.metadata.channel_slug && (
                                <span className="mr-3">Canal: <strong>{String(alert.metadata.channel_slug)}</strong></span>
                              )}
                              {alert.metadata.pending_count && (
                                <span className="mr-3">Pendentes: <strong>{String(alert.metadata.pending_count)}</strong></span>
                              )}
                              {alert.metadata.failure_rate_pct && (
                                <span>Taxa de falha: <strong>{String(alert.metadata.failure_rate_pct)}%</strong></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {runbook && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRunbookAlert(alert)}
                          >
                            <Book className="h-4 w-4 mr-1" />
                            Como resolver
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Ações
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Recent Resolved */}
              {recentResolvedAlerts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Resolvidos recentemente
                    </h4>
                    {recentResolvedAlerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>{alertTypeLabels[alert.alert_type] || alert.alert_type}</span>
                        <span>•</span>
                        <span>
                          Resolvido {formatDistanceToNow(new Date(alert.resolved_at!), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ações do Alerta</DialogTitle>
            <DialogDescription>
              {selectedAlert && (alertTypeLabels[selectedAlert.alert_type] || selectedAlert.alert_type)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione uma observação..."
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedAlert) {
                  acknowledgeMutation.mutate({ alertId: selectedAlert.id, notes: ackNotes });
                }
              }}
              disabled={acknowledgeMutation.isPending}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              Reconhecer
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (selectedAlert) {
                  resolveMutation.mutate({ alertId: selectedAlert.id, notes: ackNotes });
                }
              }}
              disabled={resolveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Runbook Dialog */}
      <Dialog open={!!runbookAlert} onOpenChange={() => setRunbookAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Como Resolver
            </DialogTitle>
            <DialogDescription>
              {runbookAlert && (alertTypeLabels[runbookAlert.alert_type] || runbookAlert.alert_type)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {runbookAlert && getRunbook(runbookAlert.alert_type) && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {getRunbook(runbookAlert.alert_type)?.markdown_content}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunbookAlert(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
