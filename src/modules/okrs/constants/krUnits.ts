// ============================================================
// KR UNITS - Re-export from shared constants for backward compatibility
// ============================================================
// @deprecated Import from '@/shared/constants/units' instead
// This file is maintained for backward compatibility only.
// ============================================================

import {
  UNIT_CATEGORIES,
  ALL_UNITS as SHARED_ALL_UNITS,
  getUnitLabel as sharedGetUnitLabel,
  formatValueWithUnit as sharedFormatValueWithUnit,
  type UnitOption,
  type UnitCategory,
} from '@/shared/constants/units';

// Re-export with original names for backward compatibility
/** @deprecated Use UnitOption from '@/shared/constants/units' */
export type KrUnitOption = UnitOption;

/** @deprecated Use UnitCategory from '@/shared/constants/units' */
export type KrUnitCategory = UnitCategory;

/** @deprecated Use UNIT_CATEGORIES from '@/shared/constants/units' */
export const KR_UNIT_CATEGORIES = UNIT_CATEGORIES;

/** @deprecated Use ALL_UNITS from '@/shared/constants/units' */
export const ALL_UNITS = SHARED_ALL_UNITS;

/** @deprecated Use getUnitLabel from '@/shared/constants/units' */
export const getUnitLabel = sharedGetUnitLabel;

/** @deprecated Use formatValueWithUnit from '@/shared/constants/units' */
export const formatValueWithUnit = sharedFormatValueWithUnit;
