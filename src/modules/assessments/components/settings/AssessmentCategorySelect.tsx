/**
 * Select unificado de categoria de avaliação.
 * Padrão alinhado a TicketCategorySelect (sem o conceito de scope).
 */
import { memo, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAssessmentCategories } from "../hooks/useAssessmentCategoriesData";

interface AssessmentCategorySelectProps {
  value: string | "all" | "none" | "";
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeNone?: boolean;
  noneLabel?: string;
  /** Se true, oculta categorias inativas (default true) */
  hideInactive?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

function AssessmentCategorySelectImpl({
  value,
  onValueChange,
  placeholder = "Categoria",
  includeAll = false,
  allLabel = "Todas as categorias",
  includeNone = false,
  noneLabel = "Sem categoria",
  hideInactive = true,
  disabled = false,
  className,
  triggerClassName,
}: AssessmentCategorySelectProps) {
  const { data = [], isLoading } = useAssessmentCategories();

  const options = useMemo(
    () => (hideInactive ? data.filter((c) => c.status === "active") : data),
    [data, hideInactive],
  );

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={cn("w-[200px]", triggerClassName, className)}>
        <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {includeNone && <SelectItem value="none">{noneLabel}</SelectItem>}
        {options.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const AssessmentCategorySelect = memo(AssessmentCategorySelectImpl);
