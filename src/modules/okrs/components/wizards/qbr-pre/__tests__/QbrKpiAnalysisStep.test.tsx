/**
 * QbrKpiAnalysisStep tests
 * Validates KPI rendering by RAG status. ("Zombie?" toggle removido em 2026-04-28.)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { QbrKpiAnalysisStep, type QbrKpiAnalysisStepProps } from '../QbrKpiAnalysisStep';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, badge }: { title: string; badge?: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3>{badge && <span>{badge}</span>}</div>
  ),
  WizardStepFooter: ({ onPrimary, onBack }: any) => (
    <div>
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary}>Continuar</button>
    </div>
  ),
  WizardStepScaffold: ({ header, footer, bottomFixed, children }: any) => (
    <div>{header}{bottomFixed}{children}{footer}</div>
  ),
  InlineDecisionInput: () => <div data-testid="inline-decision-input" />,
  KpiStatusBlocks: () => <div data-testid="kpi-status-blocks" />,
  TeamKrsToggle: ({ visible, onToggle }: any) => (
    <button data-testid="team-krs-toggle" onClick={onToggle}>
      {visible ? 'Ocultar KRs' : 'Mostrar KRs'}
    </button>
  ),
  LastCheckinBadge: () => <span data-testid="last-checkin-badge" />,
}));

function createKpi(overrides: Partial<MbrKpiSnapshot> = {}): MbrKpiSnapshot {
  return {
    kpiId: `kpi-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test KPI',
    currentValue: 42,
    previousValue: 38,
    target: 50,
    unit: '%',
    ragStatus: 'green',
    variationVsLastMonth: null,
    variationVsTarget: null,
    requiresStrategicDecision: false,
    ...overrides,
  };
}

function renderStep(overrides: Partial<QbrKpiAnalysisStepProps> = {}) {
  const defaultProps: QbrKpiAnalysisStepProps = {
    kpiSnapshots: [],
    decisions: [],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return render(<QbrKpiAnalysisStep {...defaultProps} />);
}

describe('QbrKpiAnalysisStep', () => {
  it('renders header with title', () => {
    renderStep();
    expect(screen.getByText('Análise de KPIs')).toBeInTheDocument();
  });

  it('shows KPI count badge', () => {
    renderStep({ kpiSnapshots: [createKpi(), createKpi()] });
    expect(screen.getByText('2 KPIs')).toBeInTheDocument();
  });

  it('separates KPIs by RAG status — alert section', () => {
    renderStep({
      kpiSnapshots: [
        createKpi({ name: 'KPI Red', ragStatus: 'red' }),
        createKpi({ name: 'KPI Yellow', ragStatus: 'yellow' }),
      ],
    });
    expect(screen.getByText(/KPIs em alerta \(2\)/)).toBeInTheDocument();
  });

  it('renders healthy KPIs section', () => {
    renderStep({
      kpiSnapshots: [createKpi({ name: 'KPI OK', ragStatus: 'green' })],
    });
    expect(screen.getByText(/KPIs na meta \(1\)/)).toBeInTheDocument();
  });

  it('calls onContinue and onBack', () => {
    const onContinue = vi.fn();
    const onBack = vi.fn();
    renderStep({ onContinue, onBack });
    screen.getByTestId('btn-primary').click();
    screen.getByTestId('btn-back').click();
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

