// Types for collaborator-checkin-summary

export interface CollaboratorSummaryRequest {
  sessionId: string;
  bu_id: string;
}

export interface CollaboratorAgentContext {
  buName: string;
  userName: string;
  cycleName: string;
  krResults: Array<{
    title: string;
    previousValue: number | null;
    newValue: number | null;
    targetValue: number | null;
    progress: number;
    comment: string;
  }>;
  kpiResults: Array<{
    name: string;
    value: number | null;
    target: number | null;
  }>;
  reflection: {
    wins?: string;
    blockers?: string;
    learnings?: string;
    needsHelp?: string;
  };
}

export interface CollaboratorSections {
  opening_text: string;
  kr_summary: string;
  kpi_summary: string;
  reflection_insights: string;
  closing_text: string;
}
