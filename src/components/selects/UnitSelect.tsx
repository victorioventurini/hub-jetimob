import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UNIT_CATEGORIES, isKnownUnit } from '@/shared/constants/units';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for UnitSelect component
 */
export interface UnitSelectProps {
  /** Current unit value */
  value: string;
  /** Callback when unit changes */
  onChange: (value: string) => void;
  /** Disable the select */
  disabled?: boolean;
  /** Show the custom unit option (default: true) */
  showCustomOption?: boolean;
  /** Show the label above the select (default: true) */
  showLabel?: boolean;
  /** Label text (default: "Unidade") */
  label?: string;
  /** Placeholder text (default: "Selecione uma unidade") */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Canonical UnitSelect component for KRs, KPIs, and Wizards
 * 
 * Features:
 * - Grouped options by category (Financeiro, Volume, Experiência, Tempo, Taxas)
 * - Support for custom units (input field)
 * - Tooltip explaining % vs p.p.
 * - Compatible with React Hook Form via onChange
 * 
 * @example
 * // Basic usage
 * <UnitSelect value={unit} onChange={setUnit} />
 * 
 * // With React Hook Form
 * <FormField
 *   control={form.control}
 *   name="unit"
 *   render={({ field }) => (
 *     <UnitSelect value={field.value} onChange={field.onChange} showLabel={false} />
 *   )}
 * />
 */
export function UnitSelect({
  value,
  onChange,
  disabled,
  showCustomOption = true,
  showLabel = true,
  label = 'Unidade',
  placeholder = 'Selecione uma unidade',
  className,
}: UnitSelectProps) {
  // Check if current value is custom (not in predefined list)
  const isCustomValue = useMemo(() => {
    if (!value || value === 'custom') return false;
    return !isKnownUnit(value);
  }, [value]);

  const [isCustomMode, setIsCustomMode] = useState(isCustomValue);
  const [customValue, setCustomValue] = useState(isCustomValue ? value : '');

  // Filter categories based on showCustomOption prop
  const categories = useMemo(() => {
    if (showCustomOption) return UNIT_CATEGORIES;
    return UNIT_CATEGORIES.filter((cat) => cat.label !== 'Customizada');
  }, [showCustomOption]);

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom') {
      setIsCustomMode(true);
      onChange(customValue || '');
    } else {
      setIsCustomMode(false);
      onChange(newValue);
    }
  };

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue);
    onChange(newValue);
  };

  const handleBackToSelect = () => {
    setIsCustomMode(false);
    setCustomValue('');
    onChange('%'); // Default fallback
  };

  // Determine current select value
  const selectValue = useMemo(() => {
    if (isCustomMode) return 'custom';
    if (!value) return '';
    if (isKnownUnit(value)) return value;
    return 'custom';
  }, [value, isCustomMode]);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Label htmlFor="unit-select">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>% vs p.p.:</strong> Use % para valores percentuais (ex: 50% → 75%). 
                  Use p.p. (pontos percentuais) para diferenças absolutas entre percentuais 
                  (ex: aumentar 5 p.p., de 50% para 55%).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {!isCustomMode ? (
        <Select
          value={selectValue}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger id="unit-select">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectGroup key={category.label}>
                <SelectLabel className="text-xs font-semibold text-muted-foreground">
                  {category.label}
                </SelectLabel>
                {category.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Input
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Digite a unidade"
            disabled={disabled}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleBackToSelect}
            className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
