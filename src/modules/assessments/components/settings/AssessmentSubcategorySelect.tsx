/**
 * Select unificado de subcategoria de avaliação (depende de categoryId).
 */
import { memo, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAssessmentSubcategories } from "../../hooks/useAssessmentCategoriesData";

interface AssessmentSubcategorySelectProps {
  categoryId: string | null | undefined;
  value: string | "all" | "none" | "";
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  includeNone?: boolean;
  noneLabel?: string;
  hideInactive?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

function AssessmentSubcategorySelectImpl({
  categoryId,
  value,
  onValueChange,
  placeholder = "Subcategoria",
  includeAll = false,
  allLabel = "Todas as subcategorias",
  includeNone = false,
  noneLabel = "Sem subcategoria",
  hideInactive = true,
  disabled = false,
  className,
  triggerClassName,
}: AssessmentSubcategorySelectProps) {
  const { data = [], isLoading } = useAssessmentSubcategories(categoryId);
  const options = useMemo(
    () => (hideInactive ? data.filter((s) => s.status === "active") : data),
    [data, hideInactive],
  );
  const isDisabled = disabled || !categoryId || isLoading;

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger className={cn("w-[200px]", triggerClassName, className)}>
        <SelectValue placeholder={!categoryId ? "Escolha uma categoria" : isLoading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="font-medium">
            {allLabel}
          </SelectItem>
        )}
        {includeNone && <SelectItem value="none">{noneLabel}</SelectItem>}
        {options.map((sub) => (
          <SelectItem key={sub.id} value={sub.id}>
            {sub.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const AssessmentSubcategorySelect = memo(AssessmentSubcategorySelectImpl);
