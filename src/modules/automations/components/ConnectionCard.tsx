import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Globe, Building2, Webhook } from 'lucide-react';
import type { AutomationConnection } from '../types';

interface ConnectionCardProps {
  connection: AutomationConnection;
  onEdit?: (connection: AutomationConnection) => void;
  onDelete?: (connection: AutomationConnection) => void;
  onToggle?: (connection: AutomationConnection, isActive: boolean) => void;
}

export function ConnectionCard({
  connection,
  onEdit,
  onDelete,
  onToggle,
}: ConnectionCardProps) {
  const activeEvents = connection.events?.filter((e) => e.is_active) || [];

  return (
    <Card className={!connection.is_active ? 'opacity-60' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{connection.name}</CardTitle>
              {connection.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {connection.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={connection.is_active}
              onCheckedChange={(checked) => onToggle?.(connection, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(connection)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(connection)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {connection.scope === 'global' ? (
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3 w-3" />
                Global
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" />
                {connection.bu?.name || 'BU'}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {connection.http_method}
            </Badge>
            {connection.auth_type !== 'none' && (
              <Badge variant="secondary" className="text-xs">
                {connection.auth_type.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground mb-1">URL do Webhook</p>
            <code className="block truncate rounded bg-muted px-2 py-1 text-xs">
              {connection.webhook_url}
            </code>
          </div>

          {activeEvents.length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1.5">
                Eventos vinculados ({activeEvents.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {activeEvents.slice(0, 5).map((event) => (
                  <Badge key={event.id} variant="outline" className="font-mono text-xs">
                    {event.event_key}
                  </Badge>
                ))}
                {activeEvents.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{activeEvents.length - 5} mais
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
