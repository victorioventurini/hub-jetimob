/**
 * InAppTab — Histórico de notificações in-app
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CheckCircle, Clock } from 'lucide-react';

interface InAppItem {
  id: string;
  created_at: string;
  title: string;
  type: string;
  is_read: boolean;
  event_slug: string | null;
  recipient?: { display_name?: string | null } | null;
}

interface InAppData {
  data: InAppItem[];
  count: number;
}

interface InAppTabProps {
  inappData: InAppData | undefined;
  inappLoading: boolean;
}

export function InAppTab({ inappData, inappLoading }: InAppTabProps) {
  return (
    <PermissionGuard permission="notifications.bu.view:bu">
      <Card>
        <CardHeader>
          <CardTitle>Notificações In-App</CardTitle>
          <CardDescription>Histórico de notificações in-app enviadas nesta BU</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inappLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Lida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inappData?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma notificação in-app
                      </TableCell>
                    </TableRow>
                  ) : (
                    inappData?.data.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm font-medium truncate max-w-[150px]">
                          {item.recipient?.display_name || '-'}
                        </TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.event_slug || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.is_read ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {inappData && inappData.count > 0 && (
                <p className="text-sm text-muted-foreground">
                  {inappData.count} notificação{inappData.count !== 1 ? 'ões' : ''} in-app
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
