/**
 * Tests for CollaboratorContextStep component
 * 
 * Validates the 3 wizard entry scenarios:
 * 1. User has KRs AND KPIs
 * 2. User has only KRs (no KPIs)
 * 3. User has only KPIs (no KRs)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollaboratorContextStep } from '../CollaboratorContextStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { KpiForWizard } from '@/modules/kpis/hooks';

// Mock dependencies
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));

vi.mock('../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
  WizardTipCard: () => null,
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

const createMockKpi = (overrides: Partial<KpiForWizard> = {}): KpiForWizard => ({
  id: 'kpi-1',
  name: 'Taxa de Conversão',
  unit: '%',
  target_value: 15,
  direction: 'up',
  frequency: 'weekly',
  lifecycle_status: 'active',
  recovery_protocol: null,
  team_id: 'team-1',
  owner_user_id: 'user-1',
  latest_value: 12,
  latest_reference_date: '2026-01-30',
  latest_rag_status: 'at_risk',
  latest_confidence: 'high',
  latest_period_label: 'Semana 5',
  needs_update: true,
  ...overrides,
});

// ============================================================
// SCENARIO 1: User has KRs AND KPIs
// ============================================================

describe('CollaboratorContextStep - Scenario 1: KRs + KPIs', () => {
  const mockKrs = [
    createMockKr({ id: 'kr-1', title: 'KR Alpha' }),
    createMockKr({ id: 'kr-2', title: 'KR Beta', is_at_risk: false }),
  ];
  
  const mockKpis = [
    createMockKpi({ id: 'kpi-1', name: 'KPI Gamma' }),
    createMockKpi({ id: 'kpi-2', name: 'KPI Delta', needs_update: false }),
  ];

  it('should render both KRs and KPIs sections', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    // KRs should be visible
    expect(screen.getByText('KR Alpha')).toBeInTheDocument();
    expect(screen.getByText('KR Beta')).toBeInTheDocument();

    // KPIs section should be visible
    expect(screen.getByText('Indicadores (KPIs)')).toBeInTheDocument();
    expect(screen.getByText('KPI Gamma')).toBeInTheDocument();
    expect(screen.getByText('KPI Delta')).toBeInTheDocument();
  });

  it('should show correct stats for KRs and KPIs', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    // KR stats - use getAllByText since there may be multiple elements with same number
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('KRs atribuídos')).toBeInTheDocument();

    // KPI stats
    expect(screen.getByText('2 indicadores')).toBeInTheDocument();
    expect(screen.getByText('1 pendentes')).toBeInTheDocument(); // only kpi-1 needs_update
  });

  it('should enable continue button when user has work', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button', { name: /atualizar/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('should show combined update counts in button label', () => {
    const pendingKrs = [createMockKr({ is_pending: true })];
    const pendingKpis = [createMockKpi({ needs_update: true })];

    render(
      <CollaboratorContextStep 
        krs={pendingKrs} 
        kpis={pendingKpis} 
        onContinue={vi.fn()} 
      />
    );

    // Button should mention both KRs and KPIs
    const continueButton = screen.getByRole('button');
    expect(continueButton).toHaveTextContent(/1 KR/i);
    expect(continueButton).toHaveTextContent(/1 KPI/i);
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
        kpis={[]} 
        onContinue={vi.fn()} 
      />
    );

    // KRs should be visible
    expect(screen.getByText('Solo KR')).toBeInTheDocument();

    // KPIs section should NOT be visible
    expect(screen.queryByText('Indicadores (KPIs)')).not.toBeInTheDocument();
  });

  it('should show only KR stats', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpis={[]} 
        onContinue={vi.fn()} 
      />
    );

    // KR stats should be visible
    expect(screen.getByText('KRs atribuídos')).toBeInTheDocument();

    // KPI-specific stats should not appear
    expect(screen.queryByText(/indicadores/i)).not.toBeInTheDocument();
  });

  it('should enable continue button', () => {
    render(
      <CollaboratorContextStep 
        krs={mockKrs} 
        kpis={[]} 
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
  const mockKpis = [
    createMockKpi({ id: 'kpi-1', name: 'Solo KPI', needs_update: true }),
  ];

  it('should render KPIs section without KRs stats', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    // KPIs should be visible
    expect(screen.getByText('Indicadores (KPIs)')).toBeInTheDocument();
    expect(screen.getByText('Solo KPI')).toBeInTheDocument();

    // KR stats should NOT be visible
    expect(screen.queryByText('KRs atribuídos')).not.toBeInTheDocument();
  });

  it('should show only KPI stats in header', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    expect(screen.getByText('KPIs para atualizar')).toBeInTheDocument();
    expect(screen.getByText('1 indicadores')).toBeInTheDocument();
  });

  it('should enable continue button when only KPIs exist', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button');
    expect(continueButton).not.toBeDisabled();
  });

  it('should show KPI count in button label', () => {
    render(
      <CollaboratorContextStep 
        krs={[]} 
        kpis={mockKpis} 
        onContinue={vi.fn()} 
      />
    );

    const continueButton = screen.getByRole('button');
    expect(continueButton).toHaveTextContent(/1 KPI/i);
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
        kpis={[]} 
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
        kpis={[]} 
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
        kpis={[]} 
        isLoading={true}
        onContinue={vi.fn()} 
      />
    );

    // Skeleton elements should be present (generic check)
    expect(screen.queryByText('Nada para atualizar')).not.toBeInTheDocument();
  });
});
