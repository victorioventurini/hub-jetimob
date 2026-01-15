/**
 * Organogram Query Keys
 */
export const organogramKeys = {
  all: (buId: string | null) => ['organogram', buId] as const,
  data: (buId: string | null) => ['organogram', 'data', buId] as const,
  ceo: (buId: string | null) => ['organogram', 'ceo', buId] as const,
} as const;
