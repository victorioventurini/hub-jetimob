import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

// Mock react-router-dom params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'proj-1' })),
  };
});

vi.mock('@/modules/projects/hooks/useProject', () => ({
  useProject: vi.fn(() => ({
    data: {
      id: 'proj-1',
      name: 'Projeto Beta',
      description: 'Descrição Beta',
      owner_id: 'owner-1',
      status: 'in_progress',
      start_date: '2026-01-01',
      due_date: '2026-06-30',
      external_url: 'https://example.com',
      bu_id: 'bu-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      owner: { id: 'owner-1', display_name: 'Maria Santos', photo_url: null },
      teams: [],
      krs: [{ key_result_id: 'kr-1', kr_title: 'Aumentar NPS', impact: 'high' }],
      milestones: [],
      health: 'at_risk',
      milestones_total: 4,
      milestones_done: 1,
      completion_pct: 25,
    },
    isLoading: false,
  })),
}));

vi.mock('@/modules/projects/hooks/useMilestones', () => ({
  useMilestones: vi.fn(() => ({
    data: [
      {
        id: 'ms-1',
        project_id: 'proj-1',
        name: 'MVP Entregue',
        owner_id: null,
        status: 'done',
        due_date: '2026-03-01',
        sort_order: 0,
        bu_id: 'bu-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'ms-2',
        project_id: 'proj-1',
        name: 'Beta Release',
        owner_id: null,
        status: 'in_progress',
        due_date: '2026-04-01',
        sort_order: 1,
        bu_id: 'bu-1',
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        deleted_at: null,
      },
    ],
  })),
}));

vi.mock('@/modules/projects/hooks/useProjectMutations', () => ({
  useUpdateProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSoftDeleteProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/modules/projects/hooks/useMilestoneMutations', () => ({
  useCreateMilestone: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateMilestone: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSoftDeleteMilestone: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
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
    canDeleteOwnProject: true,
    canViewMilestones: true,
    canCreateMilestone: true,
    canEditMilestone: true,
    canEditProjectRecord: vi.fn(() => true),
    canDeleteProjectRecord: vi.fn(() => true),
  })),
}));

vi.mock('@/hooks/useIdentity', () => ({
  useIdentity: vi.fn(() => ({
    profileId: 'test-profile-id',
    realProfileId: null,
    isLoading: false,
  })),
}));

vi.mock('@/components/layout/HubLayout', () => ({
  HubLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/projects/components/ProjectCommentsSection', () => ({
  ProjectCommentsSection: () => <div data-testid="comments-section" />,
}));

import ProjectDetailPage from '../../pages/ProjectDetailPage';
import { useProject } from '../../hooks/useProject';
import { useProjectPermissionsV2 } from '../../hooks/useProjectPermissionsV2';
import { useSoftDeleteProject } from '../../hooks/useProjectMutations';
import { useIdentity } from '@/hooks/useIdentity';

describe('ProjectDetailPage', () => {
  it('renders project name in heading', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByRole('heading', { name: 'Projeto Beta' })).toBeInTheDocument();
  });

  it('renders project description', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Descrição Beta')).toBeInTheDocument();
  });

  it('renders health badge', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Em risco')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    renderWithProviders(<ProjectDetailPage />);
    const badges = screen.getAllByText('Em andamento');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders owner name', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('renders milestones', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('MVP Entregue')).toBeInTheDocument();
    expect(screen.getByText('Beta Release')).toBeInTheDocument();
  });

  it('renders KR links', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Aumentar NPS')).toBeInTheDocument();
  });

  it('renders Editar button', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('renders external link button', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Link externo')).toBeInTheDocument();
  });

  it('renders breadcrumb back to Projetos', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Projetos')).toBeInTheDocument();
  });

  it('renders new milestone input', () => {
    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByPlaceholderText('Novo milestone...')).toBeInTheDocument();
  });

  it('renders not found state when project is null', () => {
    vi.mocked(useProject).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Projeto não encontrado.')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<ProjectDetailPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('hides Arquivar button when user is not owner/admin', () => {
    vi.mocked(useProjectPermissionsV2).mockReturnValueOnce({
      isLoading: false,
      hasFullAccess: false,
      canViewProjects: true,
      canCreateProject: false,
      canEditProject: false,
      canEditOwnProject: true,
      canDeleteProject: false,
      canDeleteOwnProject: true,
      canViewMilestones: true,
      canCreateMilestone: false,
      canEditMilestone: false,
      canEditProjectRecord: vi.fn(() => false),
      canDeleteProjectRecord: vi.fn(() => false),
    } as any);

    const { container } = renderWithProviders(<ProjectDetailPage />);
    // Botão "Editar" e ícone de arquivar não devem aparecer
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(container.querySelector('button.bg-destructive, button[class*="destructive"]')).toBeNull();
  });

  it('does not call delete mutation when permission is false', () => {
    const mutateSpy = vi.fn();
    vi.mocked(useSoftDeleteProject).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: false,
    } as any);
    vi.mocked(useProjectPermissionsV2).mockReturnValueOnce({
      isLoading: false,
      hasFullAccess: false,
      canViewProjects: true,
      canCreateProject: false,
      canEditProject: false,
      canEditOwnProject: false,
      canDeleteProject: false,
      canDeleteOwnProject: false,
      canViewMilestones: true,
      canCreateMilestone: false,
      canEditMilestone: false,
      canEditProjectRecord: vi.fn(() => false),
      canDeleteProjectRecord: vi.fn(() => false),
    } as any);

    renderWithProviders(<ProjectDetailPage />);
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it('hides Arquivar/Editar buttons while permissions are still loading', () => {
    vi.mocked(useProjectPermissionsV2).mockReturnValueOnce({
      isLoading: true,
      hasFullAccess: false,
      canViewProjects: false,
      canCreateProject: false,
      canEditProject: false,
      canEditOwnProject: false,
      canDeleteProject: false,
      canDeleteOwnProject: false,
      canViewMilestones: false,
      canCreateMilestone: false,
      canEditMilestone: false,
      // Mesmo que helpers retornassem true, o gate `permissionsResolved` deve bloquear.
      canEditProjectRecord: vi.fn(() => true),
      canDeleteProjectRecord: vi.fn(() => true),
    } as any);

    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(container.querySelector('button[class*="destructive"]')).toBeNull();
  });

  it('hides Arquivar/Editar buttons while identity is still loading', () => {
    vi.mocked(useIdentity).mockReturnValueOnce({
      profileId: null,
      realProfileId: null,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(container.querySelector('button[class*="destructive"]')).toBeNull();
  });

  it('projects_manager (update:bu without delete) sees Editar but NOT Arquivar', () => {
    // Reset useProject (testes anteriores podem ter setado mockReturnValue persistente).
    vi.mocked(useProject).mockReturnValue({
      data: {
        id: 'proj-1',
        name: 'Projeto Beta',
        description: 'Descrição Beta',
        owner_id: 'owner-1',
        status: 'in_progress',
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        external_url: 'https://example.com',
        bu_id: 'bu-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
        owner: { id: 'owner-1', display_name: 'Maria Santos', photo_url: null },
        teams: [],
        krs: [],
        milestones: [],
        health: 'at_risk',
        milestones_total: 4,
        milestones_done: 1,
        completion_pct: 25,
      },
      isLoading: false,
    } as any);

    // Simula template projects_manager: pode editar qualquer projeto da BU,
    // mas NÃO tem nenhuma key de delete.
    vi.mocked(useProjectPermissionsV2).mockReturnValueOnce({
      isLoading: false,
      hasFullAccess: false,
      canViewProjects: true,
      canCreateProject: true,
      canEditProject: true,
      canEditOwnProject: false,
      canDeleteProject: false,
      canDeleteOwnProject: false,
      canViewMilestones: true,
      canCreateMilestone: true,
      canEditMilestone: true,
      canEditProjectRecord: vi.fn(() => true),
      canDeleteProjectRecord: vi.fn(() => false),
    } as any);

    const { container } = renderWithProviders(<ProjectDetailPage />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(container.querySelector('button[class*="destructive"]')).toBeNull();
  });
});
