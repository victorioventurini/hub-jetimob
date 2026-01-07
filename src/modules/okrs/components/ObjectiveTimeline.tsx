import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  CheckCircle2,
  XCircle,
  FileEdit,
  GitBranch,
  Clock,
  Archive,
  Lightbulb,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineEvent {
  id: string;
  type: "created" | "activated" | "reviewed" | "updated" | "cancelled" | "completed" | "discarded";
  date: string;
  title: string;
  description?: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

interface ObjectiveTimelineProps {
  objectiveId: string;
  objectiveType: "org" | "team";
  className?: string;
}

const eventIcons: Record<TimelineEvent["type"], typeof Target> = {
  created: Target,
  activated: CheckCircle2,
  reviewed: FileEdit,
  updated: GitBranch,
  cancelled: XCircle,
  completed: CheckCircle2,
  discarded: Archive,
};

const eventColors: Record<TimelineEvent["type"], string> = {
  created: "bg-blue-500",
  activated: "bg-green-500",
  reviewed: "bg-purple-500",
  updated: "bg-yellow-500",
  cancelled: "bg-red-500",
  completed: "bg-green-600",
  discarded: "bg-gray-500",
};

export function ObjectiveTimeline({
  objectiveId,
  objectiveType,
  className,
}: ObjectiveTimelineProps) {
  const { client: supabase, buId } = useOptionalBuClient();
  const tableName = objectiveType === "org" ? "okr_org_objectives" : "okr_team_objectives";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["objective-timeline", buId, objectiveId, objectiveType],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!supabase || !buId) return [];

      const timelineEvents: TimelineEvent[] = [];

      // Fetch objective data
      const { data: objective, error: objError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", objectiveId)
        .single();

      if (objError || !objective) return [];

      // Created event
      timelineEvents.push({
        id: `created-${objective.id}`,
        type: "created",
        date: objective.created_at,
        title: "Objetivo criado",
        description: objective.title,
      });

      // Check for status changes via audit log
      const { data: auditLogs } = await supabase
        .from("okr_audit_log")
        .select("*")
        .eq("entity_id", objectiveId)
        .eq("entity", tableName.replace("public.", ""))
        .order("created_at", { ascending: true });

      if (auditLogs) {
        for (const log of auditLogs) {
          if (log.action === "update" && log.old_value && log.new_value) {
            const oldStatus = (log.old_value as Record<string, unknown>)?.status;
            const newStatus = (log.new_value as Record<string, unknown>)?.status;

            if (oldStatus !== newStatus) {
              let eventType: TimelineEvent["type"] = "updated";
              let title = "Status atualizado";

              if (newStatus === "active") {
                eventType = "activated";
                title = "Objetivo ativado";
              } else if (newStatus === "completed") {
                eventType = "completed";
                title = "Objetivo concluído";
              } else if (newStatus === "cancelled") {
                eventType = "cancelled";
                title = "Objetivo cancelado";
              } else if (newStatus === "discarded") {
                eventType = "discarded";
                title = "Objetivo descartado";
              }

              timelineEvents.push({
                id: log.id,
                type: eventType,
                date: log.created_at,
                title,
                description:
                  newStatus === "cancelled" || newStatus === "discarded"
                    ? ((log.new_value as Record<string, unknown>)?.cancellation_learning as string | undefined)
                    : undefined,
              });
            }
          }
        }
      }

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("okr_objective_reviews")
        .select("*")
        .eq("objective_id", objectiveId)
        .eq("objective_type", objectiveType)
        .order("reviewed_at", { ascending: true });

      if (reviews) {
        for (const review of reviews) {
          timelineEvents.push({
            id: review.id,
            type: "reviewed",
            date: review.reviewed_at,
            title: `Revisão ${
              review.review_type === "quarterly"
                ? "trimestral"
                : review.review_type === "mid_year"
                  ? "semestral"
                  : "realizada"
            }`,
            description: review.changes_summary || review.notes,
          });
        }
      }

      // Sort by date
      return timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!objectiveId && !!buId && !!supabase,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Timeline do Objetivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-4">
              {events.map((event) => {
                const Icon = eventIcons[event.type];
                const colorClass = eventColors[event.type];

                return (
                  <div key={event.id} className="relative flex gap-4 pl-1">
                    {/* Icon */}
                    <div
                      className={cn(
                        "relative z-10 flex h-7 w-7 items-center justify-center rounded-full",
                        colorClass
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {format(parseISO(event.date), "dd/MM/yy", { locale: ptBR })}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                      )}
                      {event.type === "cancelled" && event.description && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{event.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for inline use
 */
export function ObjectiveTimelineCompact({
  objectiveId,
  objectiveType,
}: Omit<ObjectiveTimelineProps, "className">) {
  const { client: supabase, buId } = useOptionalBuClient();

  const { data: lastEvent } = useQuery({
    queryKey: ["objective-timeline-last", buId, objectiveId, objectiveType],
    queryFn: async (): Promise<TimelineEvent | null> => {
      if (!supabase || !buId) return null;

      const tableName = objectiveType === "org" ? "okr_org_objectives" : "okr_team_objectives";

      const { data: objective } = await supabase
        .from(tableName)
        .select("updated_at, status")
        .eq("id", objectiveId)
        .single();

      if (!objective) return null;

      return {
        id: "last",
        type: objective.status === "cancelled" ? "cancelled" : "updated",
        date: objective.updated_at,
        title: `Última atualização`,
      };
    },
    enabled: !!objectiveId && !!buId && !!supabase,
  });

  if (!lastEvent) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{format(parseISO(lastEvent.date), "dd/MM/yy", { locale: ptBR })}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Última atualização: {format(parseISO(lastEvent.date), "PPp", { locale: ptBR })}</p>
      </TooltipContent>
    </Tooltip>
  );
}
