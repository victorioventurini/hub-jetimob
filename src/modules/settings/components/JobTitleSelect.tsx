import { forwardRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useActiveJobTitles } from "../hooks/useJobTitles";
import { cn } from "@/lib/utils";

interface JobTitleSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeEmpty?: boolean;
  emptyLabel?: string;
}

export const JobTitleSelect = forwardRef<HTMLButtonElement, JobTitleSelectProps>(
  (
    {
      value,
      onValueChange,
      placeholder = "Selecione um cargo",
      disabled,
      className,
      includeEmpty = false,
      emptyLabel = "Nenhum",
    },
    ref
  ) => {
    const { data: jobTitles, isLoading, error } = useActiveJobTitles();

    if (isLoading) {
      return <Skeleton className={cn("h-10 w-full", className)} />;
    }

    if (error) {
      return (
        <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
          <AlertCircle className="h-4 w-4" />
          Erro ao carregar cargos
        </div>
      );
    }

    const hasJobTitles = jobTitles && jobTitles.length > 0;

    if (!hasJobTitles && !includeEmpty) {
      return (
        <div className={cn("flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md bg-muted/50", className)}>
          <AlertCircle className="h-4 w-4" />
          Nenhum cargo cadastrado. Cadastre cargos em Configurações → Cargos.
        </div>
      );
    }

    return (
      <Select value={value || ""} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger ref={ref} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeEmpty && (
            <SelectItem value="__empty__">{emptyLabel}</SelectItem>
          )}
          {(jobTitles || []).map((jt) => (
            <SelectItem key={jt.id} value={jt.id}>
              {jt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

JobTitleSelect.displayName = "JobTitleSelect";
