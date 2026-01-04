export type KpiCategory = 'financeiro' | 'growth' | 'cs' | 'produto' | 'operacoes' | 'pessoas';
export type KpiDirection = 'up' | 'down';
export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'manual';
export type KpiStatus = 'active' | 'inactive';
export type KpiValueSource = 'manual' | 'api' | 'webhook' | 'spreadsheet' | 'database';
export type KpiVisibility = 'restricted' | 'team' | 'bu';
export type KpiRagStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';

export interface KpiMetric {
  id: string;
  name: string;
  description: string | null;
  category: KpiCategory;
  bu_id: string;
  owner_user_id: string | null;
  team_id: string | null;
  unit: string;
  direction: KpiDirection;
  frequency: KpiFrequency;
  target_value: number | null;
  status: KpiStatus;
  source_type: KpiValueSource;
  source_config: Record<string, unknown> | null;
  visibility: KpiVisibility;
  linked_okrs: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  owner?: {
    id: string;
    display_name: string;
    photo_url: string | null;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface KpiValue {
  id: string;
  kpi_id: string;
  value: number;
  reference_date: string;
  source: KpiValueSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KpiWithValues extends KpiMetric {
  values: KpiValue[];
  current_value: number | null;
  previous_value: number | null;
  variation: number | null;
  trend: 'up' | 'down' | 'stable';
  rag_status: KpiRagStatus;
  last_update_failed?: boolean;
}

export const CATEGORY_LABELS: Record<KpiCategory, string> = {
  financeiro: 'Financeiro',
  growth: 'Growth',
  cs: 'Customer Success',
  produto: 'Produto',
  operacoes: 'Operações',
  pessoas: 'Pessoas',
};

export const CATEGORY_COLORS: Record<KpiCategory, string> = {
  financeiro: 'bg-emerald-500',
  growth: 'bg-blue-500',
  cs: 'bg-violet-500',
  produto: 'bg-amber-500',
  operacoes: 'bg-rose-500',
  pessoas: 'bg-cyan-500',
};

export const CATEGORY_ICONS: Record<KpiCategory, string> = {
  financeiro: 'DollarSign',
  growth: 'TrendingUp',
  cs: 'Heart',
  produto: 'Package',
  operacoes: 'Settings',
  pessoas: 'Users',
};

export const FREQUENCY_LABELS: Record<KpiFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  manual: 'Manual',
};

export const DIRECTION_LABELS: Record<KpiDirection, string> = {
  up: 'Crescente',
  down: 'Decrescente',
};

export const SOURCE_TYPE_LABELS: Record<KpiValueSource, string> = {
  manual: 'Manual',
  api: 'API',
  webhook: 'Webhook',
  spreadsheet: 'Planilha',
  database: 'Banco de Dados',
};

export const SOURCE_TYPE_ICONS: Record<KpiValueSource, string> = {
  manual: 'Edit',
  api: 'Plug',
  webhook: 'Webhook',
  spreadsheet: 'Sheet',
  database: 'Database',
};

export const VISIBILITY_LABELS: Record<KpiVisibility, string> = {
  restricted: 'Restrita',
  team: 'Time',
  bu: 'Unidade de Negócio',
};

export const RAG_STATUS_CONFIG: Record<KpiRagStatus, { label: string; color: string; bgColor: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  at_risk: { label: 'Em Risco', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  off_track: { label: 'Off Track', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  no_data: { label: 'Sem Dados', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

// Calculate RAG status based on current value, target, and direction
export function calculateRagStatus(
  currentValue: number | null,
  targetValue: number | null,
  direction: KpiDirection
): KpiRagStatus {
  if (currentValue === null || targetValue === null) {
    return 'no_data';
  }

  const percentage = direction === 'up' 
    ? (currentValue / targetValue) * 100
    : (targetValue / currentValue) * 100;

  if (percentage >= 90) return 'on_track';
  if (percentage >= 70) return 'at_risk';
  return 'off_track';
}
