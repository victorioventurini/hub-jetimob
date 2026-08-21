import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { useBuApiKeyUsage } from '../hooks/useBuApiKeys';
import type { BuApiKey } from '../types';

interface ApiKeyUsageDialogProps {
  apiKey: BuApiKey | null;
  onClose: () => void;
}

function statusVariant(status: number) {
  if (status >= 500) return 'destructive' as const;
  if (status >= 400) return 'secondary' as const;
  return 'outline' as const;
}

export function ApiKeyUsageDialog({ apiKey, onClose }: ApiKeyUsageDialogProps) {
  const { data: logs, isLoading } = useBuApiKeyUsage(apiKey?.id ?? null);

  return (
    <Dialog open={!!apiKey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Últimas chamadas — {apiKey?.name}</DialogTitle>
          <DialogDescription>
            50 chamadas mais recentes registradas para esta chave.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingState />
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma chamada registrada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs truncate">
                    {log.method} {log.route}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                    {log.latency_ms != null && ` · ${log.latency_ms} ms`}
                    {log.error_message && ` · ${log.error_message}`}
                  </p>
                </div>
                <Badge variant={statusVariant(log.status_code)}>{log.status_code}</Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
