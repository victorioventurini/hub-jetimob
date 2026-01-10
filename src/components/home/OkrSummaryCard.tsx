import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface OkrSummaryCardProps {
  onTrack: number;
  atRisk: number;
  offTrack: number;
  title?: string;
}

export function OkrSummaryCard({ 
  onTrack, 
  atRisk, 
  offTrack, 
  title = "OKRs" 
}: OkrSummaryCardProps) {
  const total = onTrack + atRisk + offTrack;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Target className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div 
              className="bg-emerald-500 transition-all" 
              style={{ width: `${(onTrack / total) * 100}%` }} 
            />
            <div 
              className="bg-amber-500 transition-all" 
              style={{ width: `${(atRisk / total) * 100}%` }} 
            />
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${(offTrack / total) * 100}%` }} 
            />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground truncate">No caminho</span>
              <span className="font-semibold text-foreground shrink-0">{onTrack}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span className="text-muted-foreground truncate">Em risco</span>
              <span className="font-semibold text-foreground shrink-0">{atRisk}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="text-muted-foreground truncate">Fora</span>
              <span className="font-semibold text-foreground shrink-0">{offTrack}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
