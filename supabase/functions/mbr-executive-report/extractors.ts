// ============================================================================
// MBR Executive Report — domain extractors and aggregators (pure functions)
// ============================================================================

import type {
  KpiRow,
  KpiValueRow,
  KrRow,
  MbrSessionRow,
  TeamCommitment,
  TeamMonthlyHighlight,
  TeamObjectiveRow,
} from "./types.ts";

export function calculateKrProgress(
  baseline: number,
  current: number,
  target: number,
  direction: string,
): number {
  const range = Math.abs(target - baseline);
  if (range === 0) return current === target ? 100 : 0;
  const progress = direction === "down"
    ? ((baseline - current) / (baseline - target)) * 100
    : ((current - baseline) / (target - baseline)) * 100;
  return Math.round(Math.max(0, progress));
}

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
      if (kr.deleted_at || kr.cancelled_at) continue;
      entry.total++;
      const progress = calculateKrProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || "up",
      );
      if (progress >= 100) entry.achieved++;
      else if (kr.status === "green") entry.onTrack++;
      else if (kr.status === "yellow") entry.atRisk++;
      else if (kr.status === "red") entry.offTrack++;
      else entry.onTrack++;
    }
  }

  return Array.from(teamMap.values());
}

/**
 * Resume KPIs até o fim do mês de referência (descarta leituras posteriores).
 * Isso garante que o relatório do mês N não vaze dados do mês N+1.
 */
export function buildKpiSummary(kpis: KpiRow[], monthEndIso: string) {
  return kpis.map((kpi) => {
    const monthEndDate = new Date(monthEndIso).getTime();
    const eligible = (kpi.values || []).filter((v) => {
      const ref = v.reference_date || v.created_at;
      if (!ref) return false;
      return new Date(ref).getTime() <= monthEndDate;
    });
    const sorted = eligible.slice().sort(
      (a: KpiValueRow, b: KpiValueRow) =>
        new Date(b.reference_date || b.created_at || 0).getTime() -
        new Date(a.reference_date || a.created_at || 0).getTime(),
    );
    const latest = sorted[0];
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

function unwrapData(session: MbrSessionRow): Record<string, unknown> {
  const raw = session.reflection_data as
    | { data?: Record<string, unknown> }
    | Record<string, unknown>
    | null;
  return ((raw && "data" in (raw as object)
    ? (raw as { data?: Record<string, unknown> }).data
    : raw) || {}) as Record<string, unknown>;
}

/** Filtra sessões pelo `referenceMonth` capturado no draft do MBR-pré/MBR. */
export function filterSessionsByMonth(
  sessions: MbrSessionRow[],
  monthRef: string,
): MbrSessionRow[] {
  return sessions.filter((s) => {
    const data = unwrapData(s);
    return (data.referenceMonth as string | undefined) === monthRef;
  });
}

export function extractTeamCommitments(
  sessions: MbrSessionRow[],
  teams: Map<string, string>,
): TeamCommitment[] {
  const out: TeamCommitment[] = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const nextSteps = (data.nextSteps as Record<string, unknown> | undefined) || {};
    const focus = String(nextSteps.focus || "").trim();
    const prioritized = Array.isArray(nextSteps.prioritizedItems)
      ? (nextSteps.prioritizedItems as unknown[]).map((s) => String(s)).filter(Boolean)
      : [];
    const deps = Array.isArray(nextSteps.crossDependencies)
      ? (nextSteps.crossDependencies as unknown[]).map((s) => String(s)).filter(Boolean)
      : [];
    if (!focus && prioritized.length === 0 && deps.length === 0) continue;
    out.push({
      teamName: teams.get(session.team_id) || "Time",
      focus,
      prioritizedItems: prioritized,
      crossDependencies: deps,
    });
  }
  return out;
}

export function extractMonthlyHighlights(
  sessions: MbrSessionRow[],
  teams: Map<string, string>,
): TeamMonthlyHighlight[] {
  const out: TeamMonthlyHighlight[] = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const h = (data.highlights as Record<string, unknown> | undefined) || {};
    const accelerated = String(h.accelerated || "").trim();
    const blocked = String(h.blocked || "").trim();
    const needsDecision = String(h.needsDecision || "").trim();
    if (!accelerated && !blocked && !needsDecision) continue;
    out.push({
      teamName: teams.get(session.team_id) || "Time",
      accelerated,
      blocked,
      needsDecision,
    });
  }
  return out;
}

export function extractDecisions(sessions: MbrSessionRow[]) {
  const decisions: string[] = [];
  for (const session of sessions) {
    const data = unwrapData(session);
    const items =
      (data.decisions || data.itensDecisao || []) as unknown[];
    if (Array.isArray(items)) {
      for (const item of items) {
        const text = typeof item === "string"
          ? item
          : (item as { text?: string; title?: string })?.text ||
            (item as { text?: string; title?: string })?.title;
        if (text) decisions.push(text);
      }
    }
    const needsDecision = String(
      ((data.highlights as Record<string, unknown> | undefined)?.needsDecision as string) || "",
    ).trim();
    if (needsDecision) decisions.push(needsDecision);
  }
  return decisions;
}

export function extractKrSummary(orgObjectives: { title: string; key_results?: KrRow[] }[]) {
  return orgObjectives.map((o) => ({
    title: o.title,
    krs: (o.key_results || []).map((kr: KrRow) => ({
      title: kr.title,
      progress: calculateKrProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        kr.direction || "up",
      ),
      status: kr.status,
    })),
  }));
}
