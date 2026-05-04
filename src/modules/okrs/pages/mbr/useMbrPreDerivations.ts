/**
 * Derivações memoizadas a partir das submissões do Pré-MBR.
 */
import { useMemo } from 'react';

export interface MbrPreSubmissionLike {
  teamId: string;
  submittedByName?: string;
  highlights?: { needsDecision?: string };
  nextSteps?: { crossDependencies?: string[] };
  kpisToCreate?: Array<Record<string, unknown>>;
  kpiJustifications?: Record<string, string | undefined>;
  kpiOutdatedUpdates?: Record<string, unknown>;
  projectJustifications?: {
    projects?: Record<string, string | undefined>;
    milestones?: Record<string, string | undefined>;
  };
  agendaSuggestions?: Array<{ title?: string; text?: string; detail?: string }>;
}

export function useMbrPreDerivations(
  mbrPreByTeam: Record<string, MbrPreSubmissionLike>,
) {
  const proposedKpis = useMemo(() => {
    return Object.values(mbrPreByTeam).flatMap((sub) =>
      (sub.kpisToCreate ?? []).map((k) => ({
        ...k,
        teamId: sub.teamId,
        submittedByName: sub.submittedByName,
      })),
    );
  }, [mbrPreByTeam]);

  const mbrPreSurfacedItems = useMemo(() => {
    const items: Array<{
      key: string;
      teamId: string;
      kind: 'needs_decision' | 'cross_dependency';
      text: string;
    }> = [];
    for (const sub of Object.values(mbrPreByTeam)) {
      const nd = sub.highlights?.needsDecision?.trim();
      if (nd) {
        items.push({
          key: `${sub.teamId}-nd`,
          teamId: sub.teamId,
          kind: 'needs_decision',
          text: nd,
        });
      }
      for (const dep of sub.nextSteps?.crossDependencies ?? []) {
        if (dep?.trim()) {
          items.push({
            key: `${sub.teamId}-dep-${items.length}`,
            teamId: sub.teamId,
            kind: 'cross_dependency',
            text: dep.trim(),
          });
        }
      }
    }
    return items;
  }, [mbrPreByTeam]);

  const mbrPreAggregates = useMemo(() => {
    let kpiJustifCount = 0;
    let kpiUpdatedCount = 0;
    let projectJustifCount = 0;
    let agendaSuggestionCount = 0;
    for (const sub of Object.values(mbrPreByTeam)) {
      kpiJustifCount += Object.values(sub.kpiJustifications ?? {}).filter(
        (v) => (v ?? '').trim(),
      ).length;
      // @deprecated v3.31.1 — Pré-MBR não captura mais update inline (sempre 0).
      kpiUpdatedCount += Object.keys(sub.kpiOutdatedUpdates ?? {}).length;
      projectJustifCount +=
        Object.values(sub.projectJustifications?.projects ?? {}).filter(
          (v) => (v ?? '').trim(),
        ).length +
        Object.values(sub.projectJustifications?.milestones ?? {}).filter(
          (v) => (v ?? '').trim(),
        ).length;
      agendaSuggestionCount += (sub.agendaSuggestions ?? []).length;
    }
    return { kpiJustifCount, kpiUpdatedCount, projectJustifCount, agendaSuggestionCount };
  }, [mbrPreByTeam]);

  const mbrPreAgendaSuggestions = useMemo(() => {
    return Object.values(mbrPreByTeam)
      .flatMap((sub) =>
        (sub.agendaSuggestions ?? []).map((s, i) => ({
          key: `${sub.teamId}-${i}`,
          teamId: sub.teamId,
          title: s.title ?? s.text ?? '',
          detail: s.detail ?? '',
        })),
      )
      .filter((s) => s.title.trim());
  }, [mbrPreByTeam]);

  return {
    proposedKpis,
    mbrPreSurfacedItems,
    mbrPreAggregates,
    mbrPreAgendaSuggestions,
  };
}
