/**
 * ChannelConfigDialog — Diálogo de configuração de canal (email/slack/webhook)
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ChannelMeta {
  slug: string;
  name: string;
}

interface ChannelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: ChannelMeta[];
  selectedChannel: string | null;
  configForm: Record<string, string>;
  onConfigFormChange: (form: Record<string, string>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ChannelConfigDialog({
  open,
  onOpenChange,
  channels,
  selectedChannel,
  configForm,
  onConfigFormChange,
  onSave,
  isSaving,
}: ChannelConfigDialogProps) {
  const update = (patch: Record<string, string>) =>
    onConfigFormChange({ ...configForm, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar {channels.find((c) => c.slug === selectedChannel)?.name}</DialogTitle>
          <DialogDescription>
            Configure as credenciais e opções para este canal de notificação. Dados sensíveis são
            armazenados de forma segura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {selectedChannel === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="from_name">Nome do Remetente</Label>
              <Input
                id="from_name"
                placeholder="Next Jet"
                value={configForm.from_name || ''}
                onChange={(e) => update({ from_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Email usa configuração global (SendGrid/Resend).
              </p>
            </div>
          )}

          {selectedChannel === 'slack' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL (Incoming Webhook)</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={configForm.webhook_url || ''}
                  onChange={(e) => update({ webhook_url: e.target.value })}
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Crie em: Slack App → Incoming Webhooks
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou use Bot Token</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot_token">Bot Token (xoxb-...)</Label>
                <Input
                  id="bot_token"
                  placeholder="xoxb-..."
                  value={configForm.bot_token || ''}
                  onChange={(e) => update({ bot_token: e.target.value })}
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_channel_id">Canal Padrão (ID ou #nome)</Label>
                <Input
                  id="default_channel_id"
                  placeholder="#general ou C0123456789"
                  value={configForm.default_channel_id || configForm.default_channel_name || ''}
                  onChange={(e) =>
                    update({
                      default_channel_id: e.target.value.startsWith('C') ? e.target.value : '',
                      default_channel_name: e.target.value.startsWith('#') ? e.target.value : '',
                    })
                  }
                />
              </div>
            </>
          )}

          {selectedChannel === 'webhook' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">URL do Webhook</Label>
                <Input
                  id="url"
                  placeholder="https://seu-sistema.com/webhook/notifications"
                  value={configForm.url || ''}
                  onChange={(e) => update({ url: e.target.value })}
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="http_method">Método HTTP</Label>
                <Select
                  value={configForm.http_method || 'POST'}
                  onValueChange={(v) => update({ http_method: v })}
                >
                  <SelectTrigger id="http_method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret_header_name">Header de Autenticação (opcional)</Label>
                <Input
                  id="secret_header_name"
                  placeholder="X-Webhook-Secret"
                  value={configForm.secret_header_name || ''}
                  onChange={(e) => update({ secret_header_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret_header_value">Valor do Header</Label>
                <Input
                  id="secret_header_value"
                  placeholder="seu-segredo-aqui"
                  value={configForm.secret_header_value || ''}
                  onChange={(e) => update({ secret_header_value: e.target.value })}
                  type="password"
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-3 text-xs">
                  <p className="font-medium mb-1">Payload enviado:</p>
                  <pre className="text-muted-foreground overflow-x-auto">
{`{
  "event_slug": "...",
  "bu_id": "...",
  "title": "...",
  "message": "...",
  "context_url": "...",
  "sent_at": "..."
}`}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
