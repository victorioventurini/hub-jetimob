import type { OkrRagStatus } from "../../types";

/**
 * Escopo do check-in:
 *  - 'team' → persiste em `okr_checkins` e atualiza `okr_team_key_results`
 *  - 'org'  → persiste em `okr_org_checkins` e atualiza `okr_org_key_results`
 *
 * O `CheckinDialog` é polimórfico e ramifica pela propriedade `scope`.
 */
export type CheckinKrScope = 'team' | 'org';

export interface CheckinKrData {
  id: string;
  /** Default 'team' quando ausente (retrocompatível). */
  scope?: CheckinKrScope;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: 'up' | 'down' | 'maintain';
  unit: string;
  status: OkrRagStatus;
  /** Obrigatório para scope='team'; omitido em scope='org'. */
  team_id?: string;
  owner?: {
    display_name: string;
    photo_url?: string | null;
  };
  /** Objetivo pai do KR de time. */
  team_objective?: {
    title: string;
    cycle_id?: string | null;
  };
  /** Objetivo pai do KR organizacional (preenchido em scope='org'). */
  org_objective?: {
    title: string;
  };
  last_checkin_at?: string | null;
  metric_id?: string | null;
  is_shared?: boolean;
  team_name?: string;
  /** Owner profile id — usado para gating de permissão na UI/RLS. */
  owner_user_id?: string | null;
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
