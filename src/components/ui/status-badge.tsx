import * as React from "react";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============= Status Type Definitions =============

export type RagStatus = "on_track" | "at_risk" | "off_track" | "not_started" | "no_data";
export type OkrStatus = "draft" | "active" | "completed" | "cancelled";
export type InventoryStatus = "available" | "loaned" | "maintenance" | "written_off";
export type KeyringStatus = "available" | "loaned" | "lost" | "retired";
export type TicketStatus = "waiting" | "paused" | "in_progress" | "done" | "discarded";
export type InitiativeStatus = "planned" | "in_progress" | "blocked" | "completed";
export type GenericStatus = "active" | "inactive" | "pending" | "error" | "success" | "warning";

export type StatusType = 
  | RagStatus 
  | OkrStatus 
  | InventoryStatus 
  | KeyringStatus 
  | TicketStatus 
  | InitiativeStatus 
  | GenericStatus;

// ============= Status Configuration =============

interface StatusConfig {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // RAG Status (OKRs/KPIs) - Using semantic tokens
  on_track: {
    label: "No caminho",
    dotColor: "bg-status-green",
    bgColor: "bg-status-green-muted",
    textColor: "text-status-green-muted-foreground",
    borderColor: "border-status-green/20",
  },
  at_risk: {
    label: "Em risco",
    dotColor: "bg-status-yellow",
    bgColor: "bg-status-yellow-muted",
    textColor: "text-status-yellow-muted-foreground",
    borderColor: "border-status-yellow/20",
  },
  off_track: {
    label: "Fora do caminho",
    dotColor: "bg-status-red",
    bgColor: "bg-status-red-muted",
    textColor: "text-status-red-muted-foreground",
    borderColor: "border-status-red/20",
  },
  not_started: {
    label: "Não iniciado",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },
  no_data: {
    label: "Sem dados",
    dotColor: "bg-status-gray",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },

  // OKR Objective Status
  draft: {
    label: "Rascunho",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },
  active: {
    label: "Ativo",
    dotColor: "bg-info",
    bgColor: "bg-info-muted",
    textColor: "text-info-muted-foreground",
    borderColor: "border-info/20",
  },
  completed: {
    label: "Concluído",
    dotColor: "bg-status-green",
    bgColor: "bg-status-green-muted",
    textColor: "text-status-green-muted-foreground",
    borderColor: "border-status-green/20",
  },
  cancelled: {
    label: "Cancelado",
    dotColor: "bg-status-red",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    borderColor: "border-destructive/20",
  },

  // Inventory Status
  available: {
    label: "Disponível",
    dotColor: "bg-status-green",
    bgColor: "bg-status-green-muted",
    textColor: "text-status-green-muted-foreground",
    borderColor: "border-status-green/20",
  },
  loaned: {
    label: "Emprestado",
    dotColor: "bg-info",
    bgColor: "bg-info-muted",
    textColor: "text-info-muted-foreground",
    borderColor: "border-info/20",
  },
  maintenance: {
    label: "Manutenção",
    dotColor: "bg-status-yellow",
    bgColor: "bg-status-yellow-muted",
    textColor: "text-status-yellow-muted-foreground",
    borderColor: "border-status-yellow/20",
  },
  written_off: {
    label: "Baixado",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },

  // Keyring Status
  lost: {
    label: "Perdido",
    dotColor: "bg-status-red",
    bgColor: "bg-status-red-muted",
    textColor: "text-status-red-muted-foreground",
    borderColor: "border-status-red/20",
  },
  retired: {
    label: "Aposentado",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },

  // Ticket Status
  waiting: {
    label: "Aguardando",
    dotColor: "bg-status-yellow",
    bgColor: "bg-status-yellow-muted",
    textColor: "text-status-yellow-muted-foreground",
    borderColor: "border-status-yellow/20",
  },
  paused: {
    label: "Pausado",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },
  in_progress: {
    label: "Em andamento",
    dotColor: "bg-info",
    bgColor: "bg-info-muted",
    textColor: "text-info-muted-foreground",
    borderColor: "border-info/20",
  },
  done: {
    label: "Concluído",
    dotColor: "bg-status-green",
    bgColor: "bg-status-green-muted",
    textColor: "text-status-green-muted-foreground",
    borderColor: "border-status-green/20",
  },
  discarded: {
    label: "Descartado",
    dotColor: "bg-status-red",
    bgColor: "bg-status-red-muted",
    textColor: "text-status-red-muted-foreground",
    borderColor: "border-status-red/20",
  },

  // Initiative Status
  planned: {
    label: "Planejada",
    dotColor: "bg-status-gray",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },
  blocked: {
    label: "Bloqueada",
    dotColor: "bg-status-red",
    bgColor: "bg-status-red-muted",
    textColor: "text-status-red-muted-foreground",
    borderColor: "border-status-red/20",
  },

  // Generic Status
  inactive: {
    label: "Inativo",
    dotColor: "bg-status-gray",
    bgColor: "bg-status-gray-muted",
    textColor: "text-status-gray-muted-foreground",
    borderColor: "border-status-gray/20",
  },
  pending: {
    label: "Pendente",
    dotColor: "bg-status-yellow",
    bgColor: "bg-status-yellow-muted",
    textColor: "text-status-yellow-muted-foreground",
    borderColor: "border-status-yellow/20",
  },
  error: {
    label: "Erro",
    dotColor: "bg-status-red",
    bgColor: "bg-status-red-muted",
    textColor: "text-status-red-muted-foreground",
    borderColor: "border-status-red/20",
  },
  success: {
    label: "Sucesso",
    dotColor: "bg-status-green",
    bgColor: "bg-status-green-muted",
    textColor: "text-status-green-muted-foreground",
    borderColor: "border-status-green/20",
  },
  warning: {
    label: "Alerta",
    dotColor: "bg-status-yellow",
    bgColor: "bg-status-yellow-muted",
    textColor: "text-status-yellow-muted-foreground",
    borderColor: "border-status-yellow/20",
  },
};

// ============= Helper Functions =============

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.inactive;
}

export function getStatusLabel(status: string): string {
  return STATUS_CONFIGS[status]?.label || status;
}

export function getStatusDotColor(status: string): string {
  return STATUS_CONFIGS[status]?.dotColor || "bg-muted-foreground";
}

// ============= StatusBadge Component =============

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
  showDot?: boolean;
  customLabel?: string;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  showDot = true,
  customLabel,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const label = customLabel || config.label;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        size === "sm" && "px-1.5 py-0 text-[10px]",
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full",
            config.dotColor,
            size === "sm" ? "w-1.5 h-1.5 mr-1" : "w-2 h-2 mr-1.5"
          )}
        />
      )}
      {label}
    </Badge>
  );
}

// ============= StatusDot Component =============

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function StatusDot({ status, size = "sm", className, ...props }: StatusDotProps) {
  const config = getStatusConfig(status);
  const sizeClasses = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span
      className={cn("rounded-full", config.dotColor, sizeClasses[size], className)}
      {...props}
    />
  );
}

// Export status configs for reuse
export { STATUS_CONFIGS };
