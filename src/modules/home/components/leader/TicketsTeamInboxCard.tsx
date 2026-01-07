/**
 * TicketsTeamInboxCard - Shows ticket summary for the team
 */
import { Inbox, ArrowRight, Clock, AlertCircle, HourglassIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import type { TicketSummary } from "../../types";

interface TicketsTeamInboxCardProps {
  tickets: TicketSummary | undefined;
  teamId: string | null;
  isLoading?: boolean;
}

export function TicketsTeamInboxCard({ tickets, teamId, isLoading }: TicketsTeamInboxCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Tickets do time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tickets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Tickets do time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecione um time para ver os tickets.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      icon: Clock,
      label: "Aguardando",
      value: tickets.awaiting_internal,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      icon: HourglassIcon,
      label: "Aguardando terceiros",
      value: tickets.awaiting_external,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      icon: AlertCircle,
      label: "Vencendo em 48h",
      value: tickets.due_soon + tickets.overdue,
      color: tickets.overdue > 0 ? "text-red-600" : "text-yellow-600",
      bg: tickets.overdue > 0 
        ? "bg-red-100 dark:bg-red-900/30" 
        : "bg-yellow-100 dark:bg-yellow-900/30",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Tickets do time
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {tickets.total_open} aberto{tickets.total_open !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="space-y-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <span className={`font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {tickets.total_open === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhum ticket vencendo. Bom trabalho! 🎉
          </p>
        )}

        {/* CTA */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => navigate(teamId ? `/tickets?team=${teamId}` : '/tickets')}
        >
          Abrir Tickets
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
