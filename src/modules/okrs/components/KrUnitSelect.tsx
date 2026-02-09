// ============================================================
// KrUnitSelect - Deprecated wrapper for UnitSelect
// ============================================================
// @deprecated Use UnitSelect from '@/components/selects' instead
// This component is maintained for backward compatibility only.
// ============================================================

import { UnitSelect } from '@/components/selects/UnitSelect';

interface KrUnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * @deprecated Use UnitSelect from '@/components/selects' instead
 */
export function KrUnitSelect({ value, onChange, disabled }: KrUnitSelectProps) {
  return (
    <UnitSelect
      value={value}
      onChange={onChange}
      disabled={disabled}
      showLabel={true}
      showCustomOption={true}
    />
  );
}
