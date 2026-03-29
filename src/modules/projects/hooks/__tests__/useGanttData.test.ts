import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttData } from '../useGanttData';
import type { ProjectWithRelations } from '../../types';

function createProject(overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations {
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: null,
    owner_id: 'owner-1',
    status: 'in_progress',
    start_date: '2026-01-01',
    due_date: '2026-06-30',
    external_url: null,
    bu_id: 'bu-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    owner: null,
    teams: [],
    krs: [],
    milestones: [],
    health: 'on_track',
    milestones_total: 0,
    milestones_done: 0,
    completion_pct: 0,
    ...overrides,
  };
}

describe('useGanttData', () => {
  it('returns empty items for undefined input', () => {
    const { result } = renderHook(() => useGanttData(undefined));
    expect(result.current.items).toEqual([]);
    expect(result.current.excludedCount).toBe(0);
  });

  it('returns empty items for empty array', () => {
    const { result } = renderHook(() => useGanttData([]));
    expect(result.current.items).toEqual([]);
    expect(result.current.excludedCount).toBe(0);
  });

  it('creates a project GanttItem for valid dates', () => {
    const { result } = renderHook(() => useGanttData([createProject()]));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      id: 'proj-1',
      type: 'project',
      name: 'Test Project',
      start_date: '2026-01-01',
      due_date: '2026-06-30',
    });
    expect(result.current.excludedCount).toBe(0);
  });

  it('excludes projects without start_date', () => {
    const { result } = renderHook(() =>
      useGanttData([createProject({ start_date: null })]),
    );
    expect(result.current.items).toHaveLength(0);
    expect(result.current.excludedCount).toBe(1);
  });

  it('excludes projects without due_date', () => {
    const { result } = renderHook(() =>
      useGanttData([createProject({ due_date: null })]),
    );
    expect(result.current.items).toHaveLength(0);
    expect(result.current.excludedCount).toBe(1);
  });

  it('includes milestones with valid due_date', () => {
    const project = createProject({
      milestones: [
        {
          id: 'ms-1',
          project_id: 'proj-1',
          name: 'Milestone 1',
          owner_id: null,
          status: 'todo',
          due_date: '2026-03-01',
          notes: null,
          sort_order: 0,
          bu_id: 'bu-1',
          created_at: '2026-01-15T00:00:00Z',
          updated_at: '2026-01-15T00:00:00Z',
          deleted_at: null,
        },
      ],
    });
    const { result } = renderHook(() => useGanttData([project]));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1]).toMatchObject({
      id: 'ms-1',
      type: 'milestone',
      parent_id: 'proj-1',
    });
  });

  it('skips soft-deleted milestones', () => {
    const project = createProject({
      milestones: [
        {
          id: 'ms-1',
          project_id: 'proj-1',
          name: 'Deleted Milestone',
          owner_id: null,
          status: 'todo',
          due_date: '2026-03-01',
          notes: null,
          sort_order: 0,
          bu_id: 'bu-1',
          created_at: '2026-01-15T00:00:00Z',
          updated_at: '2026-01-15T00:00:00Z',
          deleted_at: '2026-02-01T00:00:00Z',
        },
      ],
    });
    const { result } = renderHook(() => useGanttData([project]));
    expect(result.current.items).toHaveLength(1); // project only
  });

  it('skips milestones without due_date', () => {
    const project = createProject({
      milestones: [
        {
          id: 'ms-1',
          project_id: 'proj-1',
          name: 'No Due Date',
          owner_id: null,
          status: 'todo',
          due_date: null,
          notes: null,
          sort_order: 0,
          bu_id: 'bu-1',
          created_at: '2026-01-15T00:00:00Z',
          updated_at: '2026-01-15T00:00:00Z',
          deleted_at: null,
        },
      ],
    });
    const { result } = renderHook(() => useGanttData([project]));
    expect(result.current.items).toHaveLength(1); // project only
  });

  it('handles multiple projects with mixed validity', () => {
    const { result } = renderHook(() =>
      useGanttData([
        createProject({ id: 'p1' }),
        createProject({ id: 'p2', start_date: null }),
        createProject({ id: 'p3' }),
      ]),
    );
    expect(result.current.items).toHaveLength(2);
    expect(result.current.excludedCount).toBe(1);
  });
});
