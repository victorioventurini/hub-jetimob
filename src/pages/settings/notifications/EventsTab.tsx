/**
 * EventsTab — Tabela de eventos x canais por módulo
 *
 * Extraído de SettingsNotifications.tsx (refatoração P1).
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { EmptyState } from '@/components/ui/empty-state';
import { Bell, Mail, Slack, Globe, Lock, X, AlertCircle } from 'lucide-react';
import { moduleNames } from './constants';

interface NotificationEvent {
  slug: string;
  name: string;
  module: string;
  is_mandatory: boolean;
  default_channels: string[];
}

interface BuEventSetting {
  event_slug: string;
  channel: string;
  is_enabled: boolean;
}

interface EventsTabProps {
  eventsByModule: Record<string, NotificationEvent[]>;
  getEventSetting: (eventSlug: string, channel: string) => BuEventSetting | undefined;
  isChannelConfigured: (channelSlug: string) => boolean;
  canManageBuNotifications: boolean;
  onToggleEventSetting: (eventSlug: string, channel: string, isEnabled: boolean) => void;
}

export function EventsTab({
  eventsByModule,
  getEventSetting,
  isChannelConfigured,
  canManageBuNotifications,
  onToggleEventSetting,
}: EventsTabProps) {
  return (
    <PermissionGuard
      anyOf={['notifications.bu.manage:bu', 'notifications.bu.view:bu']}
      fallback={
        <EmptyState
          icon={AlertCircle}
          title="Sem acesso"
          description="Você não tem permissão para visualizar as configurações de eventos desta BU."
          compact
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Eventos por Canal</CardTitle>
          <CardDescription>
            Ative ou desative eventos específicos por canal. Eventos obrigatórios não podem ser
            desativados. Canais não configurados aparecem desabilitados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(eventsByModule).map(([module, moduleEvents]) => (
            <div key={module}>
              <h4 className="font-medium text-sm text-muted-foreground uppercase mb-3">
                {moduleNames[module] || module}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead className="w-20 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Bell className="w-4 h-4" />
                        <span className="sr-only">In-App</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span className="sr-only">Email</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            <Slack
                              className={cn(
                                'w-4 h-4',
                                !isChannelConfigured('slack') && 'text-muted-foreground',
                              )}
                            />
                            {!isChannelConfigured('slack') && (
                              <X className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {!isChannelConfigured('slack') && (
                          <TooltipContent>Slack não configurado</TooltipContent>
                        )}
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1">
                            <Globe
                              className={cn(
                                'w-4 h-4',
                                !isChannelConfigured('webhook') && 'text-muted-foreground',
                              )}
                            />
                            {!isChannelConfigured('webhook') && (
                              <X className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {!isChannelConfigured('webhook') && (
                          <TooltipContent>Webhook não configurado</TooltipContent>
                        )}
                      </Tooltip>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleEvents.map((event) => {
                    const inAppSetting = getEventSetting(event.slug, 'in_app');
                    const emailSetting = getEventSetting(event.slug, 'email');
                    const slackSetting = getEventSetting(event.slug, 'slack');
                    const webhookSetting = getEventSetting(event.slug, 'webhook');

                    const inAppEnabled =
                      inAppSetting?.is_enabled ?? event.default_channels.includes('in_app');
                    const emailEnabled =
                      emailSetting?.is_enabled ?? event.default_channels.includes('email');
                    const slackEnabled = slackSetting?.is_enabled ?? false;
                    const webhookEnabled = webhookSetting?.is_enabled ?? false;

                    const slackConfigured = isChannelConfigured('slack');
                    const webhookConfigured = isChannelConfigured('webhook');

                    return (
                      <TableRow key={event.slug}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{event.name}</span>
                            {event.is_mandatory && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Evento obrigatório</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {event.slug}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {event.default_channels.includes('in_app') ? (
                            <Switch
                              checked={inAppEnabled}
                              onCheckedChange={(checked) =>
                                onToggleEventSetting(event.slug, 'in_app', checked)
                              }
                              disabled={event.is_mandatory || !canManageBuNotifications}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {event.default_channels.includes('email') ? (
                            <Switch
                              checked={emailEnabled}
                              onCheckedChange={(checked) =>
                                onToggleEventSetting(event.slug, 'email', checked)
                              }
                              disabled={event.is_mandatory || !canManageBuNotifications}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Switch
                                  checked={slackEnabled}
                                  onCheckedChange={(checked) =>
                                    onToggleEventSetting(event.slug, 'slack', checked)
                                  }
                                  disabled={
                                    !slackConfigured ||
                                    event.is_mandatory ||
                                    !canManageBuNotifications
                                  }
                                />
                              </span>
                            </TooltipTrigger>
                            {!slackConfigured && (
                              <TooltipContent>Configure Slack primeiro</TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Switch
                                  checked={webhookEnabled}
                                  onCheckedChange={(checked) =>
                                    onToggleEventSetting(event.slug, 'webhook', checked)
                                  }
                                  disabled={
                                    !webhookConfigured ||
                                    event.is_mandatory ||
                                    !canManageBuNotifications
                                  }
                                />
                              </span>
                            </TooltipTrigger>
                            {!webhookConfigured && (
                              <TooltipContent>Configure Webhook primeiro</TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
