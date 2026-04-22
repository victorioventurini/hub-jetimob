import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bell, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { channelIcons, type OutboxItem, type OutboxStats } from './constants';

interface OutboxTabProps {
  outboxItems: OutboxItem[];
  outboxLoading: boolean;
  outboxStats: OutboxStats | undefined;
}

export function OutboxTab({ outboxItems, outboxLoading, outboxStats }: OutboxTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Histórico de Envios</h2>
          <p className="text-sm text-muted-foreground">Últimas 100 notificações processadas</p>
        </div>
        {outboxStats?.byProvider && Object.keys(outboxStats.byProvider).length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Provedores:</span>
            {Object.entries(outboxStats.byProvider).map(([provider, count]) => (
              <Badge key={provider} variant="outline" className="capitalize">
                {provider}: {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Processado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outboxLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : outboxItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma notificação no outbox
                  </TableCell>
                </TableRow>
              ) : (
                outboxItems.map((item) => {
                  const ChannelIcon = channelIcons[item.channel_slug] || Bell;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.event_slug}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{item.channel_slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.provider ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'capitalize text-xs',
                              item.provider === 'sendgrid' &&
                                'bg-info-muted text-info-muted-foreground',
                              item.provider === 'resend' &&
                                'bg-surface-administer-muted text-surface-administer-muted-foreground',
                              item.provider === 'slack' &&
                                'bg-status-green-muted text-status-green-muted-foreground',
                              item.provider === 'webhook' &&
                                'bg-status-yellow-muted text-status-yellow-muted-foreground',
                            )}
                          >
                            {item.provider}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'sent'
                              ? 'default'
                              : item.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={cn(item.status === 'sent' && 'bg-success-muted text-success')}
                        >
                          {item.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {item.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {item.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.retries > 0 ? (
                          <span className="text-warning font-medium">{item.retries}</span>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.processed_at
                          ? new Date(item.processed_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : item.sent_at
                          ? new Date(item.sent_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
