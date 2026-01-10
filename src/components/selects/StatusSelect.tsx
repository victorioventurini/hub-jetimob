import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OkrStatusValue = "all" | "on_track" | "at_risk" | "off_track" | "not_started" | "green" | "yellow" | "red";

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

const OKR_STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "on_track", label: "No Caminho", color: "bg-emerald-500" },
  { value: "at_risk", label: "Em Risco", color: "bg-amber-500" },
  { value: "off_track", label: "Fora do Caminho", color: "bg-red-500" },
  { value: "not_started", label: "Não Iniciado", color: "bg-slate-400" },
];

const RAG_STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "Todos os status" },
  { value: "green", label: "No Caminho", color: "bg-emerald-500" },
  { value: "yellow", label: "Atenção", color: "bg-amber-500" },
  { value: "red", label: "Em Risco", color: "bg-red-500" },
  { value: "not_started", label: "Não Iniciado", color: "bg-slate-400" },
];

interface StatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  variant?: "okr" | "rag" | "custom";
  options?: StatusOption[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  showIndicator?: boolean;
}

/**
 * Centralized status select component with color indicators.
 * Supports OKR status, RAG status, or custom options.
 */
export function StatusSelect({
  value,
  onValueChange,
  placeholder = "Status",
  variant = "okr",
  options: customOptions,
  disabled = false,
  className,
  triggerClassName,
  showIndicator = true,
}: StatusSelectProps) {
  const options = customOptions ?? (variant === "rag" ? RAG_STATUS_OPTIONS : OKR_STATUS_OPTIONS);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[160px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <span className="flex items-center gap-2">
              {showIndicator && selectedOption.color && (
                <span className={cn("w-2 h-2 rounded-full", selectedOption.color)} />
              )}
              {selectedOption.label}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              {showIndicator && option.color && (
                <span className={cn("w-2 h-2 rounded-full", option.color)} />
              )}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { OKR_STATUS_OPTIONS, RAG_STATUS_OPTIONS };
export type { StatusOption };
