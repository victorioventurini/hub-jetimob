import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface UrlMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  maxDisplayItems?: number;
  disabled?: boolean;
}

/**
 * Multi-select integrado com URL state (arrays)
 * - Múltipla seleção via checkbox
 * - Exibe badges com valores selecionados
 * - Botão de limpar individual e geral
 */
export function UrlMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className,
  maxDisplayItems = 2,
  disabled = false,
}: UrlMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const removeValue = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-w-[180px] justify-between",
            value.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-1 truncate">
            {value.length === 0 ? (
              placeholder
            ) : value.length <= maxDisplayItems ? (
              <span className="flex items-center gap-1 flex-wrap">
                {selectedLabels.map((label, i) => (
                  <Badge
                    key={value[i]}
                    variant="secondary"
                    className="px-1.5 py-0 text-xs font-normal"
                  >
                    {label}
                    <button
                      onClick={(e) => removeValue(value[i], e)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </span>
            ) : (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {value.length} selecionados
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1">
            {value.length > 0 && (
              <button
                onClick={clearAll}
                className="p-0.5 hover:text-destructive"
                aria-label="Limpar seleção"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="max-h-[300px] overflow-auto p-1">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-muted",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Checkbox
                checked={value.includes(option.value)}
                onCheckedChange={() => !option.disabled && toggleOption(option.value)}
                disabled={option.disabled}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
            >
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
