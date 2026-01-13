import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TeamStatusCardProps {
  teamName: string;
  onTrackPercent: number;
  atRiskPercent: number;
  offTrackPercent: number;
  title?: string;
}

export function TeamStatusCard({
  teamName,
  onTrackPercent,
  atRiskPercent,
  offTrackPercent,
  title = "Status do Time",
}: TeamStatusCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Users className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">{teamName}</p>

          {/* Progress bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-status-green transition-all"
              style={{ width: `${onTrackPercent}%` }}
            />
            <div
              className="bg-status-yellow transition-all"
              style={{ width: `${atRiskPercent}%` }}
            />
            <div
              className="bg-status-red transition-all"
              style={{ width: `${offTrackPercent}%` }}
            />
          </div>

          {/* Percentages */}
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-full bg-status-green" />
                <span className="font-semibold text-foreground">{onTrackPercent}%</span>
              </div>
              <p className="text-muted-foreground truncate">No caminho</p>
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-full bg-status-yellow" />
                <span className="font-semibold text-foreground">{atRiskPercent}%</span>
              </div>
              <p className="text-muted-foreground truncate">Em risco</p>
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-full bg-status-red" />
                <span className="font-semibold text-foreground">{offTrackPercent}%</span>
              </div>
              <p className="text-muted-foreground truncate">Fora do caminho</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
