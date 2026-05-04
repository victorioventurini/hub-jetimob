// Types for mbr-summary

export interface MbrSummaryRequest {
  cycleId: string;
  sessionId: string;
  bu_id: string;
}

export interface MbrAgentContext {
  buName: string;
  referenceMonth: string;
  criticalKpis: Array<{
    name: string;
    currentValue: number | null;
    target: number | null;
    ragStatus: string;
    variationVsLastMonth: number | null;
    impactAssessment?: string;
  }>;
  orgOkrsSummary: Array<{
    title: string;
    progress: number;
    trend: string;
    remainsStrategicPriority: boolean;
  }>;
  decisions: Array<{
    text: string;
    category: string;
  }>;
  checklist: {
    strategicFocusClear: boolean;
    nextStepsHaveOwners: boolean;
    nonPrioritiesClear: boolean;
    communicateInAllHands: boolean;
  };
}

export interface MbrSections {
  opening_text: string;
  critical_kpis_summary: string;
  strategic_decisions: string;
  focus_adjustments: string;
  next_steps: string;
  monthly_directives: string;
  closing_text: string;
}
