/**
 * TeamKpisCard - Shows KPI summary for the team
 * (Placeholder until KPI module is fully integrated)
 */
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { KpiSummary, KpiItem } from "../../types";

interface TeamKpisCardProps {
  kpis: KpiSummary | undefined;
  teamId: string | null;
  isLoading?: boolean;
}

// Mock KPIs for now (until KPI module integration is complete)
const mockKpis: KpiItem[] = [
  { id: '1', name: 'Tickets Resolvidos', value: 142, unit: '', trend: 'up', status: 'green' },
  { id: '2', name: 'CSAT', value: 4.6, unit: '', trend: 'stable', status: 'green' },
  { id: '3', name: 'Tempo Médio', value: 2.4, unit: 'h', trend: 'down', status: 'green' },
];

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const statusColors = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-danger',
};

export function TeamKpisCard({ kpis, teamId, isLoading }: TeamKpisCardProps) {
  // Use mock data until KPI integration is complete
  const displayKpis = kpis?.top?.length ? kpis.top : mockKpis;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            KPIs do time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          KPIs do time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI list */}
        <div className="space-y-2">
          {displayKpis.slice(0, 4).map((kpi) => {
            const TrendIcon = trendIcons[kpi.trend];
            return (
              <div
                key={kpi.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <span className="text-sm text-muted-foreground">{kpi.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${statusColors[kpi.status]}`}>
                    {kpi.value}{kpi.unit}
                  </span>
                  <TrendIcon className={`h-4 w-4 ${
                    kpi.trend === 'up' ? 'text-success' : 
                    kpi.trend === 'down' ? 'text-danger' : 
                    'text-muted-foreground'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Button
          asChild
          variant="outline"
          className="w-full gap-2"
        >
          <Link to="/kpis">
            Ver todos os KPIs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
