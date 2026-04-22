/**
 * Types compartilhados entre os módulos do okr-construction-review.
 *
 * Mantenha aqui APENAS interfaces de payload/resultado. Lógica de
 * parsing fica em ./parsers.ts e orquestração em ./index.ts.
 */

export interface KeyResult {
  id: string;
  title: string;
  type: string | null;
  baseline: number | null;
  target: number | null;
  unit: string | null;
  owner_user_id: string | null;
}

export interface RequestBody {
  buId?: string;
  mode?: 'objective' | 'team-analysis' | 'org-objective';
  isOrgLevel?: boolean;
  objectiveId?: string;
  objectiveTitle?: string;
  objectiveDescription?: string;
  teamName?: string;
  orgObjectiveTitle?: string;
  keyResults?: KeyResult[];
  year?: number;
  teamId?: string;
  cycleId?: string;
  objectives?: Array<{
    id: string;
    title: string;
    description?: string;
    orgObjectiveId?: string;
    orgObjectiveTitle?: string;
    teamId?: string;
    teamName?: string;
    keyResults: Array<{
      id: string;
      title: string;
      type: string | null;
      baseline: number | null;
      target: number | null;
      unit: string | null;
      hasOwner: boolean;
    }>;
  }>;
  orgObjectives?: Array<{
    id: string;
    title: string;
    description?: string;
    keyResults?: Array<{
      id: string;
      title: string;
      baseline: number | null;
      target: number | null;
      unit: string | null;
    }>;
  }>;
  otherTeamsObjectives?: Array<{
    teamId: string;
    teamName: string;
    leaderFirstName: string;
    objectives: Array<{
      id: string;
      title: string;
    }>;
  }>;
}

export interface KrFeedback {
  krId: string;
  krTitle: string;
  score: number;
  strengths: string[];
  improvements: string[];
  isTask: boolean;
}

export interface CriteriaScore {
  score: number;
  feedback: string;
}

export interface AiAssessment {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  alignmentSuggestion: string;
  criteriaScores: {
    clarity: CriteriaScore;
    measurability: CriteriaScore;
    ambition: CriteriaScore;
    alignment: CriteriaScore;
    ownership: CriteriaScore;
  };
  krFeedback: KrFeedback[];
  generatedAt: string;
}

export interface SharedObjectiveSuggestion {
  objectiveId: string;
  objectiveTitle: string;
  suggestedTeamId: string;
  suggestedTeamName: string;
  suggestedLeaderFirstName: string;
  suggestedObjectiveId: string;
  suggestedObjectiveTitle: string;
  reason: string;
}

export interface TeamAnalysisResult {
  consolidatedScore: number;
  consolidatedSummary: string;
  orgAlignmentAnalysis: {
    score: number;
    coveredOrgObjectives: string[];
    uncoveredOrgObjectives: string[];
    feedback: string;
  };
  sharedSuggestions: SharedObjectiveSuggestion[];
  generatedAt: string;
}
