/**
 * Job Titles Module Types
 * Cargos padronizados por BU (1 cargo por BU)
 * @updated Wave 2.5 - Normalizado de bu_ids[] para bu_id
 */

export interface JobTitle {
  id: string;
  bu_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface JobTitleFormData {
  name: string;
  description?: string;
  is_active: boolean;
}

export interface JobTitleWithUsageCount extends JobTitle {
  usage_count: number;
}
