/**
 * OutboxTab — Fila de envio com filtros e retry
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { UrlSelect } from '@/shared/filters/UrlSelect';
import {
  Globe,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { channelIcons } from './constants';

interface OutboxItem {
  id: string;
  created_at: string;
  channel_slug: string;
  event_slug: string;
  status: string;
  retries: number;
  last_error: string | null;
  recipient: { display_name?: string | null; email?: string | null } | null;
}

interface OutboxData {
  data: OutboxItem[];
  count: number;
}

interface OutboxTabProps {
  statusValue: string;
  channelValue: string;
  onStatusChange: (v: string) => void;
  onChannelChange: (v: string) => void;
  outboxData: OutboxData | undefined;
  outboxLoading: boolean;
  isRetrying: boolean;
  onRetry: (outboxId: string) => void;
}

export function OutboxTab({
  statusValue,
  channelValue,
  onStatusChange,
  onChannelChange,
  outboxData,
  outboxLoading,
  isRetrying,
  onRetry,
}: OutboxTabProps) {
  return (
    <PermissionGuard permission="notifications.outbox.view:bu">
      <Card>
        <CardHeader>
          <CardTitle>Fila de Envio (Outbox)</CardTitle>
          <CardDescription>
            Monitore o status de envio das notificações externas (email, slack, webhook)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <UrlSelect
              value={statusValue}
              onChange={onStatusChange}
              options={[
                { value: 'pending', label: 'Pendente' },
                { value: 'sent', label: 'Enviado' },
                { value: 'failed', label: 'Falhou' },
              ]}
              includeAllOption
              allOptionLabel="Todos os status"
              triggerClassName="w-[180px]"
            />
            <UrlSelect
              value={channelValue}
              onChange={onChannelChange}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'slack', label: 'Slack' },
                { value: 'webhook', label: 'Webhook' },
              ]}
              includeAllOption
              allOptionLabel="Todos os canais"
              triggerClassName="w-[180px]"
            />
          </div>

          {/* Table */}
          {outboxLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outboxData?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum item no outbox
                      </TableCell>
                    </TableRow>
                  ) : (
                    outboxData?.data.map((item) => {
                      const StatusIcon =
                        item.status === 'sent'
                          ? CheckCircle
                          : item.status === 'failed'
                            ? AlertCircle
                            : Clock;
                      const statusColor =
                        item.status === 'sent'
                          ? 'text-success'
                          : item.status === 'failed'
                            ? 'text-destructive'
                            : 'text-warning';
                      const ChannelIcon = channelIcons[item.channel_slug] || Globe;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium truncate max-w-[150px]">
                                {item.recipient?.display_name || '-'}
                              </span>
                              {item.recipient?.email && (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {item.recipient.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">{item.channel_slug}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.event_slug}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <StatusIcon className={cn('w-4 h-4', statusColor)} />
                              <span className="text-sm capitalize">{item.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.retries}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {item.last_error || '-'}
                          </TableCell>
                          <TableCell>
                            <PermissionGuard permission="notifications.outbox.retry:bu">
                              {(item.status === 'failed' || item.status === 'pending') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRetry(item.id)}
                                  disabled={isRetrying}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                            </PermissionGuard>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {outboxData && outboxData.count > 0 && (
                <p className="text-sm text-muted-foreground">
                  {outboxData.count} item{outboxData.count !== 1 ? 's' : ''} no outbox
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
