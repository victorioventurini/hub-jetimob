import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface YearSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  years?: number[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Centralized year select component.
 * Generates years dynamically if not provided.
 */
export function YearSelect({
  value,
  onValueChange,
  years: customYears,
  disabled = false,
  className,
  triggerClassName,
}: YearSelectProps) {
  const currentYear = new Date().getFullYear();
  const years = customYears ?? [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Select
      value={value.toString()}
      onValueChange={(v) => onValueChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[100px]", triggerClassName, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
