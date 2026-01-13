/**
 * TicketDetailHeader - Header especializado para página de detalhe de ticket
 * 
 * Exibe: tipo (interno/externo), status, título, timestamps, prazo
 * Permite alterar status inline
 */

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "../types";

const statusConfig: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  waiting: { label: "Aguardando", variant: "secondary" },
  paused: { label: "Pausado", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  done: { label: "Concluído", variant: "secondary" },
  discarded: { label: "Descartado", variant: "destructive" },
};

interface TicketDetailHeaderProps {
  title: string;
  type: "internal" | "external";
  status: TicketStatus;
  createdAt: string;
  expectedDueAt?: string | null;
  onStatusChange: (status: TicketStatus) => void;
  isUpdating?: boolean;
}

export function TicketDetailHeader({
  title,
  type,
  status,
  createdAt,
  expectedDueAt,
  onStatusChange,
  isUpdating = false,
}: TicketDetailHeaderProps) {
  const statusInfo = statusConfig[status];
  const isExternal = type === "external";

  return (
    <div className="flex items-start justify-between gap-4">
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
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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

      {/* Status changer */}
      <Select 
        value={status} 
        onValueChange={(v) => onStatusChange(v as TicketStatus)}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="waiting">Aguardando</SelectItem>
          <SelectItem value="in_progress">Em andamento</SelectItem>
          <SelectItem value="paused">Pausado</SelectItem>
          <SelectItem value="done">Concluído</SelectItem>
          <SelectItem value="discarded">Descartado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}