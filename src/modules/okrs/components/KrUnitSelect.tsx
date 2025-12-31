import { useState } from 'react';
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
import { KR_UNIT_CATEGORIES } from '../constants/krUnits';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface KrUnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function KrUnitSelect({ value, onChange, disabled }: KrUnitSelectProps) {
  const [isCustom, setIsCustom] = useState(
    !KR_UNIT_CATEGORIES.flatMap((c) => c.options)
      .map((o) => o.value)
      .includes(value) && value !== 'custom'
  );
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom') {
      setIsCustom(true);
      onChange(customValue || '');
    } else {
      setIsCustom(false);
      onChange(newValue);
    }
  };

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="unit">Unidade</Label>
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
      
      {!isCustom ? (
        <Select
          value={value === '' || isCustom ? 'custom' : value}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma unidade" />
          </SelectTrigger>
          <SelectContent>
            {KR_UNIT_CATEGORIES.map((category) => (
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
            onClick={() => {
              setIsCustom(false);
              onChange('%');
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
