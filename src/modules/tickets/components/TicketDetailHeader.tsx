/**
 * TicketDetailHeader - Header especializado para página de detalhe de ticket
 * 
 * Exibe: tipo (interno/externo), status, título, timestamps, prazo
 * Status é alterado no sidebar via TicketStatusSelector
 */

import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_STYLES } from "@/lib/colors";
import type { TicketStatus } from "../types";

const statusLabels: Record<TicketStatus, string> = {
  waiting: "Aguardando",
  paused: "Pausado",
  in_progress: "Em andamento",
  done: "Concluído",
  discarded: "Descartado",
};

interface TicketDetailHeaderProps {
  title: string;
  type: "internal" | "external";
  status: TicketStatus;
  createdAt: string;
  expectedDueAt?: string | null;
}

export function TicketDetailHeader({
  title,
  type,
  status,
  createdAt,
  expectedDueAt,
}: TicketDetailHeaderProps) {
  const statusStyles = TICKET_STATUS_STYLES[status];
  const isExternal = type === "external";

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium",
          isExternal 
            ? "bg-status-purple-muted text-status-purple"
            : "bg-status-blue-muted text-status-blue"
        )}>
          {isExternal ? "Externo" : "Interno"}
        </span>
        <Badge className={cn("gap-1.5", statusStyles.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusStyles.dot)} />
          {statusLabels[status]}
        </Badge>
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Criado {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
        </span>
        {expectedDueAt && (
          <span>
            Prazo: {format(new Date(expectedDueAt), "dd/MM/yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}