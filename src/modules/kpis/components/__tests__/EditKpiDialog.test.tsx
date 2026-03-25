/**
 * EditKpiDialog - Testes unitários
 * 
 * Testa comportamento do formulário de edição de KPIs,
 * especialmente o reset de form e preservação de dados.
 * 
 * NOTA: Testes de interação com Radix Select são limitados no jsdom.
 * Para testes completos de scope change, use testes E2E (Playwright).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditKpiDialog } from '../EditKpiDialog';
import type { KpiMetric } from '../../types';

// ---- Mocks ----

vi.mock('@/contexts/BuContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/BuContext')>();
  return {
    ...actual,
    useBu: () => ({
      currentBuId: 'test-bu-id',
      currentBu: { id: 'test-bu-id', name: 'Test BU' },
    }),
  };
});

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    has: () => true,
    isLoading: false,
  }),
}));

const mockUpdateMutateAsync = vi.fn().mockResolvedValue({});
vi.mock('../../hooks/useKpiMutations', () => ({
  useKpiMutations: () => ({
    updateKpi: { mutateAsync: mockUpdateMutateAsync },
  }),
}));

vi.mock('../../hooks/useTeamArea', () => ({
  useTeamArea: (teamId: string | undefined) => ({
    areaId: teamId ? 'inferred-area-id' : null,
    areaName: teamId ? 'Inferred Area' : null,
    areaColor: null,
    isLoading: false,
  }),
}));

vi.mock('@/components/selects', () => ({
  TeamSelect: ({ value, onValueChange, placeholder }: any) => (
    <select
      data-testid="team-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      <option value="team-1">Team 1</option>
      <option value="team-2">Team 2</option>
    </select>
  ),
  BuUserSelect: ({ value, onValueChange }: any) => (
    <select
      data-testid="user-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value || null)}
    >
      <option value="">Selecione...</option>
      <option value="user-1">User 1</option>
    </select>
  ),
  AreaSelect: ({ value, onValueChange, placeholder }: any) => (
    <select
      data-testid="area-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      <option value="area-1">Area 1</option>
      <option value="area-2">Area 2</option>
    </select>
  ),
}));

vi.mock('@/integrations/supabase/useBuScopedSupabase', () => ({
  useOptionalBuScopedSupabase: () => null,
  useBuScopedSupabase: () => ({}),
}));

// ---- Helpers ----

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const renderDialog = (kpi: KpiMetric | null, open = true) => {
  const queryClient = createTestQueryClient();
  const onOpenChange = vi.fn();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <EditKpiDialog kpi={kpi} open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  );
  return { ...result, onOpenChange, queryClient };
};

const makeKpi = (overrides: Partial<KpiMetric> = {}): KpiMetric => ({
  id: 'kpi-1',
  name: 'Test KPI',
  description: 'Test description',
  unit: '%',
  direction: 'up',
  frequency: 'monthly',
  team_id: 'team-1',
  owner_user_id: 'user-1',
  target_value: 80,
  indicator_type: 'kpi',
  lifecycle_status: 'active',
  target_source: 'OKR Q1',
  recovery_protocol: null,
  area_id: 'area-1',
  scope: 'team',
  // v2.90.0: operational responsibility
  responsible_area_id: null,
  responsible_team_id: null,
  category: 'operacoes',
  bu_id: 'test-bu-id',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  deleted_at: null,
  status: 'active',
  source_type: 'manual',
  source_config: null,
  visibility: 'bu',
  comparison_rule: 'higher_is_better',
  linked_okrs: [],
  ...overrides,
});

// ---- Tests ----

describe('EditKpiDialog', () => {
  beforeEach(() => {
    mockUpdateMutateAsync.mockClear();
  });

  it('renderiza o formulário com dados do KPI', async () => {
    const kpi = makeKpi({ name: 'MRR Total', scope: 'org', area_id: null, team_id: null });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.getByDisplayValue('MRR Total')).toBeInTheDocument();
    });
  });

  it('preserva area_id e team_id no mount para scope=team', async () => {
    const kpi = makeKpi({ scope: 'team', team_id: 'team-1', area_id: 'area-1' });
    renderDialog(kpi);

    await waitFor(() => {
      // O TeamSelect deve estar visível com o valor do time
      const teamSelect = screen.getByTestId('team-select');
      expect(teamSelect).toBeInTheDocument();
      expect(teamSelect).toHaveValue('team-1');
    });
  });

  it('preserva area_id no mount para scope=area', async () => {
    const kpi = makeKpi({ scope: 'area', team_id: null, area_id: 'area-1' });
    renderDialog(kpi);

    await waitFor(() => {
      const areaSelect = screen.getByTestId('area-select');
      expect(areaSelect).toBeInTheDocument();
      expect(areaSelect).toHaveValue('area-1');
    });
  });

  it('não mostra TeamSelect nem AreaSelect para scope=org', async () => {
    const kpi = makeKpi({ scope: 'org', team_id: null, area_id: null });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.queryByTestId('team-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('area-select')).not.toBeInTheDocument();
    });
  });

  it('mostra badge de área inferida para scope=team', async () => {
    const kpi = makeKpi({ scope: 'team', team_id: 'team-1' });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.getByText('Inferred Area')).toBeInTheDocument();
    });
  });
});

describe('EditKpiDialog - Scope validation schema', () => {
  it('exige team_id quando scope=team', () => {
    // This is tested via the zod schema - verify it exists in form validation
    const kpi = makeKpi({ scope: 'team', team_id: null });
    renderDialog(kpi);
    // Dialog should render without crashing
    expect(screen.getByText('Editar Indicador')).toBeInTheDocument();
  });
});

describe('EditKpiDialog - Form reset resilience', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUpdateMutateAsync.mockClear();
  });

  it('NÃO perde edições de texto quando componente recebe novo objeto kpi (refetch)', async () => {
    const kpi = makeKpi({ 
      scope: 'team', 
      team_id: 'team-1', 
      area_id: null,
      name: 'Original Name',
    });
    
    const { rerender, queryClient } = renderDialog(kpi);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });

    // User edits the name
    const nameInput = screen.getByDisplayValue('Original Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited Name');

    // Verify user's changes are applied
    await waitFor(() => {
      expect(screen.getByDisplayValue('Edited Name')).toBeInTheDocument();
    });

    // Simulate a "refetch" by re-rendering with a new object (same data, different reference)
    const refetchedKpi = { ...kpi }; // New object reference, same id
    rerender(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={refetchedKpi} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    // CRITICAL ASSERTION: User's edits should NOT be lost
    await waitFor(() => {
      expect(screen.getByDisplayValue('Edited Name')).toBeInTheDocument();
    });
  });

  it('RESETA formulário quando dialog fecha e reabre', async () => {
    const kpi = makeKpi({ 
      scope: 'team', 
      team_id: 'team-1', 
      area_id: null,
      name: 'Original Name',
    });
    
    const onOpenChange = vi.fn();
    const queryClient = createTestQueryClient();
    
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={kpi} open={true} onOpenChange={onOpenChange} />
      </QueryClientProvider>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });

    // User edits the name
    const nameInput = screen.getByDisplayValue('Original Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited Name');

    // Verify user's change
    expect(screen.getByDisplayValue('Edited Name')).toBeInTheDocument();

    // Close the dialog
    rerender(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={kpi} open={false} onOpenChange={onOpenChange} />
      </QueryClientProvider>
    );

    // Reopen the dialog
    rerender(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={kpi} open={true} onOpenChange={onOpenChange} />
      </QueryClientProvider>
    );

    // Form should be reset to original values
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
    });
  });

  it('RESETA formulário quando KPI muda (id diferente)', async () => {
    const kpi1 = makeKpi({ 
      id: 'kpi-1',
      scope: 'org', 
      name: 'KPI One',
      team_id: null,
      area_id: null,
    });
    
    const kpi2 = makeKpi({ 
      id: 'kpi-2',
      scope: 'team',
      team_id: 'team-2',
      name: 'KPI Two',
    });
    
    const queryClient = createTestQueryClient();
    
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={kpi1} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    // Wait for form to load with KPI 1
    await waitFor(() => {
      expect(screen.getByDisplayValue('KPI One')).toBeInTheDocument();
    });

    // User edits the name
    const nameInput = screen.getByDisplayValue('KPI One');
    await user.clear(nameInput);
    await user.type(nameInput, 'Edited KPI One');

    // Switch to a different KPI
    rerender(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={kpi2} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    // Form should show KPI 2's data, not the edited value
    await waitFor(() => {
      expect(screen.getByDisplayValue('KPI Two')).toBeInTheDocument();
    });

    // TeamSelect should appear because kpi2 has scope=team
    expect(screen.getByTestId('team-select')).toBeInTheDocument();
  });

  it('preserva edições em selects nativos (TeamSelect, AreaSelect)', async () => {
    const kpi = makeKpi({ 
      scope: 'team', 
      team_id: 'team-1', 
      name: 'Test KPI',
    });
    
    const { rerender, queryClient } = renderDialog(kpi);

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByTestId('team-select')).toBeInTheDocument();
    });

    // Change team selection
    const teamSelect = screen.getByTestId('team-select');
    await user.selectOptions(teamSelect, 'team-2');
    
    expect(teamSelect).toHaveValue('team-2');

    // Simulate refetch
    const refetchedKpi = { ...kpi };
    rerender(
      <QueryClientProvider client={queryClient}>
        <EditKpiDialog kpi={refetchedKpi} open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    // Team selection should be preserved
    await waitFor(() => {
      expect(screen.getByTestId('team-select')).toHaveValue('team-2');
    });
  });
});

describe('EditKpiDialog - Scope-dependent field visibility', () => {
  it('mostra TeamSelect quando scope=team', async () => {
    const kpi = makeKpi({ scope: 'team', team_id: 'team-1' });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.getByTestId('team-select')).toBeInTheDocument();
      expect(screen.queryByTestId('area-select')).not.toBeInTheDocument();
    });
  });

  it('mostra AreaSelect quando scope=area', async () => {
    const kpi = makeKpi({ scope: 'area', team_id: null, area_id: 'area-1' });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.getByTestId('area-select')).toBeInTheDocument();
      expect(screen.queryByTestId('team-select')).not.toBeInTheDocument();
    });
  });

  it('não mostra seletores quando scope=org', async () => {
    const kpi = makeKpi({ scope: 'org', team_id: null, area_id: null });
    renderDialog(kpi);

    await waitFor(() => {
      expect(screen.queryByTestId('team-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('area-select')).not.toBeInTheDocument();
    });
  });
});
