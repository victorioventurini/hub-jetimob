import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';

interface SloChannelData {
  bu_id: string;
  channel_slug: string;
  total: number;
  total_success: number;
  total_failed: number;
  pending_count: number;
  success_rate: number;
  avg_delivery_time_ms: number;
  slo_compliant: boolean;
}

interface SloEventData {
  bu_id: string;
  event_slug: string;
  day: string;
  total: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
}

export function DiagnosticsSloCard() {
  // SLO Summary (7 days)
  const { data: sloSummary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.notifications.sloSummary(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_notification_slo_summary_7d' as any)
        .select('bu_id, channel_slug, total, total_success, total_failed, pending_count, success_rate, avg_delivery_time_ms, slo_compliant');
      
      if (error) throw error;
      return (data as unknown as SloChannelData[]) || [];
    },
  });

  // Worst performing events (last 7 days aggregated)
  const { data: worstEvents, isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.notifications.sloByEvent('7d'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_notification_slo_by_event_daily' as any)
        .select('bu_id, event_slug, day, total, total_success, total_failed, success_rate')
        .order('success_rate', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      
      // Aggregate by event_slug
      const byEvent: Record<string, { event_slug: string; total: number; failed: number; success_rate: number }> = {};
      for (const row of (data as unknown as SloEventData[]) || []) {
        if (!byEvent[row.event_slug]) {
          byEvent[row.event_slug] = { event_slug: row.event_slug, total: 0, failed: 0, success_rate: 0 };
        }
        byEvent[row.event_slug].total += Number(row.total);
        byEvent[row.event_slug].failed += Number(row.total_failed);
      }
      
      // Calculate aggregated success rate
      const aggregated = Object.values(byEvent).map(e => ({
        ...e,
        success_rate: e.total > 0 ? Math.round(((e.total - e.failed) / e.total) * 100 * 100) / 100 : 0,
      }));
      
      // Sort by success_rate ascending and take top 10 worst
      return aggregated.sort((a, b) => a.success_rate - b.success_rate).slice(0, 10);
    },
  });

  const isLoading = summaryLoading || eventsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            SLO / SLA (últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const channelData = sloSummary || [];
  const hasData = channelData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          SLO / SLA (últimos 7 dias)
        </CardTitle>
        <CardDescription>
          Métricas de confiabilidade por canal e evento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Per Channel Summary */}
        <div>
          <h4 className="text-sm font-medium mb-2">Por Canal</h4>
          {!hasData ? (
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Sucesso</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                  <TableHead className="text-center">SLO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelData.map((row, idx) => {
                  const isCompliant = row.slo_compliant;
                  const hasFailures = Number(row.total_failed) > 0;
                  
                  return (
                    <TableRow key={`${row.channel_slug}-${idx}`}>
                      <TableCell className="font-medium capitalize">{row.channel_slug}</TableCell>
                      <TableCell className="text-center">{row.total}</TableCell>
                      <TableCell className="text-center text-green-600">{row.total_success}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={hasFailures ? 'destructive' : 'outline'}>
                          {row.total_failed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'font-medium',
                          Number(row.success_rate) >= 99 ? 'text-success' :
                          Number(row.success_rate) >= 95 ? 'text-warning' : 'text-destructive'
                        )}>
                          {row.success_rate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {row.avg_delivery_time_ms ? `${Math.round(Number(row.avg_delivery_time_ms))}ms` : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompliant ? (
                          <CheckCircle className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Worst Performing Events */}
        {worstEvents && worstEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Eventos com Pior Performance
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worstEvents.filter(e => e.failed > 0).slice(0, 5).map((event, idx) => (
                  <TableRow key={`${event.event_slug}-${idx}`}>
                    <TableCell className="font-mono text-xs">{event.event_slug}</TableCell>
                    <TableCell className="text-center">{event.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{event.failed}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'font-medium',
                        event.success_rate >= 99 ? 'text-success' :
                        event.success_rate >= 95 ? 'text-warning' : 'text-destructive'
                      )}>
                        {event.success_rate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
