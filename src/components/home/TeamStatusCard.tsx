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
              className="bg-emerald-500 transition-all"
              style={{ width: `${onTrackPercent}%` }}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${atRiskPercent}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${offTrackPercent}%` }}
            />
          </div>

          {/* Percentages */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">{onTrackPercent}%</span>
              </div>
              <p className="text-muted-foreground">No caminho</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-foreground">{atRiskPercent}%</span>
              </div>
              <p className="text-muted-foreground">Em risco</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="font-semibold text-foreground">{offTrackPercent}%</span>
              </div>
              <p className="text-muted-foreground">Fora do caminho</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
