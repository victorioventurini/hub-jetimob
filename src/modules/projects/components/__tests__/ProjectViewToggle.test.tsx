import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { ProjectViewToggle, type ProjectViewMode } from '../ProjectViewToggle';

describe('ProjectViewToggle', () => {
  it('renders list and gantt options', () => {
    renderWithProviders(
      <ProjectViewToggle viewMode="list" onViewModeChange={vi.fn()} />,
    );
    expect(screen.getByText('Lista')).toBeInTheDocument();
    expect(screen.getByText('Gantt')).toBeInTheDocument();
  });

  it('calls onViewModeChange when clicking gantt', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ProjectViewToggle viewMode="list" onViewModeChange={onChange} />,
    );
    fireEvent.click(screen.getByText('Gantt'));
    expect(onChange).toHaveBeenCalledWith('gantt');
  });

  it('calls onViewModeChange when clicking list', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ProjectViewToggle viewMode="gantt" onViewModeChange={onChange} />,
    );
    fireEvent.click(screen.getByText('Lista'));
    expect(onChange).toHaveBeenCalledWith('list');
  });
});
