/**
 * TicketDetailHeader - Header especializado para página de detalhe de ticket
 * 
 * Exibe: breadcrumbs, tipo (interno/externo), status, título, timestamps, prazo
 * Status é alterado no sidebar via TicketStatusSelector
 * 
 * v2.0: Agora inclui breadcrumbs integrados (padrão canônico)
 */

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
  ticketId?: string;
}

export function TicketDetailHeader({
  title,
  type,
  status,
  createdAt,
  expectedDueAt,
  ticketId,
}: TicketDetailHeaderProps) {
  const statusStyles = TICKET_STATUS_STYLES[status];
  const isExternal = type === "external";

  // Breadcrumbs para PageHeader
  const breadcrumbs = [
    { label: "Tickets", href: "/tickets" },
    { label: ticketId ? `#${ticketId.slice(0, 8)}` : title },
  ];

  // Descrição com timestamps
  const description = (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
  );

  // Actions com badges de tipo e status
  const actions = (
    <div className="flex items-center gap-2">
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
  );

  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
    />
  );
}