// OKR Health Score Types

import { HEALTH_STATUS_COLORS } from '@/lib/colors';

export type HealthStatus = 'healthy' | 'attention' | 'risk';

export interface HealthComponents {
  progress: number;
  confidence: number;
  cadence: number;
  kpi_trend: number;
  initiatives_flow: number;
}

export interface HealthMeta {
  computed_at: string;
  kr_count: number;
  active_kr_count: number;
  stale_count?: number;
  no_krs?: boolean;
}

export interface ObjectiveHealthData {
  score: number;
  status: HealthStatus;
  components: HealthComponents;
  meta: HealthMeta;
}

export interface OkrInsight {
  id: string;
  bu_id: string;
  scope_type: 'org_objective' | 'team_objective' | 'org_kr' | 'team_kr';
  scope_id: string;
  severity: 'info' | 'warning' | 'critical';
  code: string;
  title: string;
  message: string;
  suggested_actions?: SuggestedAction[];
  source: 'rules' | 'ai';
  created_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
}

export interface SuggestedAction {
  label: string;
  type: 'navigate' | 'open_modal' | 'action';
  payload?: Record<string, unknown>;
}

export interface OkrCoachingEvent {
  id: string;
  bu_id: string;
  user_id: string;
  context_type: 'dashboard' | 'objective' | 'kr' | 'checkin' | 'planning';
  context_id?: string | null;
  agent_slug?: string | null;
  insight_id?: string | null;
  event_type: 'shown' | 'clicked' | 'dismissed' | 'applied';
  payload?: Record<string, unknown>;
  created_at: string;
}

export function getHealthStatusConfig(status: HealthStatus) {
  const statusMap: Record<HealthStatus, { label: string; emoji: string }> = {
    healthy: { label: 'Saudável', emoji: '🟢' },
    attention: { label: 'Atenção', emoji: '🟡' },
    risk: { label: 'Em Risco', emoji: '🔴' },
  };
  
  const colors = HEALTH_STATUS_COLORS[status];
  const config = statusMap[status];
  
  return {
    label: config.label,
    emoji: config.emoji,
    color: colors.text,
    bgColor: colors.bg,
    borderColor: colors.border,
  };
}
