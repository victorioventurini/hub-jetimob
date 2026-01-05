import { Badge } from "@/components/ui/badge";
import { getInitiativeStatusLabel, getInitiativeStatusColor, type InitiativeStatus } from "../../types/initiative";
import { Circle, Play, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InitiativeStatusBadgeProps {
  status: InitiativeStatus;
  showIcon?: boolean;
  className?: string;
}

export function InitiativeStatusBadge({ status, showIcon = true, className }: InitiativeStatusBadgeProps) {
  const Icon = {
    planned: Circle,
    in_progress: Play,
    blocked: AlertTriangle,
    completed: CheckCircle2,
  }[status];

  return (
    <Badge variant="secondary" className={`${getInitiativeStatusColor(status)} ${className || ''}`}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {getInitiativeStatusLabel(status)}
    </Badge>
  );
}
