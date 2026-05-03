/**
 * ReferenceMonthPicker — seletor compacto do mês alvo dos ritos MBR-Pre / MBR.
 *
 * Renderiza os últimos N meses fechados (default 12) usando `Select` do design
 * system. O default exibido é `defaultReferenceMonth()` (mês imediatamente
 * anterior ao corrente).
 *
 * Reutilizável em qualquer wizard que opere sobre janela mensal fechada.
 */

import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { lastNClosedMonths, formatMonthLabel } from '@/modules/okrs/utils/mbr/referenceMonth';

export interface ReferenceMonthPickerProps {
  /** YYYY-MM */
  value: string;
  onChange: (next: string) => void;
  /** Quantos meses fechados oferecer (default: 12). */
  monthsCount?: number;
  /** Desabilita o seletor (ex.: quando rito já está completo). */
  disabled?: boolean;
  className?: string;
}

export function ReferenceMonthPicker({
  value,
  onChange,
  monthsCount = 12,
  disabled = false,
  className,
}: ReferenceMonthPickerProps) {
  const options = useMemo(() => {
    const list = lastNClosedMonths(monthsCount);
    // Garante que o `value` atual esteja na lista (ex.: mês mais antigo restaurado de draft).
    if (value && !list.some((o) => o.value === value)) {
      list.push({ value, label: formatMonthLabel(value) });
    }
    return list;
  }, [monthsCount, value]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className} aria-label="Mês de referência">
        <CalendarRange className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Selecione o mês" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="capitalize">{opt.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
