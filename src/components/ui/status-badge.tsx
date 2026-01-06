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
  // RAG Status (OKRs/KPIs)
  on_track: {
    label: "No caminho",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-500/20",
  },
  at_risk: {
    label: "Em risco",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500/20",
  },
  off_track: {
    label: "Fora do caminho",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-500/20",
  },
  not_started: {
    label: "Não iniciado",
    dotColor: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },
  no_data: {
    label: "Sem dados",
    dotColor: "bg-muted-foreground",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },

  // OKR Objective Status
  draft: {
    label: "Rascunho",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-500/20",
  },
  active: {
    label: "Ativo",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-500/20",
  },
  completed: {
    label: "Concluído",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-500/20",
  },
  cancelled: {
    label: "Cancelado",
    dotColor: "bg-red-500",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    borderColor: "border-destructive/20",
  },

  // Inventory Status
  available: {
    label: "Disponível",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  loaned: {
    label: "Emprestado",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  maintenance: {
    label: "Manutenção",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  written_off: {
    label: "Baixado",
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-200 dark:border-slate-800",
  },

  // Keyring Status
  lost: {
    label: "Perdido",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-200 dark:border-red-800",
  },
  retired: {
    label: "Aposentado",
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-200 dark:border-slate-800",
  },

  // Ticket Status
  waiting: {
    label: "Aguardando",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-800 dark:text-amber-200",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  paused: {
    label: "Pausado",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    textColor: "text-slate-800 dark:text-slate-200",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
  in_progress: {
    label: "Em andamento",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-800 dark:text-blue-200",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  done: {
    label: "Concluído",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-800 dark:text-emerald-200",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  discarded: {
    label: "Descartado",
    dotColor: "bg-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-800 dark:text-red-200",
    borderColor: "border-red-200 dark:border-red-800",
  },

  // Initiative Status
  planned: {
    label: "Planejada",
    dotColor: "bg-slate-400",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },
  blocked: {
    label: "Bloqueada",
    dotColor: "bg-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-800 dark:text-red-300",
    borderColor: "border-red-200 dark:border-red-800",
  },

  // Generic Status
  inactive: {
    label: "Inativo",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-500/20",
  },
  pending: {
    label: "Pendente",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500/20",
  },
  error: {
    label: "Erro",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-500/20",
  },
  success: {
    label: "Sucesso",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-500/20",
  },
  warning: {
    label: "Alerta",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500/20",
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
