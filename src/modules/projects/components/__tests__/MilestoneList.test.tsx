import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { MilestoneList } from '../MilestoneList';
import type { ProjectMilestone } from '../../types';

// Mock MilestoneStatusSelect to simplify status change testing
vi.mock('../MilestoneStatusSelect', () => ({
  MilestoneStatusSelect: ({ value, onValueChange, disabled }: any) => (
    <button
      data-testid={`status-btn-${value}`}
      onClick={() => {
        const next: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
        onValueChange(next[value]);
      }}
      disabled={disabled}
    >
      {value}
    </button>
  ),
}));

function createMilestone(overrides: Partial<ProjectMilestone> = {}): ProjectMilestone {
  return {
    id: 'ms-1',
    project_id: 'proj-1',
    name: 'Milestone 1',
    owner_id: null,
    status: 'todo',
    start_date: '2026-01-01',
    due_date: null,
    notes: null,
    sort_order: 0,
    bu_id: 'bu-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

const defaultProps = { projectId: 'proj-1' };

describe('MilestoneList', () => {
  it('renders empty state when no milestones', () => {
    renderWithProviders(<MilestoneList milestones={[]} {...defaultProps} />);
    expect(screen.getByText('Nenhum milestone cadastrado.')).toBeInTheDocument();
  });

  it('renders milestone name', () => {
    renderWithProviders(<MilestoneList milestones={[createMilestone()]} {...defaultProps} />);
    expect(screen.getByText('Milestone 1')).toBeInTheDocument();
  });

  it('filters out soft-deleted milestones', () => {
    renderWithProviders(
      <MilestoneList milestones={[
        createMilestone({ id: 'ms-1', name: 'Active', deleted_at: null }),
        createMilestone({ id: 'ms-2', name: 'Deleted', deleted_at: '2026-01-01T00:00:00Z' }),
      ]} {...defaultProps} />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('calls onStatusChange with next status on click (todo → in_progress)', async () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList milestones={[createMilestone()]} onStatusChange={onStatusChange} {...defaultProps} />
    );
    const statusBtn = screen.getByTestId('status-btn-todo');
    statusBtn.click();
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'in_progress');
  });

  it('cycles status: in_progress → done', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList
        milestones={[createMilestone({ status: 'in_progress' })]}
        onStatusChange={onStatusChange}
        {...defaultProps}
      />
    );
    screen.getByTestId('status-btn-in_progress').click();
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'done');
  });

  it('cycles status: done → todo', () => {
    const onStatusChange = vi.fn();
    renderWithProviders(
      <MilestoneList
        milestones={[createMilestone({ status: 'done' })]}
        onStatusChange={onStatusChange}
        {...defaultProps}
      />
    );
    screen.getByTestId('status-btn-done').click();
    expect(onStatusChange).toHaveBeenCalledWith('ms-1', 'todo');
  });

  it('applies line-through style to done milestones', () => {
    renderWithProviders(
      <MilestoneList milestones={[createMilestone({ status: 'done', name: 'Completed' })]} {...defaultProps} />
    );
    const text = screen.getByText('Completed');
    expect(text).toHaveClass('line-through');
  });

  it('renders due date when present', () => {
    renderWithProviders(
      <MilestoneList milestones={[createMilestone({ due_date: '2026-06-15' })]} {...defaultProps} />
    );
    expect(screen.getByText('15 jun')).toBeInTheDocument();
  });

  it('sorts milestones by due_date then created_at', () => {
    const milestones = [
      createMilestone({ id: 'ms-a', name: 'Later', due_date: '2026-06-30', created_at: '2026-01-01T00:00:00Z' }),
      createMilestone({ id: 'ms-b', name: 'Earlier', due_date: '2026-03-01', created_at: '2026-01-01T00:00:00Z' }),
    ];
    renderWithProviders(<MilestoneList milestones={milestones} {...defaultProps} />);
    const listItems = screen.getAllByText(/Earlier|Later/);
    expect(listItems[0]).toHaveTextContent('Earlier');
    expect(listItems[1]).toHaveTextContent('Later');
  });
});
