import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { ProjectCard } from '../ProjectCard';
import type { ProjectWithRelations } from '../../types';

function createMockProject(overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations {
  return {
    id: 'proj-1',
    name: 'Test Project',
    description: 'A test project',
    owner_id: 'owner-1',
    status: 'in_progress',
    start_date: '2026-01-01',
    due_date: '2026-06-30',
    external_url: null,
    bu_id: 'bu-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    owner: { id: 'owner-1', display_name: 'João Silva', photo_url: null },
    teams: [],
    krs: [],
    milestones: [],
    health: 'on_track',
    milestones_total: 5,
    milestones_done: 2,
    completion_pct: 40,
    ...overrides,
  };
}

describe('ProjectCard', () => {
  it('renders project name', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders project description', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('A test project')).toBeInTheDocument();
  });

  it('renders health badge', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('No prazo')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('renders owner display name', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders progress bar label', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('calls onClick with project id', () => {
    const onClick = vi.fn();
    renderWithProviders(<ProjectCard project={createMockProject()} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Project'));
    expect(onClick).toHaveBeenCalledWith('proj-1');
  });

  it('renders external link when present', () => {
    renderWithProviders(
      <ProjectCard project={createMockProject({ external_url: 'https://example.com' })} />
    );
    const link = document.querySelector('a[href="https://example.com"]');
    expect(link).toBeInTheDocument();
  });

  it('does not render external link when null', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    const link = document.querySelector('a[target="_blank"]');
    expect(link).not.toBeInTheDocument();
  });

  it('renders KR badges when krs are present', () => {
    renderWithProviders(
      <ProjectCard project={createMockProject({
        krs: [
          { key_result_id: 'kr-1', kr_title: 'Aumentar conversão', impact: 'high' },
        ],
      })} />
    );
    expect(screen.getByText('Aumentar conversão')).toBeInTheDocument();
  });

  it('does not render owner when null', () => {
    renderWithProviders(<ProjectCard project={createMockProject({ owner: null })} />);
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
  });

  it('renders due date', () => {
    renderWithProviders(<ProjectCard project={createMockProject()} />);
    expect(screen.getByText('30 jun')).toBeInTheDocument();
  });
});
