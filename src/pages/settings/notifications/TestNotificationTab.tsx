/**
 * TestNotificationTab — Envio de notificação de teste
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import {
  Bell,
  Mail,
  Slack,
  Globe,
  TestTube,
  Send,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { channelIcons } from './constants';

export interface TestResultEntry {
  channel: string;
  status: string;
  id: string | null;
  error?: string;
}

interface TestNotificationTabProps {
  testRecipient: string;
  testChannels: string[];
  testResult: TestResultEntry[] | null;
  isSending: boolean;
  isChannelConfigured: (slug: string) => boolean;
  onTestRecipientChange: (val: string) => void;
  onTestChannelsChange: (channels: string[]) => void;
  onSendTest: () => void;
}

export function TestNotificationTab({
  testRecipient,
  testChannels,
  testResult,
  isSending,
  isChannelConfigured,
  onTestRecipientChange,
  onTestChannelsChange,
  onSendTest,
}: TestNotificationTabProps) {
  const toggleChannel = (slug: string, checked: boolean) => {
    if (checked) {
      onTestChannelsChange([...testChannels, slug]);
    } else {
      onTestChannelsChange(testChannels.filter((c) => c !== slug));
    }
  };

  return (
    <PermissionGuard permission="notifications.test.send:bu">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Enviar Notificação de Teste
          </CardTitle>
          <CardDescription>
            Envie uma notificação de teste para validar a configuração do sistema. Canais não
            configurados não aparecerão nas opções.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <BuUserSelect
                value={testRecipient}
                onValueChange={(val) => onTestRecipientChange(val ?? '')}
                placeholder="Selecione um usuário"
                showSearch={false}
                showBadges={false}
                excludeExternal
              />
            </div>

            <div className="space-y-2">
              <Label>Canais</Label>
              <div className="flex flex-wrap gap-4">
                {/* In-App - always available */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={testChannels.includes('in_app')}
                    onCheckedChange={(checked) => toggleChannel('in_app', !!checked)}
                  />
                  <Bell className="w-4 h-4" />
                  In-App
                </label>

                {/* Email */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={testChannels.includes('email')}
                    onCheckedChange={(checked) => toggleChannel('email', !!checked)}
                  />
                  <Mail className="w-4 h-4" />
                  Email
                </label>

                {/* Slack - only if configured */}
                {isChannelConfigured('slack') && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={testChannels.includes('slack')}
                      onCheckedChange={(checked) => toggleChannel('slack', !!checked)}
                    />
                    <Slack className="w-4 h-4" />
                    Slack
                  </label>
                )}

                {/* Webhook - only if configured */}
                {isChannelConfigured('webhook') && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={testChannels.includes('webhook')}
                      onCheckedChange={(checked) => toggleChannel('webhook', !!checked)}
                    />
                    <Globe className="w-4 h-4" />
                    Webhook
                  </label>
                )}
              </div>

              {/* Info about unconfigured channels */}
              {(!isChannelConfigured('slack') || !isChannelConfigured('webhook')) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {!isChannelConfigured('slack') && !isChannelConfigured('webhook')
                    ? 'Slack e Webhook não estão configurados.'
                    : !isChannelConfigured('slack')
                      ? 'Slack não está configurado.'
                      : 'Webhook não está configurado.'}{' '}
                  Configure na aba Canais.
                </p>
              )}
            </div>

            <Button
              onClick={onSendTest}
              disabled={isSending || !testRecipient || testChannels.length === 0}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Teste
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resultado do Teste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResult.map((r, i) => {
                    const ChannelIcon = channelIcons[r.channel] || Bell;
                    const hasError = r.error || r.status === 'error';
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {hasError ? (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                        <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline">{r.channel}</Badge>
                        <span>Status: {r.status}</span>
                        {r.id && (
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">
                            {r.id.slice(0, 8)}...
                          </code>
                        )}
                        {r.error && (
                          <span className="text-xs text-destructive truncate max-w-[200px]">
                            {r.error}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Veja a aba Outbox para acompanhar o status de envio.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
