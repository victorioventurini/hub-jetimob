import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bell } from 'lucide-react';
import { channelIcons, type NotificationChannelLite } from './constants';

interface ChannelsTabProps {
  channels: NotificationChannelLite[];
  onToggleChannel: (currentStatus: string, channelSlug: string) => void;
}

export function ChannelsTab({ channels, onToggleChannel }: ChannelsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Canais Globais</h2>
        <p className="text-sm text-muted-foreground">Canais disponíveis para todas as BUs</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Requer Configuração</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => {
                const Icon = channelIcons[channel.slug] || Bell;
                return (
                  <TableRow key={channel.slug}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{channel.name}</div>
                          {channel.description && (
                            <div className="text-xs text-muted-foreground">
                              {channel.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{channel.slug}</code>
                    </TableCell>
                    <TableCell>
                      {channel.requires_configuration ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={channel.status === 'active'}
                        onCheckedChange={() => onToggleChannel(channel.status, channel.slug)}
                        disabled={channel.slug === 'in_app'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
