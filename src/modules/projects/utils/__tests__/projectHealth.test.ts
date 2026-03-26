import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeHealth, computeCompletion } from '../projectHealth';

// ── computeHealth ──

describe('computeHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns on_track when no milestones', () => {
    expect(computeHealth([])).toBe('on_track');
  });

  it('returns on_track when all milestones are done', () => {
    expect(computeHealth([
      { status: 'done', due_date: '2026-01-01', deleted_at: null },
      { status: 'done', due_date: '2026-02-01', deleted_at: null },
    ])).toBe('on_track');
  });

  it('returns on_track when no active milestones have due_date', () => {
    expect(computeHealth([
      { status: 'todo', due_date: null, deleted_at: null },
      { status: 'in_progress', due_date: null, deleted_at: null },
    ])).toBe('on_track');
  });

  it('returns on_track when nearest due_date is >= 7 days away', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-04-10', deleted_at: null },
    ])).toBe('on_track');
  });

  it('returns at_risk when nearest due_date is < 7 days away but not past', () => {
    expect(computeHealth([
      { status: 'in_progress', due_date: '2026-03-30', deleted_at: null }, // 4 days away
    ])).toBe('at_risk');
  });

  it('returns at_risk when nearest due_date is exactly 6 days away', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-04-01', deleted_at: null }, // 6 days
    ])).toBe('at_risk');
  });

  it('returns on_track when nearest due_date is exactly 7 days away', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-04-02', deleted_at: null }, // 7 days
    ])).toBe('on_track');
  });

  it('returns late when nearest due_date is in the past', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-03-20', deleted_at: null },
    ])).toBe('late');
  });

  it('returns late when due_date is yesterday', () => {
    expect(computeHealth([
      { status: 'in_progress', due_date: '2026-03-25', deleted_at: null },
    ])).toBe('late');
  });

  it('ignores soft-deleted milestones', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-03-20', deleted_at: '2026-03-15T00:00:00Z' }, // deleted, past due
      { status: 'todo', due_date: '2026-05-01', deleted_at: null }, // active, on_track
    ])).toBe('on_track');
  });

  it('ignores done milestones', () => {
    expect(computeHealth([
      { status: 'done', due_date: '2026-03-20', deleted_at: null }, // done, past due
      { status: 'todo', due_date: '2026-05-01', deleted_at: null }, // active, on_track
    ])).toBe('on_track');
  });

  it('picks the earliest due_date among active milestones', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-05-01', deleted_at: null }, // far away
      { status: 'in_progress', due_date: '2026-03-28', deleted_at: null }, // 2 days → at_risk
    ])).toBe('at_risk');
  });

  it('returns at_risk when due_date is today (0 days)', () => {
    expect(computeHealth([
      { status: 'todo', due_date: '2026-03-26', deleted_at: null },
    ])).toBe('at_risk');
  });
});

// ── computeCompletion ──

describe('computeCompletion', () => {
  it('returns zeros when no milestones', () => {
    expect(computeCompletion([])).toEqual({ total: 0, done: 0, pct: 0 });
  });

  it('returns 0% when no done milestones', () => {
    const result = computeCompletion([
      { status: 'todo', due_date: null, deleted_at: null },
      { status: 'in_progress', due_date: null, deleted_at: null },
    ]);
    expect(result).toEqual({ total: 2, done: 0, pct: 0 });
  });

  it('returns 100% when all milestones are done', () => {
    const result = computeCompletion([
      { status: 'done', due_date: null, deleted_at: null },
      { status: 'done', due_date: null, deleted_at: null },
    ]);
    expect(result).toEqual({ total: 2, done: 2, pct: 100 });
  });

  it('returns correct percentage for partial completion', () => {
    const result = computeCompletion([
      { status: 'done', due_date: null, deleted_at: null },
      { status: 'todo', due_date: null, deleted_at: null },
      { status: 'in_progress', due_date: null, deleted_at: null },
    ]);
    expect(result).toEqual({ total: 3, done: 1, pct: 33 });
  });

  it('rounds percentage', () => {
    // 2/3 = 66.67 → rounds to 67
    const result = computeCompletion([
      { status: 'done', due_date: null, deleted_at: null },
      { status: 'done', due_date: null, deleted_at: null },
      { status: 'todo', due_date: null, deleted_at: null },
    ]);
    expect(result).toEqual({ total: 3, done: 2, pct: 67 });
  });

  it('excludes soft-deleted milestones from count', () => {
    const result = computeCompletion([
      { status: 'done', due_date: null, deleted_at: null },
      { status: 'todo', due_date: null, deleted_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(result).toEqual({ total: 1, done: 1, pct: 100 });
  });
});
