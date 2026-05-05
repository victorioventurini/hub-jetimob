/**
 * Effective Area/Team Resolution — SSOT
 *
 * v3.33.0
 *
 * Regra canônica para EXIBIÇÃO de área/time vinculados a um KPI:
 *   effective_area = area ?? responsible_area
 *   effective_team = team ?? responsible_team
 *
 * Justificativa: `kpi_metrics` separa ownership ESTRUTURAL (`area_id` /
 * `team_id`, populado em `scope='team'` / `scope='area'`) de
 * RESPONSABILIDADE OPERACIONAL (`responsible_area_id` / `responsible_team_id`,
 * populado em KPIs Globais e em delegações operacionais).
 *
 * Para a UI (listas, cards, tabelas, gráficos, ritos) o usuário precisa ver
 * "quem responde por este KPI" — que é o operacional quando o estrutural é
 * nulo. Forms de Create/Edit continuam expondo os 2 conceitos separados.
 */

interface AreaRel {
  id: string;
  name: string;
  color: string | null;
}

interface TeamRel {
  id: string;
  name: string;
}

interface KpiOwnershipInput {
  area?: AreaRel | null;
  responsible_area?: AreaRel | null;
  team?: TeamRel | null;
  responsible_team?: TeamRel | null;
}

export function resolveEffectiveArea(kpi: KpiOwnershipInput): AreaRel | null {
  return kpi.area ?? kpi.responsible_area ?? null;
}

export function resolveEffectiveTeam(kpi: KpiOwnershipInput): TeamRel | null {
  return kpi.team ?? kpi.responsible_team ?? null;
}

/**
 * Hidrata um row vindo do banco com `effective_area` e `effective_team`.
 * Não muta o input.
 */
export function withEffectiveOwnership<T extends KpiOwnershipInput>(
  kpi: T,
): T & { effective_area: AreaRel | null; effective_team: TeamRel | null } {
  return {
    ...kpi,
    effective_area: resolveEffectiveArea(kpi),
    effective_team: resolveEffectiveTeam(kpi),
  };
}
