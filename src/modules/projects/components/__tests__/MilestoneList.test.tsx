import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { MilestoneList } from '../MilestoneList';
import type { ProjectMilestone } from '../../types';

function createMilestone(overrides: Partial<ProjectMilestone> = {}): ProjectMilestone {
  return {
    id: 'ms-1',
    project_id: 'proj-1',
    name: 'Milestone 1',
    owner_id: null,
    status: 'todo',
    due_date: null,
    sort_order: 0,
    bu_id: 'bu-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('MilestoneList', () => {
  it('renders empty state when no milestones', () => {
    renderWithProviders(<MilestoneList milestones={[]} />);
    expect(screen.getByText('Nenhum milestone cadastrado.')).toBeInTheDocument();
  });

  it('renders milestone name', () => {
    renderWithProviders(<MilestoneList milestones={[createMilestone()]} />);
    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
  });

  it('filters out soft-deleted milestones', () => {
    renderWithProviders(
      <MilestoneList milestones={[
        createMilestone({ id: 'ms-1', name: 'Active', deleted_at: null }),
        createMilestone({ id: 'ms-2', name: 'Deleted', deleted_at: '2026-01-01T00:00:00Z' }),
      ]} />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('calls onStatusChange with next status on click (todo → in_progress)', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList milestones={[createMilestone()]} onStatusChange={onStatusChange} />
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'in_progress');
  });

  it('cycles status: in_progress → done', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList
        milestones={[createMilestone({ status: 'in_progress' })]}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'done');
  });

  it('cycles status: done → todo', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList
        milestones={[createMilestone({ status: 'done' })]}
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'todo');
  });

  it('applies line-through style to done milestones', () => {
    renderWithProviders(
      <MilestoneList milestones={[createMilestone({ status: 'done', name: 'Completed' })]} />
    );
    const text = screen.getByText('Completed');
    expect(text).toHaveClass('line-through');
  });

  it('renders due date when present', () => {
    renderWithProviders(
      <MilestoneList milestones={[createMilestone({ due_date: '2026-06-15' })]} />
    );
    expect(screen.getByText('15 jun')).toBeInTheDocument();
  });

  it('sorts milestones by due_date then created_at', () => {
    const milestones = [
      createMilestone({ id: 'ms-a', name: 'Later', due_date: '2026-06-30', created_at: '2026-01-01T00:00:00Z' }),
      createMilestone({ id: 'ms-b', name: 'Earlier', due_date: '2026-03-01', created_at: '2026-01-01T00:00:00Z' }),
    ];
    renderWithProviders(<MilestoneList milestones={milestones} />);
    const items = screen.getAllByRole('button');
    // Earlier should come first
    const listItems = screen.getAllByText(/Earlier|Later/);
    expect(listItems[0]).toHaveTextContent('Earlier');
    expect(listItems[1]).toHaveTextContent('Later');
  });
});
