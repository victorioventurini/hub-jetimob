/**
 * Tests for CollaboratorContextStep component
 * 
 * v2.83.0: Updated to test separated KPI sections by role:
 * - kpisToUpdate (contributor role)
 * - kpisTeamContext (team context, read-only)
 * - kpisStrategic (org-level, read-only)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { CollaboratorContextStep } from '../CollaboratorContextStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// Mock dependencies
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));

vi.mock('@/modules/kpis/components/KpiContextSection', () => ({
  KpiContextSection: ({ title, kpis }: { title: string; kpis: unknown[] }) => (
    <div data-testid={`kpi-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title} ({kpis.length})
    </div>
  ),
}));

// ============================================================
// Test Data Factories
// ============================================================

const createMockKr = (overrides: Partial<WizardKr> = {}): WizardKr => ({
  id: 'kr-1',
  title: 'Aumentar NPS em 10 pontos',
  objective_id: 'obj-1',
  objective_title: 'Melhorar satisfação do cliente',
  team_id: 'team-1',
  team_name: 'Time de Produto',
  owner_user_id: 'user-1',
  owner_name: 'João Silva',
  owner_photo: null,
  status: 'yellow',
  progress: 45,
  current_value: 45,
  target: 100,
  unit: '%',
  baseline: 35,
  direction: 'up',
  is_pending: true,
  is_at_risk: true,
  days_since_checkin: 5,
  last_checkin_at: '2026-01-28',
  ...overrides,
});

const createMockKpiV2 = (overrides: Partial<KpiForWizardV2> = {}): KpiForWizardV2 => ({
  id: 'kpi-1',
  name: 'Taxa de Conversão',
  unit: '%',
  target_value: 15,
  direction: 'up',
  frequency: 'weekly',
  lifecycle_status: 'active',
  recovery_protocol: null,
  team_id: 'team-1',
  area_id: null,
  owner_user_id: 'user-1',
  scope: 'team',
  latest_value: 12,
  latest_reference_date: '2026-01-30',
  latest_rag_status: 'at_risk',
  latest_confidence: 'high',
  latest_period_label: 'Semana 5',
  needs_update: true,
  userRole: 'contributor',
  isStrategic: false,
  isGuardrailAtRisk: false,
  linkedKrIds: [],
  displayMode: 'editable',
  alertReason: null,
  owner: null,
  team: null,
  area: null,
  ...overrides,
});

// ============================================================
// SCENARIO 1: User has KRs AND KPIs to update
// ============================================================

describe('CollaboratorContextStep - Scenario 1: KRs + KPIs', () => {
  const mockKrs = [
    createMockKr({ id: 'kr-1', title: 'KR Alpha' }),
    createMockKr({ id: 'kr-2', title: 'KR Beta', is_at_risk: false }),
  ];
  
  const mockKpisToUpdate = [
    createMockKpiV2({ id: 'kpi-1', name: 'KPI Gamma' }),
    createMockKpiV2({ id: 'kpi-2', name: 'KPI Delta', needs_update: false }),
  ];

  it('should render both KRs and KPIs sections', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpisToUpdate={mockKpisToUpdate} 
        onContinue={vi.fn()} 
      />
    );

    // KRs should be visible
    expect(screen.getByText('KR Alpha')).toBeInTheDocument();
    expect(screen.getByText('KR Beta')).toBeInTheDocument();

    // KPIs section should be visible (via mock)
    expect(screen.getByTestId('kpi-section-kpis-para-atualizar')).toBeInTheDocument();
  });

  it('should show correct stats for KRs', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpisToUpdate={mockKpisToUpdate} 
        onContinue={vi.fn()} 
      />
    );

    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('KRs atribuídos')).toBeInTheDocument();
  });

  it('should enable continue button when user has work', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpisToUpdate={mockKpisToUpdate} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button', { name: /atualizar/i });
    expect(continueButton).not.toBeDisabled();
  });
});

// ============================================================
// SCENARIO 2: User has only KRs (no KPIs)
// ============================================================

describe('CollaboratorContextStep - Scenario 2: Only KRs', () => {
  const mockKrs = [
    createMockKr({ id: 'kr-1', title: 'Solo KR' }),
  ];

  it('should render KRs section without KPIs section', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpisToUpdate={[]} 
        onContinue={vi.fn()} 
      />
    );

    // KRs should be visible
    expect(screen.getByText('Solo KR')).toBeInTheDocument();

    // KPIs section should NOT be visible
    expect(screen.queryByTestId('kpi-section-kpis-para-atualizar')).not.toBeInTheDocument();
  });

  it('should enable continue button', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpisToUpdate={[]} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button', { name: /atualizar|continuar/i });
    expect(continueButton).not.toBeDisabled();
  });
});

// ============================================================
// SCENARIO 3: User has only KPIs (no KRs)
// ============================================================

describe('CollaboratorContextStep - Scenario 3: Only KPIs', () => {
  const mockKpisToUpdate = [
    createMockKpiV2({ id: 'kpi-1', name: 'Solo KPI', needs_update: true }),
  ];

  it('should render KPIs section without KRs stats', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpisToUpdate={mockKpisToUpdate} 
        onContinue={vi.fn()} 
      />
    );

    // KPIs should be visible
    expect(screen.getByTestId('kpi-section-kpis-para-atualizar')).toBeInTheDocument();

    // KR stats should NOT be visible
    expect(screen.queryByText('KRs atribuídos')).not.toBeInTheDocument();
  });

  it('should enable continue button when only KPIs exist', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpisToUpdate={mockKpisToUpdate} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button');
    expect(continueButton).not.toBeDisabled();
  });
});

// ============================================================
// v2.83.0: SCENARIO 4: Context and Strategic sections
// ============================================================

describe('CollaboratorContextStep - v2.83.0: Role-based sections', () => {
  const mockKrs = [createMockKr()];
  const mockKpisToUpdate = [createMockKpiV2({ id: 'kpi-update' })];
  const mockKpisTeamContext = [createMockKpiV2({ id: 'kpi-context', userRole: 'viewer' })];
  const mockKpisStrategic = [createMockKpiV2({ id: 'kpi-strategic', isStrategic: true, scope: 'org' })];

  it('should render all three KPI sections when data exists', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs}
        kpisToUpdate={mockKpisToUpdate}
        kpisTeamContext={mockKpisTeamContext}
        kpisStrategic={mockKpisStrategic}
        onContinue={vi.fn()} 
      />
    );

    expect(screen.getByTestId('kpi-section-kpis-para-atualizar')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-section-indicadores-do-time')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-section-indicadores-estratégicos')).toBeInTheDocument();
  });
});

// ============================================================
// EMPTY STATE: No KRs and No KPIs
// ============================================================

describe('CollaboratorContextStep - Empty State', () => {
  it('should show empty state message when no KRs and no KPIs', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpisToUpdate={[]} 
        onContinue={vi.fn()} 
      />
    );

    expect(screen.getByText('Nada para atualizar')).toBeInTheDocument();
    expect(screen.getByText(/Você não possui KRs ou KPIs/i)).toBeInTheDocument();
  });

  it('should disable continue button when empty', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpisToUpdate={[]} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button', { name: /continuar/i });
    expect(continueButton).toBeDisabled();
  });
});

// ============================================================
// LOADING STATE
// ============================================================

describe('CollaboratorContextStep - Loading State', () => {
  it('should show skeleton when loading', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpisToUpdate={[]} 
        isLoading={true}
        onContinue={vi.fn()} 
      />
    );

    // Skeleton elements should be present (generic check)
    expect(screen.queryByText('Nada para atualizar')).not.toBeInTheDocument();
  });
});
