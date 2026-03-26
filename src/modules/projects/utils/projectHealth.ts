/**
 * Project Health Utilities
 *
 * Client-side health and completion calculators.
 * Mirror the DB function `calculate_project_health()` for optimistic UI.
 */

import type { ProjectHealth, MilestoneStatus } from '../types';

interface MilestoneForHealth {
  status: MilestoneStatus;
  due_date: string | null;
  deleted_at: string | null;
}

/**
 * Compute project health based on milestone due dates.
 * Matches the logic in `calculate_project_health()` SQL function.
 */
export function computeHealth(milestones: MilestoneForHealth[]): ProjectHealth {
  const active = milestones.filter(m => !m.deleted_at && m.status !== 'done');

  if (active.length === 0) return 'on_track';

  // Find the nearest due date among active milestones
  const withDue = active
    .filter(m => m.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

  if (withDue.length === 0) return 'on_track';

  const criticalDue = new Date(withDue[0].due_date!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  criticalDue.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.floor(
    (criticalDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDue < 0) return 'late';
  if (daysUntilDue < 7) return 'at_risk';
  return 'on_track';
}

/**
 * Compute milestone completion percentage.
 */
export function computeCompletion(milestones: MilestoneForHealth[]): {
  total: number;
  done: number;
  pct: number;
} {
  const active = milestones.filter(m => !m.deleted_at);
  const done = active.filter(m => m.status === 'done').length;
  const total = active.length;

  return {
    total,
    done,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
