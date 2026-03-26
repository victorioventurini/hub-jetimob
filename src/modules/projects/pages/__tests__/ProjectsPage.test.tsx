import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

// Mock the hooks used by ProjectsPage
vi.mock('@/modules/projects/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/modules/projects/hooks/useProjectMutations', () => ({
  useCreateProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useUpdateProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useSoftDeleteProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/modules/projects/hooks/useProjectPermissionsV2', () => ({
  useProjectPermissionsV2: vi.fn(() => ({
    isLoading: false,
    hasFullAccess: true,
    canViewProjects: true,
    canCreateProject: true,
    canEditProject: true,
    canEditOwnProject: true,
    canDeleteProject: true,
    canViewMilestones: true,
    canCreateMilestone: true,
    canEditMilestone: true,
  })),
}));

vi.mock('@/hooks/useIdentity', () => ({
  useIdentity: vi.fn(() => ({
    profileId: 'test-profile-id',
    realProfileId: null,
  })),
}));

vi.mock('@/components/layout/HubLayout', () => ({
  HubLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="hub-layout">{children}</div>,
}));

import ProjectsPage from '../../pages/ProjectsPage';
import { useProjects } from '../../hooks/useProjects';
import type { ProjectWithRelations } from '../../types';

function createMockProject(overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations {
  return {
    id: 'proj-1',
    name: 'Projeto Alpha',
    description: 'Descrição do projeto',
    owner_id: 'owner-1',
    status: 'in_progress',
    start_date: '2026-01-01',
    due_date: '2026-06-30',
    external_url: null,
    bu_id: 'bu-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    owner: { id: 'owner-1', display_name: 'João', photo_url: null },
    teams: [],
    krs: [],
    milestones: [],
    health: 'on_track',
    milestones_total: 3,
    milestones_done: 1,
    completion_pct: 33,
    ...overrides,
  };
}

describe('ProjectsPage', () => {
  it('renders page title', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Projetos')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/Gerencie projetos estratégicos/)).toBeInTheDocument();
  });

  it('renders "Novo projeto" button', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Novo projeto')).toBeInTheDocument();
  });

  it('renders empty state when no projects', () => {
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Nenhum projeto encontrado.')).toBeInTheDocument();
  });

  it('renders loading skeletons when loading', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = renderWithProviders(<ProjectsPage />);
    // Should have skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as any);

    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Erro ao carregar projetos.')).toBeInTheDocument();
  });

  it('renders project cards when data is available', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [createMockProject()],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument();
  });

  it('renders "Criar primeiro projeto" button in empty state', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Criar primeiro projeto')).toBeInTheDocument();
  });
});
