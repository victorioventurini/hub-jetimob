/**
 * Stats cards for external dashboard
 * Simple 2-column grid with key metrics
 */
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock } from "lucide-react";
import type { ExternalDashboardStats } from "../types";

interface ExternalStatsCardsProps {
  stats: ExternalDashboardStats;
  isLoading?: boolean;
}

export function ExternalStatsCards({ stats, isLoading }: ExternalStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Tickets em Aberto */}
      <Card className="bg-gradient-to-br from-info-muted to-background dark:from-info-muted/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-info-muted dark:bg-info/20">
              <MessageSquare className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalOpen}</p>
              <p className="text-sm text-muted-foreground">Tickets em Aberto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aguardando Resposta */}
      <Card className="bg-gradient-to-br from-warning-muted to-background dark:from-warning-muted/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-warning-muted dark:bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.awaitingResponse}</p>
              <p className="text-sm text-muted-foreground">Aguardando Resposta</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
