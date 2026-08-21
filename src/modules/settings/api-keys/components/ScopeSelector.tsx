import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BU_API_MODULES, type BuApiAccessLevel } from '../scopes';

interface ScopeSelectorProps {
  levels: Record<string, BuApiAccessLevel>;
  onChange: (moduleKey: string, level: BuApiAccessLevel) => void;
}

export const ScopeSelector = memo(function ScopeSelector({
  levels,
  onChange,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-3">
      {BU_API_MODULES.map((mod) => (
        <div
          key={mod.key}
          className="rounded-lg border p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{mod.label}</p>
            <p className="text-xs text-muted-foreground">{mod.description}</p>
          </div>
          <RadioGroup
            value={levels[mod.key] ?? 'none'}
            onValueChange={(value) => onChange(mod.key, value as BuApiAccessLevel)}
            className="flex items-center gap-4 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="none" id={`${mod.key}-none`} />
              <Label htmlFor={`${mod.key}-none`} className="text-xs font-normal">
                Sem acesso
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="read" id={`${mod.key}-read`} />
              <Label htmlFor={`${mod.key}-read`} className="text-xs font-normal">
                Leitura
              </Label>
            </div>
            {mod.supportsWrite && (
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="write" id={`${mod.key}-write`} />
                <Label htmlFor={`${mod.key}-write`} className="text-xs font-normal">
                  Leitura e escrita
                </Label>
              </div>
            )}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
});
