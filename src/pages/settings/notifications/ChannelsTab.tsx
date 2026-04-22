/**
 * ChannelsTab — Lista de canais com ativação/configuração/teste
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Bell,
  Settings2,
  Check,
  AlertCircle,
  AlertTriangle,
  TestTube,
  MessageCircle,
} from 'lucide-react';
import { channelIcons, CONFIGURABLE_CHANNELS } from './constants';

interface NotificationChannel {
  slug: string;
  name: string;
  description?: string | null;
}

interface BuChannelConfig {
  channel_slug: string;
  is_enabled: boolean;
  config: unknown;
}

interface ChannelsTabProps {
  channels: NotificationChannel[];
  getBuChannelConfig: (channelSlug: string) => BuChannelConfig | undefined;
  isChannelConfigured: (channelSlug: string) => boolean;
  canManageBuNotifications: boolean;
  testingChannel: boolean;
  onToggleChannel: (channelSlug: string, isEnabled: boolean) => void;
  onOpenConfig: (channelSlug: string) => void;
  onTestChannel: (channelSlug: string) => void;
}

export function ChannelsTab({
  channels,
  getBuChannelConfig,
  isChannelConfigured,
  canManageBuNotifications,
  testingChannel,
  onToggleChannel,
  onOpenConfig,
  onTestChannel,
}: ChannelsTabProps) {
  return (
    <PermissionGuard
      anyOf={['notifications.bu.manage:bu', 'notifications.bu.view:bu']}
      fallback={
        <EmptyState
          icon={AlertCircle}
          title="Sem acesso"
          description="Você não tem permissão para visualizar as configurações de notificações desta BU."
          compact
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>
            Ative ou desative canais de notificação para todos os usuários desta BU
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.slug] || Bell;
            const buChannel = getBuChannelConfig(channel.slug);
            const isEnabled = buChannel?.is_enabled ?? (channel.slug === 'in_app');
            const isConfigured = isChannelConfigured(channel.slug);
            const needsConfig = CONFIGURABLE_CHANNELS.includes(channel.slug);
            const isInApp = channel.slug === 'in_app';

            return (
              <div
                key={channel.slug}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isEnabled ? 'bg-primary/10' : 'bg-muted',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        isEnabled ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{channel.name}</span>
                      {needsConfig && !isConfigured && (
                        <Badge variant="outline" className="text-xs gap-1 text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          Não configurado
                        </Badge>
                      )}
                      {needsConfig && isConfigured && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Check className="w-3 h-3" />
                          Configurado
                        </Badge>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground">{channel.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {needsConfig && canManageBuNotifications && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenConfig(channel.slug)}
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>
                  )}
                  {needsConfig && isConfigured && (
                    <PermissionGuard permission="notifications.test.send:bu">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTestChannel(channel.slug)}
                        disabled={testingChannel || !canManageBuNotifications}
                      >
                        <TestTube className="w-4 h-4 mr-1" />
                        Testar
                      </Button>
                    </PermissionGuard>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => onToggleChannel(channel.slug, checked)}
                          disabled={
                            isInApp ||
                            (!isConfigured && needsConfig) ||
                            !canManageBuNotifications
                          }
                        />
                      </span>
                    </TooltipTrigger>
                    {!isConfigured && needsConfig && (
                      <TooltipContent>Configure o canal primeiro</TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            );
          })}

          {/* WhatsApp placeholder */}
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">WhatsApp</span>
                  <Badge variant="outline" className="text-xs">
                    Em breve
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Notificações via WhatsApp</p>
              </div>
            </div>
            <Switch disabled checked={false} />
          </div>
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
