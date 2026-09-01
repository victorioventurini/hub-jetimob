import { Badge } from "@/components/ui/badge";
import { getInitiativeStatusLabel, getInitiativeStatusColor, type InitiativeStatus } from "../../types/initiative";
import { Circle, Play, AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

interface InitiativeStatusBadgeProps {
  status: InitiativeStatus;
  showIcon?: boolean;
  className?: string;
}

const STATUS_ICONS: Record<InitiativeStatus, LucideIcon> = {
  planned: Circle,
  in_progress: Play,
  blocked: AlertTriangle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function InitiativeStatusBadge({ status, showIcon = true, className }: InitiativeStatusBadgeProps) {
  // Fallback defensivo: um status novo/inesperado nunca deve derrubar a árvore
  // de render (React #130 — componente undefined).
  const Icon = STATUS_ICONS[status] ?? Circle;

  return (
    <Badge variant="secondary" className={`${getInitiativeStatusColor(status)} ${className || ''}`}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {getInitiativeStatusLabel(status)}
    </Badge>
  );
}
