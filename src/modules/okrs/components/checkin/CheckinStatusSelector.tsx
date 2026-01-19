import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RAG_STATUS_COLORS } from "@/lib/colors";
import type { CheckinStatus, STATUS_CONFIG } from "./checkinTypes";

interface CheckinStatusSelectorProps {
  status: CheckinStatus;
  onStatusChange: (status: CheckinStatus) => void;
}

const statusConfig: Record<CheckinStatus, { 
  label: string; 
  description: string; 
  icon: typeof CheckCircle2; 
  colorClass: string;
  bgClass: string;
}> = {
  green: {
    label: 'On Track',
    description: 'Progresso conforme esperado',
    icon: CheckCircle2,
    colorClass: RAG_STATUS_COLORS.green.text,
    bgClass: `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
  },
  yellow: {
    label: 'At Risk',
    description: 'Risco de não atingir a meta',
    icon: AlertTriangle,
    colorClass: RAG_STATUS_COLORS.yellow.text,
    bgClass: `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
  },
  red: {
    label: 'Off Track',
    description: 'Meta não será atingida sem mudança clara',
    icon: XCircle,
    colorClass: RAG_STATUS_COLORS.red.text,
    bgClass: `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
  },
};

export function CheckinStatusSelector({ status, onStatusChange }: CheckinStatusSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Status atual *</Label>
      <div className="grid grid-cols-3 gap-2">
        {(['green', 'yellow', 'red'] as CheckinStatus[]).map((s) => {
          const config = statusConfig[s];
          const Icon = config.icon;
          const isSelected = status === s;
          
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                isSelected 
                  ? cn(config.bgClass, 'border-current', config.colorClass)
                  : 'border-border hover:border-muted-foreground/50 bg-background'
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isSelected && config.colorClass)} />
              <p className={cn("text-sm font-medium", isSelected && config.colorClass)}>
                {config.label}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {config.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
