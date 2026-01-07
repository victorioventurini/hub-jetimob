import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface UrlSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** Se deve incluir opção "Todos" automaticamente */
  includeAllOption?: boolean;
  allOptionLabel?: string;
}

/**
 * Select integrado com URL state
 * - Atualiza URL ao selecionar
 * - Opção "Todos" opcional
 */
export function UrlSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className,
  triggerClassName,
  disabled = false,
  includeAllOption = false,
  allOptionLabel = "Todos",
}: UrlSelectProps) {
  const allOptions = includeAllOption
    ? [{ value: "all", label: allOptionLabel }, ...options]
    : options;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[180px]", triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
