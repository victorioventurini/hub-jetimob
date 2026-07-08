// ============================================================================
// _shared/okr-progress.ts
//
// Fonte de verdade ÚNICA para cálculo de % de atingimento de KR/Objetivo/Time
// em edge functions. Espelha src/modules/okrs/utils/progressCalculation.ts
// (SSOT do frontend). Manter ambos em sincronia.
//
// Regras canônicas:
//   - Sem clamp superior (156% é valor válido e deve ser celebrado).
//   - Apenas Math.max(0, x) no piso.
//   - direction === "maintain": binário (current >= target ? 100 : 0).
//   - Para baseline === target em up/down: binário (atingiu ou não).
//   - Não arredonda na função base; arredondar só na exibição/JSON externo.
//   - Suporte a unit (R$, R$ mil, R$ milhão) com auto-detecção de escala.
// ============================================================================

export type OkrDirection = "up" | "down" | "maintain";

const UNIT_MULTIPLIERS: Record<string, number> = {
  "R$": 1,
  "R$ mil": 1_000,
  "R$ milhão": 1_000_000,
};

function calcDirectionalProgress(
  baseline: number,
  current: number,
  target: number,
  direction: OkrDirection,
): number {
  if (direction === "maintain") return current >= target ? 100 : 0;

  if (direction === "up") {
    if (target === baseline) return current >= target ? 100 : 0;
    return Math.max(0, ((current - baseline) / (target - baseline)) * 100);
  }

  // direction === "down"
  // KR-cap: baseline ausente/≤ meta significa "limitar a ≤ target".
  // Fórmula linear clássica só faz sentido quando há redução real (baseline > target).
  if (baseline <= target) {
    if (current <= target) return 100;
    if (baseline === target) return 0; // sem range → binário (contrato histórico)
    return Math.max(0, (target / current) * 100);
  }
  return Math.max(0, ((baseline - current) / (baseline - target)) * 100);


}

function normalizeProgressInputs(
  baseline: number,
  current: number,
  target: number,
  unit?: string | null,
) {
  if (!unit || !(unit in UNIT_MULTIPLIERS)) return { baseline, current, target };
  const mult = UNIT_MULTIPLIERS[unit];
  const direct = calcDirectionalProgress(baseline, current, target, "up");
  const scaled = calcDirectionalProgress(baseline * mult, current, target * mult, "up");
  if (direct > 1000 && scaled >= 0 && scaled <= 1000) {
    return { baseline: baseline * mult, current, target: target * mult };
  }
  return { baseline, current, target };
}

/** Canônico — SEM clamp superior, SEM arredondamento. */
export function calculateKrProgress(
  baseline: number | string | null | undefined,
  current: number | string | null | undefined,
  target: number | string | null | undefined,
  direction: string | null | undefined,
  unit?: string | null,
): number {
  const dir: OkrDirection = direction === "down"
    ? "down"
    : direction === "maintain"
    ? "maintain"
    : "up";
  const b = Number(baseline) || 0;
  const c = Number(current) || 0;
  const t = Number(target) || 0;
  const n = normalizeProgressInputs(b, c, t, unit);
  return calcDirectionalProgress(n.baseline, n.current, n.target, dir);
}

// ============================================================================
// Shapes mínimos esperados (intencionalmente leves para reutilização)
// ============================================================================

export interface ProgressKr {
  id?: string;
  baseline?: number | string | null;
  current_value?: number | string | null;
  target?: number | string | null;
  direction?: string | null;
  unit?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  cancelled_at?: string | null;
  /** Valor efetivo da KPI primária quando aplicável (Core Rule). */
  effective_current_value?: number | null;
}

export interface ProgressObjective<KR extends ProgressKr = ProgressKr> {
  id?: string;
  title?: string;
  team_id?: string;
  key_results?: KR[];
}

export interface ObjectiveAchievement {
  id: string;
  title: string;
  teamName: string;
  progress: number;
  krCount: number;
}

export interface TeamAchievement {
  teamId: string;
  teamName: string;
  progress: number;
  objectivesCount: number;
  krCount: number;
}

export interface OverallAchievement {
  overallProgress: number;
  byTeam: TeamAchievement[];
  byObjective: ObjectiveAchievement[];
}

// ============================================================================
// Helpers de domínio
// ============================================================================

/** Primário KPI > current_value cru. */
export function resolveKrCurrentValue(kr: ProgressKr): number {
  if (typeof kr.effective_current_value === "number") return kr.effective_current_value;
  return Number(kr.current_value) || 0;
}

export function isKrLive(kr: ProgressKr): boolean {
  return !kr.deleted_at && !kr.cancelled_at;
}

export function krProgress(kr: ProgressKr): number {
  return calculateKrProgress(
    kr.baseline,
    resolveKrCurrentValue(kr),
    kr.target,
    kr.direction,
    kr.unit ?? null,
  );
}

/**
 * Agrega progresso no nível Objetivo → Time → Empresa, exatamente como
 * `useCompanyOkrs` (src/modules/okrs/hooks/useCompanyOkrs.ts):
 *   objectiveProgress = mean(KR.progress)
 *   teamProgress      = mean(objectiveProgress do time)
 *   overallProgress   = mean(objectiveProgress de TODOS os objetivos)
 */
export function buildOverallAchievement<KR extends ProgressKr>(
  teamObjectives: ProgressObjective<KR>[],
  teams: Map<string, string>,
): OverallAchievement {
  const byObjective: ObjectiveAchievement[] = [];
  const teamAgg = new Map<string, { progresses: number[]; krCount: number; name: string }>();

  for (const obj of teamObjectives) {
    const liveKrs = (obj.key_results || []).filter(isKrLive);
    if (liveKrs.length === 0) continue;
    const objProgress = liveKrs.reduce((acc, kr) => acc + krProgress(kr), 0) / liveKrs.length;

    const teamId = obj.team_id || "";
    const teamName = teams.get(teamId) || "Time";
    byObjective.push({
      id: obj.id || "",
      title: obj.title || "",
      teamName,
      progress: Math.round(objProgress),
      krCount: liveKrs.length,
    });

    if (!teamAgg.has(teamId)) {
      teamAgg.set(teamId, { progresses: [], krCount: 0, name: teamName });
    }
    const t = teamAgg.get(teamId)!;
    t.progresses.push(objProgress);
    t.krCount += liveKrs.length;
  }

  const byTeam: TeamAchievement[] = Array.from(teamAgg.entries()).map(([teamId, t]) => ({
    teamId,
    teamName: t.name,
    progress: Math.round(t.progresses.reduce((a, b) => a + b, 0) / t.progresses.length),
    objectivesCount: t.progresses.length,
    krCount: t.krCount,
  }));

  const overallProgress = byObjective.length === 0
    ? 0
    : Math.round(byObjective.reduce((a, o) => a + o.progress, 0) / byObjective.length);

  byTeam.sort((a, b) => b.progress - a.progress);
  byObjective.sort((a, b) => b.progress - a.progress);

  return { overallProgress, byTeam, byObjective };
}
