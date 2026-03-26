import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ProjectStatusBadge } from '../ProjectStatusBadge';
import type { ProjectStatus } from '../../types';

const statusLabels: Record<ProjectStatus, string> = {
  planned: 'Planejado',
  in_progress: 'Em andamento',
  paused: 'Pausado',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

describe('ProjectStatusBadge', () => {
  const statuses: ProjectStatus[] = ['planned', 'in_progress', 'paused', 'done', 'cancelled'];

  statuses.forEach((status) => {
    it(`renders "${statusLabels[status]}" for status ${status}`, () => {
      renderWithProviders(<ProjectStatusBadge status={status} />);
      expect(screen.getByText(statusLabels[status])).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <ProjectStatusBadge status="planned" className="my-class" />
    );
    expect(container.firstChild).toHaveClass('my-class');
  });
});
