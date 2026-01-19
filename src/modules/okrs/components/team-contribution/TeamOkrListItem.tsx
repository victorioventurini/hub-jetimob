import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Circle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TeamOkrContribution } from "../../hooks";

interface TeamOkrListItemProps {
  okr: TeamOkrContribution;
}

const statusIcons = {
  on_track: CheckCircle2,
  at_risk: AlertTriangle,
  off_track: Circle,
};

const statusColors = {
  on_track: 'text-success',
  at_risk: 'text-warning',
  off_track: 'text-danger',
};

export function TeamOkrListItem({ okr }: TeamOkrListItemProps) {
  const StatusIcon = statusIcons[okr.status];
  const statusColor = statusColors[okr.status];

  const lastCheckin = okr.lastCheckinAt
    ? formatDistanceToNow(new Date(okr.lastCheckinAt), { 
        addSuffix: true, 
        locale: ptBR 
      })
    : 'Sem check-in';

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-background border">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
        <span className="text-sm text-foreground truncate">
          {okr.title}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Progress value={okr.progress} className="h-1.5 w-16" />
          <span className="text-xs font-medium text-muted-foreground w-8 text-right">
            {Math.round(okr.progress)}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground w-24 text-right">
          {lastCheckin}
        </span>
      </div>
    </div>
  );
}
