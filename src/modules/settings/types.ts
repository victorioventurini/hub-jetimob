/**
 * Job Titles Module Types
 * Cargos globais com associação multi-BU
 * @updated Wave 2.6 - Convertido para bu_ids[] (multi-BU)
 */

export interface JobTitle {
  id: string;
  bu_ids: string[];
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
  bu_ids: string[];
}

export interface JobTitleWithUsageCount extends JobTitle {
  usage_count: number;
}
