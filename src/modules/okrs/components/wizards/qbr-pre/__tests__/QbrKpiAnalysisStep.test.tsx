/**
 * QbrKpiAnalysisStep tests
 * Validates KPI rendering, zombie toggle, and KPI creation form
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
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
    trend: 'improving',
    ...overrides,
  };
}

function renderStep(overrides: Partial<QbrKpiAnalysisStepProps> = {}) {
  const defaultProps: QbrKpiAnalysisStepProps = {
    kpiSnapshots: [],
    zombieCandidates: [],
    onZombieCandidatesChange: vi.fn(),
    kpisToCreate: [],
    onKpisToCreateChange: vi.fn(),
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

  it('toggles zombie candidate', () => {
    const onZombieCandidatesChange = vi.fn();
    const kpi = createKpi({ kpiId: 'kpi-1', ragStatus: 'red' });
    renderStep({
      kpiSnapshots: [kpi],
      zombieCandidates: [],
      onZombieCandidatesChange,
    });
    // Click the zombie checkbox
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(onZombieCandidatesChange).toHaveBeenCalledWith(['kpi-1']);
  });

  it('removes zombie candidate when already selected', () => {
    const onZombieCandidatesChange = vi.fn();
    const kpi = createKpi({ kpiId: 'kpi-1', ragStatus: 'red' });
    renderStep({
      kpiSnapshots: [kpi],
      zombieCandidates: ['kpi-1'],
      onZombieCandidatesChange,
    });
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(onZombieCandidatesChange).toHaveBeenCalledWith([]);
  });

  it('shows zombie summary when candidates exist', () => {
    renderStep({ zombieCandidates: ['kpi-1', 'kpi-2'] });
    expect(screen.getByText(/2 KPIs marcados como potencialmente zombie/)).toBeInTheDocument();
  });

  it('adds KPI to create via input', () => {
    const onKpisToCreateChange = vi.fn();
    renderStep({ onKpisToCreateChange });
    
    const input = screen.getByPlaceholderText('Descreva o indicador...');
    fireEvent.change(input, { target: { value: 'Novo KPI importante' } });
    
    // Click add button (the one next to the input)
    const addButtons = screen.getAllByRole('button');
    const addBtn = addButtons.find(b => !b.hasAttribute('data-testid'));
    if (addBtn) fireEvent.click(addBtn);
    
    expect(onKpisToCreateChange).toHaveBeenCalled();
  });

  it('shows existing KPIs to create', () => {
    renderStep({
      kpisToCreate: [
        { description: 'NPS de locação', suggestedScope: 'team', relatedKrTitle: '' },
      ],
    });
    expect(screen.getByText('NPS de locação')).toBeInTheDocument();
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
