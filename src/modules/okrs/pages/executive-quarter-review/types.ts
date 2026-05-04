export type QuarterCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'closed';
  qbr_status: string | null;
};

export type TeamObjectiveRow = {
  id: string;
  title: string;
  team_id: string;
  team: {
    id: string;
    name: string;
    area_id: string | null;
    area: { id: string; name: string; color: string | null } | null;
  } | null;
  key_results: Array<{
    id: string;
    title: string;
    baseline: number | null;
    current_value: number | null;
    target: number | null;
    direction: 'up' | 'down' | null;
    unit: string | null;
    status: 'green' | 'yellow' | 'red' | 'not_started' | null;
    last_checkin_at: string | null;
  }>;
};

export type RitualSessionRow = {
  id: string;
  team_id: string | null;
  wizard_type: string;
  completed_at: string | null;
  decisions: Array<{ id?: string; text?: string; title?: string }> | null;
  reflection_data: Record<string, any> | null;
  addendums: Array<{ text?: string; created_at?: string; created_by?: string }> | null;
};

export type TeamStat = {
  objective: TeamObjectiveRow;
  krs: TeamObjectiveRow['key_results'];
  avgProgress: number;
  healthScore: number;
  healthStatus: 'healthy' | 'attention' | 'risk';
};

export type AreaGroup = {
  areaName: string;
  areaColor: string | null;
  teams: Array<{
    teamId: string;
    teamName: string;
    objectives: TeamStat[];
    healthScore: number;
    avgProgress: number;
    healthStatus: 'healthy' | 'attention' | 'risk';
  }>;
  healthScoreAvg: number;
};
