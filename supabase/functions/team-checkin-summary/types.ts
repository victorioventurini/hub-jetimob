// Types shared across team-checkin-summary modules

export interface TeamCheckinSummaryRequest {
  teamId: string;
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

export interface CycleInfo {
  id: string;
  name: string;
  type: 'month' | 'quarter' | 'semester' | 'year';
  startDate: Date;
  endDate: Date;
}

export interface PaceAnalysis {
  status: 'above_pace' | 'on_pace' | 'below_pace' | 'not_started' | 'completed';
  label: string;
  expectedProgress: number;
  cycleElapsed: number;
  interpretation: string;
}

export interface ObjectiveSummary {
  title: string;
  status: string;
  progress: number;
  paceStatus: string;
  paceInterpretation: string;
}

export interface KrHighlight {
  title: string;
  objectiveTitle: string;
  status: string;
  currentValue: number | null;
  targetValue: number | null;
  progress: number;
  paceStatus: string;
  paceInterpretation: string;
}

export interface KpiSummary {
  name: string;
  currentValue: number | null;
  targetValue: number | null;
  status: string;
  isPrimary: boolean;
  linkedKrCycle?: string;
}

export interface DecisionSummary {
  text: string;
  type: 'decision' | 'initiative' | 'risk';
}

export interface PendingUpdate {
  entityType: 'kr' | 'kpi';
  title: string;
  lastUpdated: string | null;
}

export interface AgentContextData {
  teamName: string;
  cycleName: string;
  cycleType: string;
  cycleElapsedPercent: number;
  buName: string;
  objectives: ObjectiveSummary[];
  krsHighlight: KrHighlight[];
  kpisRelevant: KpiSummary[];
  decisions: DecisionSummary[];
  pendingUpdates: PendingUpdate[];
  paceGuidance: string;
}

export interface AgentSections {
  opening_text: string;
  objectives_summary: string;
  krs_highlight: string;
  kpis_summary: string;
  initiatives_summary: string;
  risks_summary: string;
  next_focus: string;
  culture_message: string;
  closing_text: string;
}
