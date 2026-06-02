// ============================================================================
// QBR Executive Report — domain extractors and aggregators (pure functions)
// ============================================================================

import {
  buildOverallAchievement as sharedBuildOverallAchievement,
  calculateKrProgress as sharedCalculateKrProgress,
  isKrLive,
  krProgress,
  type OverallAchievement,
} from "../_shared/okr-progress.ts";

import type {
  AnalyzedTeam,
  KpiRow,
  KpiValueRow,
  KrRow,
  SessionRow,
  TeamObjectiveRow,
  TeamProposal,
} from "./types.ts";

// Re-export para retrocompatibilidade.
export const calculateKrProgress = sharedCalculateKrProgress;

export function buildTeamHealthSummary(
  teamObjectives: TeamObjectiveRow[],
  teams: Map<string, string>,
) {
  const teamMap = new Map<string, {
    name: string;
    achieved: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
    total: number;
  }>();

  for (const obj of teamObjectives) {
    const teamId = obj.team_id;
    const teamName = teams.get(teamId) || "Unknown";
    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, {
        name: teamName,
        achieved: 0,
        onTrack: 0,
        atRisk: 0,
        offTrack: 0,
        total: 0,
      });
    }
    const entry = teamMap.get(teamId)!;
    for (const kr of obj.key_results || []) {
      if (!isKrLive(kr)) continue;
      entry.total++;
      const progress = krProgress(kr);
      if (progress >= 100) entry.achieved++;
      else if (kr.status === "green") entry.onTrack++;
      else if (kr.status === "yellow") entry.atRisk++;
      else if (kr.status === "red") entry.offTrack++;
      else entry.onTrack++;
    }
  }

  return Array.from(teamMap.values());
}

export function buildOverallAchievement(
  teamObjectives: TeamObjectiveRow[],
  teams: Map<string, string>,
): OverallAchievement {
  return sharedBuildOverallAchievement(teamObjectives, teams);
}

export function buildKpiSummary(kpis: KpiRow[]) {
  return kpis.map((kpi) => {
    const values = (kpi.values || []).slice().sort(
      (a: KpiValueRow, b: KpiValueRow) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
    const latest = values[0];
    return {
      name: kpi.name,
      category: kpi.category,
      unit: kpi.unit,
      direction: kpi.direction,
      targetValue: kpi.target_value,
      currentValue: latest?.value ?? null,
      ragStatus: latest?.rag_status ?? null,
      periodLabel: latest?.period_label ?? null,
    };
  });
}

function unwrapData(session: SessionRow): Record<string, unknown> {
  const raw = session.reflection_data as
    | { data?: Record<string, unknown> }
    | Record<string, unknown>
    | null;
  return ((raw && "data" in (raw as object)
    ? (raw as { data?: Record<string, unknown> }).data
    : raw) || {}) as Record<string, unknown>;
}

export function extractLearnings(sessions: SessionRow[]) {
  const learnings: Array<{
    teamId: string;
    whatWorked: string;
    whatDidntWork: string;
    debts: string;
  }> = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const learn = (data.learnings as Record<string, unknown> | undefined) || {};
    learnings.push({
      teamId: session.team_id,
      whatWorked: (learn.whatWorked as string) ||
        (data.whatWorked as string) || "",
      whatDidntWork: (learn.whatDidntWork as string) ||
        (data.whatDidntWork as string) || "",
      debts: (learn.debts as string) || (data.debts as string) || "",
    });
  }
  return learnings;
}

export function extractDecisions(sessions: SessionRow[]) {
  const decisions: string[] = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const items =
      (data.decisions || data.itensDecisao || data.nextSteps || []) as unknown[];
    if (Array.isArray(items)) {
      for (const item of items) {
        const text = typeof item === "string"
          ? item
          : (item as { text?: string; title?: string })?.text ||
            (item as { text?: string; title?: string })?.title;
        if (text) decisions.push(text);
      }
    }
  }
  return decisions;
}

export function extractCLevelFlags(session: SessionRow | null | undefined) {
  if (!session) return [];
  const data = unwrapData(session);
  const flags: string[] = [];
  const calibrations =
    (data.calibrations || data.teamCalibrations || {}) as Record<
      string,
      { flag?: string }
    >;
  for (const [teamId, cal] of Object.entries(calibrations)) {
    if (cal?.flag) flags.push(`${teamId}: ${cal.flag}`);
  }
  return flags;
}

export function extractNextCycleProposals(
  sessions: SessionRow[],
  teams: Map<string, string>,
): TeamProposal[] {
  const proposals: TeamProposal[] = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const nextOkrs =
      (data.nextCycleOkrs || data.proposedOkrs || []) as Array<
        Record<string, unknown>
      >;
    const teamName = teams.get(session.team_id) || "Time";
    if (Array.isArray(nextOkrs)) {
      for (const okr of nextOkrs) {
        const objectiveAsObj = okr.objective as
          | { title?: string }
          | string
          | undefined;
        const objectiveTitle =
          (typeof objectiveAsObj === "object" ? objectiveAsObj?.title : null) ||
          (okr.title as string) ||
          (typeof objectiveAsObj === "string" ? objectiveAsObj : null) ||
          "Sem título";
        const rawKrs = (okr.draftKrs || okr.keyResults || okr.krs || []) as Array<
          { title?: string; name?: string }
        >;
        proposals.push({
          teamName,
          objectiveTitle,
          krCount: rawKrs.length,
          krs: rawKrs.map((kr) => kr.title || kr.name || "Sem título"),
        });
      }
    }
  }
  return proposals;
}

export function extractKrSummary(orgObjectives: { title: string; key_results?: KrRow[] }[]) {
  return orgObjectives.map((o) => ({
    title: o.title,
    krs: (o.key_results || []).map((kr: KrRow) => ({
      title: kr.title,
      progress: Math.round(krProgress(kr)),
      status: kr.status,
    })),
  }));
}
