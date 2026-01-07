import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface UrlDateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /** Callback alternativo que recebe ambas as datas */
  onChange?: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Date Range Picker integrado com URL state
 * - Formato de data: YYYY-MM-DD
 * - Exibe datas no formato local (dd/MM/yyyy)
 * - Suporte a clear
 */
export function UrlDateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onChange,
  placeholder = "Selecione período...",
  className,
  disabled = false,
}: UrlDateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const parsedStart = startDate ? parseISO(startDate) : undefined;
  const parsedEnd = endDate ? parseISO(endDate) : undefined;

  const dateRange: DateRange | undefined =
    parsedStart || parsedEnd
      ? {
          from: isValid(parsedStart) ? parsedStart : undefined,
          to: isValid(parsedEnd) ? parsedEnd : undefined,
        }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    const newStart = range?.from ? format(range.from, "yyyy-MM-dd") : "";
    const newEnd = range?.to ? format(range.to, "yyyy-MM-dd") : "";

    if (onChange) {
      onChange(newStart, newEnd);
    } else {
      onStartChange(newStart);
      onEndChange(newEnd);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange("", "");
    } else {
      onStartChange("");
      onEndChange("");
    }
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date || !isValid(date)) return null;
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const displayText = () => {
    const startText = formatDisplayDate(parsedStart);
    const endText = formatDisplayDate(parsedEnd);

    if (startText && endText) {
      return `${startText} - ${endText}`;
    }
    if (startText) {
      return `A partir de ${startText}`;
    }
    if (endText) {
      return `Até ${endText}`;
    }
    return null;
  };

  const hasValue = startDate || endDate;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            "min-w-[240px] justify-start text-left font-normal",
            !hasValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">
            {displayText() || placeholder}
          </span>
          {hasValue && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:text-destructive"
              aria-label="Limpar período"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ptBR}
          initialFocus
        />
        {hasValue && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => {
                handleClear({ stopPropagation: () => {} } as React.MouseEvent);
                setOpen(false);
              }}
            >
              Limpar período
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
