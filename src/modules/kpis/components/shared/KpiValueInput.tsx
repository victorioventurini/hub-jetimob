/**
 * KpiValueInput — input mascarado para registrar valor de KPI.
 *
 * Recebe um `value: number | undefined` e emite `onChange(number | undefined)`,
 * compatível com `react-hook-form` via `field.value` / `field.onChange`.
 *
 * A máscara é derivada da `unit` do KPI (`R$`, `%`, etc.) via
 * `getMaskConfigForUnit`. O usuário digita livremente em pt-BR; o componente
 * normaliza (parse) e re-formata on-blur.
 */
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  formatBrNumber,
  getMaskConfigForUnit,
  parseBrNumber,
  type KpiMaskConfig,
} from '../../utils/numberFormat';

export interface KpiValueInputProps {
  /** Unidade textual livre do KPI (ex.: "R$", "%", "Clientes"). */
  unit: string | null | undefined;
  /** Valor canônico (number) ou undefined quando vazio. */
  value: number | undefined | null;
  /** Disparado a cada digitação, com o número parseado (ou undefined). */
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

function formatForEdit(n: number | null | undefined, cfg: KpiMaskConfig): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  // Durante a edição mostramos só o número (sem prefixo/sufixo, que ficam
  // como adornos no wrapper) usando casas mínimas = 0 para não atrapalhar.
  return formatBrNumber(n, { decimals: 0, maxDecimals: cfg.maxDecimals });
}

function formatForBlur(n: number | null | undefined, cfg: KpiMaskConfig): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return formatBrNumber(n, { decimals: cfg.decimals, maxDecimals: cfg.maxDecimals });
}

export const KpiValueInput = forwardRef<HTMLInputElement, KpiValueInputProps>(
  function KpiValueInput(props, ref) {
    const {
      unit,
      value,
      onChange,
      onBlur,
      placeholder,
      disabled,
      id,
      name,
      className,
      ...aria
    } = props;

    const cfg = getMaskConfigForUnit(unit);
    const reactId = useId();
    const inputId = id ?? `kpi-value-${reactId}`;

    const [display, setDisplay] = useState<string>(() => formatForBlur(value ?? null, cfg));
    const lastEmittedRef = useRef<number | undefined | null>(value ?? null);

    // Sincroniza quando o `value` muda externamente (reset do form, etc.).
    useEffect(() => {
      const incoming = value ?? null;
      if (incoming !== lastEmittedRef.current) {
        setDisplay(formatForBlur(incoming, cfg));
        lastEmittedRef.current = incoming;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (raw: string) => {
      // Restringe caracteres permitidos enquanto digita.
      const allowed = raw.replace(/[^\d,.\-]/g, '');
      setDisplay(allowed);
      const parsed = parseBrNumber(allowed);
      const next = parsed === null ? undefined : parsed;
      lastEmittedRef.current = next ?? null;
      onChange(next);
    };

    const handleBlur = () => {
      const parsed = parseBrNumber(display);
      if (parsed === null) {
        setDisplay('');
        lastEmittedRef.current = null;
        onChange(undefined);
      } else {
        setDisplay(formatForBlur(parsed, cfg));
        lastEmittedRef.current = parsed;
        onChange(parsed);
      }
      onBlur?.();
    };

    return (
      <div className={cn('relative', className)}>
        {cfg.prefix && (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
            aria-hidden
          >
            {cfg.prefix}
          </span>
        )}
        <Input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            cfg.prefix && 'pl-9',
            cfg.suffix && 'pr-16',
          )}
          {...aria}
        />
        {cfg.suffix && (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground max-w-[60px] truncate"
            aria-hidden
            title={cfg.suffix}
          >
            {cfg.suffix}
          </span>
        )}
      </div>
    );
  },
);

// Re-export utilitários para uso em edição "ad-hoc" (ex.: célula inline).
export { formatForEdit, formatForBlur };
