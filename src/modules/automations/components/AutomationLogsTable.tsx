import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VirtualizedTable } from '@/components/ui/virtualized-list';
import { Eye, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { AutomationLog } from '../types';
import { logStatusColors, logStatusLabels } from '../types';

interface AutomationLogsTableProps {
  logs: AutomationLog[];
  isLoading?: boolean;
}

export function AutomationLogsTable({ logs, isLoading }: AutomationLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Carregando logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhum log encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Os logs aparecerão aqui quando eventos forem disparados ou ações executadas.
        </p>
      </div>
    );
  }

  return (
    <>
      <VirtualizedTable
        items={logs}
        height={500}
        rowHeight={48}
        getItemKey={(log) => log.id}
        columns={[
          {
            key: "type",
            header: "Tipo",
            width: 100,
            render: (log) => (
              <div className="flex items-center gap-1.5">
                {log.type === 'event' ? (
                  <ArrowUpRight className="h-4 w-4 text-blue-500" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4 text-purple-500" />
                )}
                <span className="text-xs uppercase text-muted-foreground">
                  {log.type === 'event' ? 'Evento' : 'Ação'}
                </span>
              </div>
            ),
          },
          {
            key: "event_key",
            header: "Evento / Ação",
            render: (log) => (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {log.event_key || log.action_key}
              </code>
            ),
          },
          {
            key: "connection",
            header: "Conexão / Token",
            render: (log) => (
              <span className="text-sm text-muted-foreground">
                {log.connection?.name || '-'}
              </span>
            ),
          },
          {
            key: "bu",
            header: "BU",
            width: 100,
            render: (log) => (
              <span className="text-sm text-muted-foreground">
                {log.bu?.name || 'Global'}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            width: 100,
            render: (log) => (
              <Badge
                variant="secondary"
                className={logStatusColors[log.status]}
              >
                {logStatusLabels[log.status]}
              </Badge>
            ),
          },
          {
            key: "latency_ms",
            header: "Latência",
            width: 80,
            className: "text-right tabular-nums",
            render: (log) => log.latency_ms ? `${log.latency_ms}ms` : '-',
          },
          {
            key: "created_at",
            header: "Data",
            width: 120,
            render: (log) => (
              <span className="text-sm text-muted-foreground">
                {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            width: 60,
            render: (log) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(log);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
      />

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                    <p className="text-sm">
                      {selectedLog.type === 'event' ? 'Evento (Saída)' : 'Ação (Entrada)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge
                      variant="secondary"
                      className={logStatusColors[selectedLog.status]}
                    >
                      {logStatusLabels[selectedLog.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {selectedLog.type === 'event' ? 'Evento' : 'Ação'}
                    </p>
                    <code className="text-sm">
                      {selectedLog.event_key || selectedLog.action_key}
                    </code>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                    <p className="text-sm">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedLog.latency_ms && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Latência</p>
                      <p className="text-sm">{selectedLog.latency_ms}ms</p>
                    </div>
                  )}
                  {selectedLog.status_code && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status HTTP</p>
                      <p className="text-sm">{selectedLog.status_code}</p>
                    </div>
                  )}
                </div>

                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Mensagem de Erro
                    </p>
                    <div className="rounded-lg bg-status-red-muted p-3 text-sm text-status-red">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}

                {selectedLog.request_payload && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Request Payload
                    </p>
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.request_payload, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_payload && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Response Payload
                    </p>
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.response_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
