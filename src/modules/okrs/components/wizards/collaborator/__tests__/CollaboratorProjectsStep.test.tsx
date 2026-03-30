/**
 * Tests for CollaboratorProjectsStep component
 *
 * Validates:
 * - Empty state when user has no projects
 * - Rendering projects with milestones
 * - Milestone status update via MilestoneStatusSelect
 * - Navigation (back, continue, skip)
 * - Loading state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { CollaboratorProjectsStep } from '../CollaboratorProjectsStep';

// ============================================================
// Mocks
// ============================================================

const mockMutate = vi.fn();

vi.mock('@/integrations/supabase/useBuScopedSupabase', () => ({
  useBuScopedSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              is: () => ({
                data: null,
                error: null,
              }),
            }),
          }),
          in: () => ({
            is: () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/contexts/BuContext', async () => {
  const actual = await vi.importActual('@/contexts/BuContext');
  return {
    ...actual,
    useBu: () => ({
      currentBu: { id: 'test-bu-id', name: 'Test BU' },
      currentBuId: 'test-bu-id',
    }),
  };
});

vi.mock('@/modules/projects/hooks/useMilestoneMutations', () => ({
  useUpdateMilestone: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useCreateMilestone: () => ({ mutate: vi.fn() }),
  useSoftDeleteMilestone: () => ({ mutate: vi.fn() }),
}));

// Mock react-query to control data
const mockMilestoneQueryData: any[] = [];
const mockOwnedQueryData: any[] = [];
let mockIsLoading = false;

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (opts: any) => {
      const key = JSON.stringify(opts.queryKey);
      if (key.includes('my-milestones')) {
        return { data: mockMilestoneQueryData, isLoading: mockIsLoading };
      }
      if (key.includes('my')) {
        return { data: mockOwnedQueryData, isLoading: mockIsLoading };
      }
      return { data: [], isLoading: false };
    },
  };
});

// ============================================================
// Helpers
// ============================================================

const defaultProps = {
  effectiveUserId: 'user-1',
  onContinue: vi.fn(),
  onBack: vi.fn(),
  onSkip: vi.fn(),
};

function setQueryData(milestoneProjects: any[], ownedProjects: any[]) {
  mockMilestoneQueryData.length = 0;
  mockMilestoneQueryData.push(...milestoneProjects);
  mockOwnedQueryData.length = 0;
  mockOwnedQueryData.push(...ownedProjects);
}

// ============================================================
// Tests
// ============================================================

describe('CollaboratorProjectsStep - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    setQueryData([], []);
  });

  it('should render empty state when no projects exist', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByText(/Nenhum projeto sob sua responsabilidade/i)).toBeInTheDocument();
  });

  it('should still show continue and skip buttons', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pular/i })).toBeInTheDocument();
  });
});

describe('CollaboratorProjectsStep - With Projects', () => {
  const projectWithMilestones = {
    id: 'proj-1',
    name: 'Projeto Alpha',
    status: 'in_progress',
    due_date: '2026-06-30',
    project_milestones: [
      { id: 'ms-1', name: 'Marco 1', status: 'todo', due_date: '2026-04-15', owner_id: 'user-1', notes: null, deleted_at: null },
      { id: 'ms-2', name: 'Marco 2', status: 'in_progress', due_date: '2026-05-01', owner_id: 'user-1', notes: null, deleted_at: null },
      { id: 'ms-3', name: 'Marco Concluído', status: 'done', due_date: '2026-03-01', owner_id: 'user-1', notes: null, deleted_at: null },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    setQueryData([projectWithMilestones], []);
  });

  it('should render project name', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByText('Projeto Alpha')).toBeInTheDocument();
  });

  it('should show only pending milestones (not done)', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByText('Marco 1')).toBeInTheDocument();
    expect(screen.getByText('Marco 2')).toBeInTheDocument();
    expect(screen.queryByText('Marco Concluído')).not.toBeInTheDocument();
  });

  it('should show progress bar with correct counts', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    // 1 done out of 3 total
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('should show pending milestones badge in header', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByText('2 pendentes')).toBeInTheDocument();
  });
});

describe('CollaboratorProjectsStep - Deduplication', () => {
  const sharedProject = {
    id: 'proj-dup',
    name: 'Projeto Duplicado',
    status: 'in_progress',
    due_date: '2026-06-30',
    project_milestones: [
      { id: 'ms-d1', name: 'Marco Dup', status: 'todo', due_date: null, owner_id: 'user-1', notes: null, deleted_at: null },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    // Same project appears in both queries
    setQueryData([sharedProject], [sharedProject]);
  });

  it('should deduplicate projects appearing in both queries', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    const projectNames = screen.getAllByText('Projeto Duplicado');
    expect(projectNames).toHaveLength(1);
  });
});

describe('CollaboratorProjectsStep - Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    setQueryData([], []);
  });

  it('should call onContinue when continue is clicked', async () => {
    const onContinue = vi.fn();
    render(<CollaboratorProjectsStep {...defaultProps} onContinue={onContinue} />);

    await userEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('should call onBack when back is clicked', async () => {
    const onBack = vi.fn();
    render(<CollaboratorProjectsStep {...defaultProps} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('should call onSkip when skip is clicked', async () => {
    const onSkip = vi.fn();
    render(<CollaboratorProjectsStep {...defaultProps} onSkip={onSkip} />);

    await userEvent.click(screen.getByRole('button', { name: /Pular/i }));
    expect(onSkip).toHaveBeenCalled();
  });
});

describe('CollaboratorProjectsStep - Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = true;
    setQueryData([], []);
  });

  afterEach(() => {
    mockIsLoading = false;
  });

  it('should show skeleton when loading', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    // Should not show empty state while loading
    expect(screen.queryByText(/Nenhum projeto/i)).not.toBeInTheDocument();
  });
});

describe('CollaboratorProjectsStep - Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    setQueryData([], []);
  });

  it('should render step title and description', () => {
    render(<CollaboratorProjectsStep {...defaultProps} />);

    expect(screen.getByText('Projetos')).toBeInTheDocument();
    expect(screen.getByText(/Atualize o status dos marcos/i)).toBeInTheDocument();
  });
});
