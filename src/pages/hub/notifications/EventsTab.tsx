import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Lock, Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  channelIcons,
  severityIcons,
  moduleNames,
  type NotificationEventLite,
} from './constants';

interface EventsTabProps {
  events: NotificationEventLite[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  moduleFilter: string;
  setModuleFilter: (value: string) => void;
  severityFilter: string;
  setSeverityFilter: (value: string) => void;
  onNewEvent: () => void;
  onEditEvent: (event: NotificationEventLite) => void;
  onDeleteEvent: (slug: string) => void;
  isDeleting: boolean;
}

export function EventsTab({
  events,
  searchQuery,
  setSearchQuery,
  moduleFilter,
  setModuleFilter,
  severityFilter,
  setSeverityFilter,
  onNewEvent,
  onEditEvent,
  onDeleteEvent,
  isDeleting,
}: EventsTabProps) {
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (
        searchQuery &&
        !event.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.slug.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (moduleFilter !== 'all' && event.module !== moduleFilter) return false;
      if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
      return true;
    });
  }, [events, searchQuery, moduleFilter, severityFilter]);

  const eventsByModule = filteredEvents.reduce((acc, event) => {
    if (!acc[event.module]) acc[event.module] = [];
    acc[event.module].push(event);
    return acc;
  }, {} as Record<string, NotificationEventLite[]>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Catálogo de Eventos</h2>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} de {events.length} eventos
            </p>
          </div>
          <Button onClick={onNewEvent}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos módulos</SelectItem>
              {Object.entries(moduleNames).map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {Object.entries(eventsByModule).map(([module, moduleEvents]) => (
        <Card key={module}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{moduleNames[module] || module}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Audiência</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Canais Padrão</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleEvents.map((event) => {
                  const SeverityIcon = severityIcons[event.severity];
                  return (
                    <TableRow key={event.slug}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {event.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.audience === 'internal' && 'Interno'}
                          {event.audience === 'external' && 'Externo'}
                          {event.audience === 'both' && 'Ambos'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <SeverityIcon
                            className={cn('w-4 h-4', {
                              'text-muted-foreground': event.severity === 'info',
                              'text-warning': event.severity === 'warning',
                              'text-destructive': event.severity === 'critical',
                            })}
                          />
                          <span className="text-sm capitalize">{event.severity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {event.default_channels.map((ch) => {
                            const ChIcon = channelIcons[ch] || Bell;
                            return <ChIcon key={ch} className="w-4 h-4 text-muted-foreground" />;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.is_mandatory ? (
                          <Lock className="w-4 h-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditEvent(event)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteEvent(event.slug)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
