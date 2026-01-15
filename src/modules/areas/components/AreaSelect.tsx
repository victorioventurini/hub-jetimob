/**
 * AreaSelect - Dropdown to select an area
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useAreas } from "../hooks";

interface AreaSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  includeInactive?: boolean;
  allowClear?: boolean;
}

export function AreaSelect({
  value,
  onChange,
  placeholder = "Selecione uma área",
  disabled = false,
  includeInactive = false,
  allowClear = true,
}: AreaSelectProps) {
  const { data: areas, isLoading } = useAreas({ includeInactive });

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value && areas?.find((a) => a.id === value)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="none">
            <span className="text-muted-foreground">Nenhuma área</span>
          </SelectItem>
        )}
        {areas?.map((area) => (
          <SelectItem key={area.id} value={area.id}>
            <div className="flex items-center gap-2">
              <Building2
                className="h-4 w-4"
                style={{ color: area.color || "currentColor" }}
              />
              <span>{area.name}</span>
              {area.status === "inactive" && (
                <span className="text-muted-foreground text-xs">(Inativa)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {!isLoading && (!areas || areas.length === 0) && (
          <div className="py-2 px-2 text-sm text-muted-foreground text-center">
            Nenhuma área cadastrada
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
