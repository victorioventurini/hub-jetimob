/**
 * Job Titles Module Types
 * Cargos padronizados por BU(s)
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
  bu_ids?: string[]; // Para criação/edição multi-BU
}

export interface JobTitleWithUsageCount extends JobTitle {
  usage_count: number;
}
