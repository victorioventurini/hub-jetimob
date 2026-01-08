/**
 * TeamCriticalAlertsCard - Shows critical alerts requiring attention
 * Full width, only appears if there are critical items
 */
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Target, Package, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CriticalAlert {
  type: string;
  title: string;
  subtitle: string;
  severity: 'high' | 'medium' | 'low';
  url: string;
  cta: string;
}

interface TeamCriticalAlertsCardProps {
  alerts: CriticalAlert[];
}

const alertIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  asset_overdue: Package,
  ticket_overdue: Clock,
  okr_pending: Target,
  okr_red: AlertTriangle,
  kpi_breach: AlertTriangle,
};

const severityColors: Record<string, string> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function TeamCriticalAlertsCard({ alerts }: TeamCriticalAlertsCardProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Atenção necessária
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const Icon = alertIcons[alert.type] || AlertTriangle;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {alert.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alert.subtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={severityColors[alert.severity] as any}>
                    {alert.severity === 'high' ? 'Urgente' : alert.severity === 'medium' ? 'Atenção' : 'Info'}
                  </Badge>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <Link to={alert.url}>
                      {alert.cta}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
