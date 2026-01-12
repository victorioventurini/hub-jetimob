/**
 * Shared Types — Tipos reutilizáveis em todo o Hub
 */

// ============================================================
// PAGINATION
// ============================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

// ============================================================
// FILTERS
// ============================================================

export interface DateRangeFilter {
  start: string | null;
  end: string | null;
}

export interface BaseFilters {
  search?: string;
  status?: string;
  dateRange?: DateRangeFilter;
}

// ============================================================
// ENTITIES
// ============================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  deleted_at: string | null;
}

export interface BuScopedEntity extends BaseEntity {
  bu_id: string;
}

export interface OwnedEntity extends BaseEntity {
  owner_user_id: string;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// SORTING
// ============================================================

export type SortDirection = "asc" | "desc";

export interface SortParams {
  field: string;
  direction: SortDirection;
}

// ============================================================
// SELECT OPTIONS
// ============================================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface GroupedSelectOption<T = string> {
  label: string;
  options: SelectOption<T>[];
}
