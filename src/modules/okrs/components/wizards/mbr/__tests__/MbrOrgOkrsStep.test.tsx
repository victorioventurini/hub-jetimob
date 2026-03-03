/**
 * @file MbrOrgOkrsStep.test.tsx
 * @description Tests for MBR OKRs Organizacionais step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MbrOrgOkrsStep } from '../MbrOrgOkrsStep';
import type { MbrOrgOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <div data-testid="wizard-step-header"><h3>{title}</h3></div>,
  WizardStepFooter: ({ primaryLabel, onPrimary, onBack, primaryDisabled }: any) => (
    <div data-testid="wizard-step-footer">
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="primary-btn" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</button>
    </div>
  ),
  WizardStepScaffold: ({ header, children, bottomFixed, footer }: any) => (
    <div data-testid="wizard-step-scaffold">{header}{children}{bottomFixed}{footer}</div>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
}));

vi.mock('@/modules/okrs/components/OkrProgressBar', () => ({
  OkrProgressBar: ({ current, target }: any) => (
    <div data-testid="okr-progress-bar">{current}/{target}</div>
  ),
}));

vi.mock('@/modules/okrs/components/OkrStatusBadge', () => ({
  OkrStatusBadge: ({ status }: any) => (
    <span data-testid="okr-status-badge">{status}</span>
  ),
}));

const createKr = (overrides = {}) => ({
  krId: 'kr-1',
  title: 'Atingir 1M MRR',
  progress: 50,
  status: 'yellow',
  ownerName: 'João',
  baseline: 0,
  current: 500000,
  target: 1000000,
  direction: 'up' as const,
  unit: 'R$',
  lastCheckinAt: null,
  ...overrides,
});

const createOkr = (overrides: Partial<MbrOrgOkrSnapshot> = {}): MbrOrgOkrSnapshot => ({
  objectiveId: 'obj-1',
  title: 'Aumentar receita em 30%',
  progress: 45,
  status: 'on_track',
  trend: 'improving',
  remainsStrategicPriority: true,
  keyResults: [],
  ...overrides,
});

const defaultProps = () => ({
  orgOkrSnapshots: [] as MbrOrgOkrSnapshot[],
  onOrgOkrSnapshotsChange: vi.fn(),
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  onContinue: vi.fn(),
  onBack: vi.fn(),
});

describe('MbrOrgOkrsStep', () => {
  it('renders header', () => {
    render(<MbrOrgOkrsStep {...defaultProps()} />);
    expect(screen.getByText('OKRs Organizacionais')).toBeInTheDocument();
  });

  it('renders empty state when no OKRs', () => {
    render(<MbrOrgOkrsStep {...defaultProps()} />);
    expect(screen.getByText(/nenhuma okr organizacional/i)).toBeInTheDocument();
  });

  it('renders OKR cards with title and progress', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ title: 'OKR Alpha', progress: 65 })];
    render(<MbrOrgOkrsStep {...props} />);
    expect(screen.getByText('OKR Alpha')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('shows trend indicator', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ trend: 'improving' })];
    render(<MbrOrgOkrsStep {...props} />);
    expect(screen.getByText('Melhorando')).toBeInTheDocument();
  });

  it('renders priority question for each OKR', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr()];
    render(<MbrOrgOkrsStep {...props} />);
    expect(screen.getByText(/continua sendo prioridade estratégica/i)).toBeInTheDocument();
  });

  it('toggles priority to "Não" and calls onOrgOkrSnapshotsChange', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ objectiveId: 'o1', remainsStrategicPriority: true })];
    render(<MbrOrgOkrsStep {...props} />);
    
    fireEvent.click(screen.getByText('Não'));
    
    expect(props.onOrgOkrSnapshotsChange).toHaveBeenCalledWith([
      expect.objectContaining({ objectiveId: 'o1', remainsStrategicPriority: false }),
    ]);
  });

  it('shows InlineDecisionInput when OKR marked as not priority', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ remainsStrategicPriority: false })];
    render(<MbrOrgOkrsStep {...props} />);
    const inlineInputs = screen.getAllByTestId('inline-decision-org-okrs');
    expect(inlineInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('GATE: disables continue when non-priority OKR lacks decision', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ title: 'Dropped OKR', remainsStrategicPriority: false })];
    props.decisions = [];
    render(<MbrOrgOkrsStep {...props} />);
    
    expect(screen.getByTestId('primary-btn')).toBeDisabled();
    expect(screen.getByText(/registre decisões para okrs/i)).toBeInTheDocument();
  });

  it('GATE: enables continue when all non-priority OKRs have decisions', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ title: 'Dropped OKR', remainsStrategicPriority: false })];
    props.decisions = [{
      id: 'd1',
      text: 'Ajuste: Dropped OKR será descontinuada',
      category: 'focus_adjustment',
      sourceStep: 'org-okrs',
    }];
    render(<MbrOrgOkrsStep {...props} />);
    
    expect(screen.getByTestId('primary-btn')).not.toBeDisabled();
  });

  it('enables continue when all OKRs remain priority', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({ remainsStrategicPriority: true })];
    render(<MbrOrgOkrsStep {...props} />);
    expect(screen.getByTestId('primary-btn')).not.toBeDisabled();
  });

  it('renders general notes InlineDecisionInput', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr()];
    render(<MbrOrgOkrsStep {...props} />);
    expect(screen.getByTestId('inline-decision-org-okrs')).toBeInTheDocument();
  });

  it('renders Key Results with OkrProgressBar and OkrStatusBadge', () => {
    const props = defaultProps();
    props.orgOkrSnapshots = [createOkr({
      keyResults: [
        createKr({ krId: 'kr-1', title: 'KR Alpha', status: 'green' }),
        createKr({ krId: 'kr-2', title: 'KR Beta', status: 'red', ownerName: 'Maria' }),
      ],
    })];
    render(<MbrOrgOkrsStep {...props} />);

    expect(screen.getByText('KR Alpha')).toBeInTheDocument();
    expect(screen.getByText('KR Beta')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getAllByTestId('okr-progress-bar')).toHaveLength(2);
    // 1 objective badge + 2 KR badges
    expect(screen.getAllByTestId('okr-status-badge').length).toBeGreaterThanOrEqual(2);
  });

  it('uses WizardStepScaffold for layout', () => {
    render(<MbrOrgOkrsStep {...defaultProps()} />);
    expect(screen.getByTestId('wizard-step-scaffold')).toBeInTheDocument();
  });
});
