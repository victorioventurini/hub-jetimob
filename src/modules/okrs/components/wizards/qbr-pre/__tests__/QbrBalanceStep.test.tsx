/**
 * QbrBalanceStep tests
 * Validates KR balance rendering, state grouping, and decision input
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { QbrBalanceStep, type QbrBalanceStepProps } from '../QbrBalanceStep';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, badge }: { title: string; badge?: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3>{badge && <span>{badge}</span>}</div>
  ),
  WizardFirstStepFooter: ({ onPrimary, primaryLabel }: any) => (
    <button data-testid="btn-primary" onClick={onPrimary}>{primaryLabel || 'Continuar'}</button>
  ),
  WizardStepScaffold: ({ header, footer, bottomFixed, children }: any) => (
    <div>{header}{bottomFixed}{children}{footer}</div>
  ),
  InlineDecisionInput: () => <div data-testid="inline-decision-input" />,
}));

vi.mock('@/modules/okrs/hooks/useKrStateInsights', () => ({
  KR_STATE_CONFIG: {
    not_started: { label: 'Não iniciado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    healthy: { label: 'Saudável', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    stagnant: { label: 'Estagnado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    at_risk: { label: 'Em risco', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    off_track: { label: 'Fora da meta', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    achieved: { label: 'Alcançado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    exceeded: { label: 'Superado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    not_achieved: { label: 'Não alcançado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
  },
  calculateKrState: vi.fn(),
}));

function createKrState(overrides: Partial<QbrBalanceStepProps['krFinalStates'][0]> = {}) {
  return {
    krId: `kr-${Math.random().toString(36).slice(2, 8)}`,
    krTitle: 'Test KR',
    state: 'healthy' as const,
    finalProgress: 50,
    paceStatus: 'on_pace',
    ...overrides,
  };
}

function renderStep(overrides: Partial<QbrBalanceStepProps> = {}) {
  const defaultProps: QbrBalanceStepProps = {
    krFinalStates: [],
    onKrFinalStatesChange: vi.fn(),
    decisions: [],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
  return render(<QbrBalanceStep {...defaultProps} />);
}

describe('QbrBalanceStep', () => {
  it('renders header with title', () => {
    renderStep();
    expect(screen.getByText('Balanço do Ciclo')).toBeInTheDocument();
  });

  it('shows KR count badge', () => {
    renderStep({ krFinalStates: [createKrState(), createKrState()] });
    expect(screen.getByText('2 KRs')).toBeInTheDocument();
  });

  it('shows empty message when no KRs', () => {
    renderStep({ krFinalStates: [] });
    expect(screen.getByText('Nenhum KR encontrado para o ciclo atual.')).toBeInTheDocument();
  });

  it('renders KR cards with title and progress', () => {
    renderStep({
      krFinalStates: [
        createKrState({ krTitle: 'Aumentar receita', finalProgress: 75, state: 'healthy' }),
      ],
    });
    expect(screen.getByText('Aumentar receita')).toBeInTheDocument();
    expect(screen.getByText('75% progresso')).toBeInTheDocument();
  });

  it('shows state badge for each KR', () => {
    renderStep({
      krFinalStates: [createKrState({ state: 'achieved' })],
    });
    expect(screen.getByText('Alcançado')).toBeInTheDocument();
  });

  it('aggregates achieved + exceeded as Alcançados', () => {
    renderStep({
      krFinalStates: [
        createKrState({ state: 'achieved' }),
        createKrState({ state: 'exceeded' }),
        createKrState({ state: 'at_risk' }),
      ],
    });
    // Score card shows 2 achieved
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Alcançados')).toBeInTheDocument();
  });

  it('shows InlineDecisionInput', () => {
    renderStep();
    expect(screen.getByTestId('inline-decision-input')).toBeInTheDocument();
  });

  it('calls onContinue when primary button clicked', async () => {
    const onContinue = vi.fn();
    renderStep({ onContinue });
    screen.getByTestId('btn-primary').click();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows pace status when available', () => {
    renderStep({
      krFinalStates: [createKrState({ paceStatus: 'behind_pace' })],
    });
    expect(screen.getByText('· behind_pace')).toBeInTheDocument();
  });
});
