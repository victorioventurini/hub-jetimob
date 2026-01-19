import { OkrRagStatus } from "../../types";

export interface CheckinKrData {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: 'up' | 'down' | 'maintain';
  unit: string;
  status: OkrRagStatus;
  team_id: string;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
  team_objective?: {
    title: string;
    cycle_id?: string | null;
  };
  last_checkin_at?: string | null;
  metric_id?: string | null;
  is_shared?: boolean;
  team_name?: string;
}

export type CheckinStatus = 'green' | 'yellow' | 'red';

export const STATUS_CONFIG: Record<CheckinStatus, { 
  label: string; 
  description: string; 
  iconType: 'check' | 'warning' | 'error';
}> = {
  green: {
    label: 'On Track',
    description: 'Progresso conforme esperado',
    iconType: 'check',
  },
  yellow: {
    label: 'At Risk',
    description: 'Risco de não atingir a meta',
    iconType: 'warning',
  },
  red: {
    label: 'Off Track',
    description: 'Meta não será atingida sem mudança clara',
    iconType: 'error',
  },
};
