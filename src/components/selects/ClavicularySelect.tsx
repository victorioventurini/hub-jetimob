import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKeys } from "@/modules/assets/hooks/useKeys";
import { cn } from "@/lib/utils";

interface ClavicularySelectProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  includeAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function ClavicularySelect({
  value,
  onValueChange,
  includeAll = false,
  allLabel = "Todos",
  placeholder = "Selecione...",
  triggerClassName,
  disabled = false,
}: ClavicularySelectProps) {
  const { clavicularies } = useKeys();

  const handleChange = (val: string) => {
    if (val === "__all__") {
      onValueChange(undefined);
    } else {
      onValueChange(val);
    }
  };

  return (
    <Select
      value={value || (includeAll ? "__all__" : undefined)}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[200px]", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="__all__">{allLabel}</SelectItem>
        )}
        {clavicularies.map((clav) => (
          <SelectItem key={clav.id} value={clav.id}>
            {clav.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
