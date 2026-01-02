export type KpiCategory = 'financeiro' | 'growth' | 'cs' | 'produto' | 'operacoes' | 'pessoas';
export type KpiDirection = 'up' | 'down';
export type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type KpiStatus = 'active' | 'inactive';
export type KpiValueSource = 'manual' | 'integration' | 'calculation';

export interface KpiMetric {
  id: string;
  name: string;
  description: string | null;
  category: KpiCategory;
  owner_user_id: string | null;
  team_id: string | null;
  unit: string;
  direction: KpiDirection;
  frequency: KpiFrequency;
  target_value: number | null;
  status: KpiStatus;
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

export const FREQUENCY_LABELS: Record<KpiFrequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

export const DIRECTION_LABELS: Record<KpiDirection, string> = {
  up: 'Crescente',
  down: 'Decrescente',
};
