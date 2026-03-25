/**
 * @file CLevelSteps.test.tsx
 * @description Real rendering tests for C-Level check-in wizard steps
 * 
 * Coverage:
 * - CLevelCompanyOkrsStep: OKR cards, trends, empty state, loading
 * - CLevelInsightsStep: KPI signal categorization, OKR summary
 * - CLevelDecisionsStep: textarea interaction, navigation
 * - CLevelDirectivesStep: submit flow, loading state
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

// Mock heavy dependencies
vi.mock('../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => <span data-testid="tooltip-inline" />,
  WizardTooltip: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => <span data-testid="vic-helper" />,
}));
vi.mock('../shared/LastCheckinBadge', () => ({
  LastCheckinBadge: ({ lastCompletedAt }: { lastCompletedAt: string | null }) =>
    lastCompletedAt ? <span data-testid="last-checkin">{lastCompletedAt}</span> : null,
}));

import { CLevelCompanyOkrsStep } from './CLevelCompanyOkrsStep';
import { CLevelInsightsStep } from './CLevelInsightsStep';
import { CLevelDecisionsStep } from './CLevelDecisionsStep';
import { CLevelDirectivesStep } from './CLevelDirectivesStep';

// ── Factories ──

function createCompanyOkr(overrides: Partial<{ id: string; title: string; progress: number; trend: 'improving' | 'stable' | 'declining' }> = {}) {
  return {
    id: overrides.id ?? 'okr-1',
    title: overrides.title ?? 'Aumentar receita recorrente',
    progress: overrides.progress ?? 65,
    trend: overrides.trend ?? ('improving' as const),
  };
}

function createKpiForWizard(overrides: Record<string, unknown> = {}): import('@/modules/kpis/types').KpiForWizardV2 {
  return {
    id: 'kpi-1',
    name: 'NPS Geral',
    unit: 'pontos',
    target_value: 80,
    direction: 'up' as const,
    frequency: 'monthly' as const,
    lifecycle_status: 'active' as const,
    recovery_protocol: null,
    team_id: null,
    area_id: null,
    owner_user_id: null,
    scope: 'org' as const,
    latest_value: 72,
    latest_reference_date: null,
    latest_rag_status: 'on_track' as const,
    latest_confidence: null,
    latest_period_label: null,
    needs_update: false,
    userRole: 'viewer' as const,
    isStrategic: true,
    isGuardrailAtRisk: false,
    linkedKrIds: [],
    displayMode: 'readonly' as const,
    alertReason: null,
    area: null,
    ...overrides,
  } as import('@/modules/kpis/types').KpiForWizardV2;
}

// ══════════════════════════════════════════════════
// CLevelCompanyOkrsStep
// ══════════════════════════════════════════════════

describe('CLevelCompanyOkrsStep', () => {
  const baseProps = {
    okrs: [createCompanyOkr()],
    onContinue: vi.fn(),
  };

  it('renders header with title', () => {
    render(<CLevelCompanyOkrsStep {...baseProps} />);
    expect(screen.getByText('OKRs da Empresa')).toBeInTheDocument();
  });

  it('renders OKR cards with progress', () => {
    const okrs = [
      createCompanyOkr({ title: 'Receita', progress: 80 }),
      createCompanyOkr({ id: 'okr-2', title: 'Retenção', progress: 45, trend: 'declining' }),
    ];
    render(<CLevelCompanyOkrsStep {...baseProps} okrs={okrs} />);
    expect(screen.getByText('Receita')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Retenção')).toBeInTheDocument();
    expect(screen.getByText('Em risco')).toBeInTheDocument();
  });

  it('renders empty state when no OKRs', () => {
    render(<CLevelCompanyOkrsStep {...baseProps} okrs={[]} />);
    expect(screen.getByText('Nenhum OKR organizacional')).toBeInTheDocument();
  });

  it('renders loading skeletons', () => {
    const { container } = render(<CLevelCompanyOkrsStep {...baseProps} isLoading />);
    // Skeleton component renders pulse animation divs
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('calls onContinue when button clicked', () => {
    const onContinue = vi.fn();
    render(<CLevelCompanyOkrsStep {...baseProps} onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Continuar'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('renders trend badges correctly', () => {
    const okrs = [
      createCompanyOkr({ id: '1', trend: 'improving' }),
      createCompanyOkr({ id: '2', trend: 'stable', title: 'Estável OKR' }),
    ];
    render(<CLevelCompanyOkrsStep {...baseProps} okrs={okrs} />);
    expect(screen.getByText('Melhorando')).toBeInTheDocument();
    expect(screen.getByText('Estável')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════
// CLevelInsightsStep
// ══════════════════════════════════════════════════

describe('CLevelInsightsStep', () => {
  const baseProps = {
    kpisStrategic: [] as ReturnType<typeof createKpiForWizard>[],
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header with title', () => {
    render(<CLevelInsightsStep {...baseProps} />);
    expect(screen.getByText('Sinais Estratégicos')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<CLevelInsightsStep {...baseProps} />);
    expect(screen.getByText('Sem indicadores estratégicos')).toBeInTheDocument();
  });

  it('categorizes KPIs by RAG status', () => {
    const kpis = [
      createKpiForWizard({ id: '1', name: 'KPI Bom', latest_rag_status: 'on_track' }),
      createKpiForWizard({ id: '2', name: 'KPI Ruim', latest_rag_status: 'off_track' }),
      createKpiForWizard({ id: '3', name: 'KPI Neutro', latest_rag_status: 'no_data' }),
    ];
    render(<CLevelInsightsStep {...baseProps} kpisStrategic={kpis} />);
    expect(screen.getByText(/Tendências Positivas/)).toBeInTheDocument();
    expect(screen.getByText(/Pontos de Atenção/)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando Dados/)).toBeInTheDocument();
  });

  it('renders OKR summary card when provided', () => {
    const kpis = [createKpiForWizard()];
    const okrsSummary = { total: 5, onTrack: 3, atRisk: 1, offTrack: 1 };
    render(<CLevelInsightsStep {...baseProps} kpisStrategic={kpis} okrsSummary={okrsSummary} />);
    expect(screen.getByText('Validação de Direção')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders VicHelper', () => {
    render(<CLevelInsightsStep {...baseProps} />);
    expect(screen.getByTestId('vic-helper')).toBeInTheDocument();
  });

  it('calls onBack and onContinue', () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();
    render(<CLevelInsightsStep {...baseProps} onBack={onBack} onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Voltar'));
    fireEvent.click(screen.getByText('Continuar'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

// ══════════════════════════════════════════════════
// CLevelDecisionsStep
// ══════════════════════════════════════════════════

describe('CLevelDecisionsStep', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header with title', () => {
    render(<CLevelDecisionsStep {...baseProps} />);
    expect(screen.getByText('Decisões Estratégicas')).toBeInTheDocument();
  });

  it('renders textarea with value', () => {
    render(<CLevelDecisionsStep {...baseProps} value="Decisão X" />);
    expect(screen.getByDisplayValue('Decisão X')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<CLevelDecisionsStep {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/Priorizar investimento/), {
      target: { value: 'Nova decisão' },
    });
    expect(onChange).toHaveBeenCalledWith('Nova decisão');
  });

  it('navigates back and forward', () => {
    const onBack = vi.fn();
    const onContinue = vi.fn();
    render(<CLevelDecisionsStep {...baseProps} onBack={onBack} onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Voltar'));
    fireEvent.click(screen.getByText('Continuar'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

// ══════════════════════════════════════════════════
// CLevelDirectivesStep
// ══════════════════════════════════════════════════

describe('CLevelDirectivesStep', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
    isSubmitting: false,
  };

  it('renders header with title', () => {
    render(<CLevelDirectivesStep {...baseProps} />);
    expect(screen.getByText('Diretrizes para a Organização')).toBeInTheDocument();
  });

  it('renders textarea with value', () => {
    render(<CLevelDirectivesStep {...baseProps} value="Foco Q1" />);
    expect(screen.getByDisplayValue('Foco Q1')).toBeInTheDocument();
  });

  it('calls onComplete on final button click', () => {
    const onComplete = vi.fn();
    render(<CLevelDirectivesStep {...baseProps} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Concluir Check-in'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('disables back button when submitting', () => {
    render(<CLevelDirectivesStep {...baseProps} isSubmitting />);
    expect(screen.getByText('Voltar').closest('button')).toBeDisabled();
  });

  it('shows loading state on submit button', () => {
    render(<CLevelDirectivesStep {...baseProps} isSubmitting />);
    expect(screen.getByText('Concluindo...')).toBeInTheDocument();
  });
});
