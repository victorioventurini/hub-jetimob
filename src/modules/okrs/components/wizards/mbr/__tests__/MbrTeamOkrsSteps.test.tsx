/**
 * @file MbrTeamOkrsSteps.test.tsx
 * @description Tests for MBR Team OKRs Overview and Detail steps
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MbrTeamOkrsOverviewStep } from '../MbrTeamOkrsOverviewStep';
import { MbrTeamOkrsDetailStep } from '../MbrTeamOkrsDetailStep';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// Mock shared wizard components
vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, description, rightContent }: { title: string; description?: string; rightContent?: React.ReactNode }) => (
    <div data-testid="wizard-step-header">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {rightContent}
    </div>
  ),
  WizardStepFooter: ({ primaryLabel, onPrimary, primaryDisabled, onBack }: any) => (
    <div data-testid="wizard-footer">
      <button data-testid="wizard-footer-back" onClick={onBack}>Voltar</button>
      <button data-testid="wizard-footer-primary" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</button>
    </div>
  ),
  WizardFirstStepFooter: ({ primaryLabel, onPrimary }: any) => (
    <button data-testid="wizard-footer-primary" onClick={onPrimary}>{primaryLabel}</button>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
}));

// ============================================================
// Factories
// ============================================================

const createTeamSnapshot = (overrides: Partial<MbrTeamOkrSnapshot> = {}): MbrTeamOkrSnapshot => ({
  teamId: 'team-1',
  teamName: 'Dev Backend',
  objectives: [
    {
      objectiveId: 'obj-1',
      title: 'Melhorar performance da API',
      progress: 60,
      status: 'on_track',
      krCount: 3,
      krsAtRisk: 0,
      krsStagnant: 0,
      trend: 'improving',
      keyResults: [
        { krId: 'kr-1', title: 'Reduzir latência p95', progress: 70, status: 'on_track', ownerName: 'João' },
        { krId: 'kr-2', title: 'Cobertura de testes', progress: 50, status: 'on_track', ownerName: 'Maria' },
        { krId: 'kr-3', title: 'Uptime 99.9%', progress: 60, status: 'on_track', ownerName: null },
      ],
    },
  ],
  healthScore: 75,
  healthStatus: 'healthy',
  reviewed: false,
  ...overrides,
});

// ============================================================
// Overview Tests
// ============================================================

describe('MbrTeamOkrsOverviewStep', () => {
  const defaultProps = () => ({
    teamOkrSnapshots: [] as MbrTeamOkrSnapshot[],
    decisions: [] as TeamCheckinDecision[],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  });

  it('renders header with correct title', () => {
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} />);
    expect(screen.getByText('OKRs dos Times')).toBeInTheDocument();
  });

  it('shows empty state when no teams', () => {
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} />);
    expect(screen.getByText(/Nenhum time com OKRs/)).toBeInTheDocument();
  });

  it('renders team cards with names and progress', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', teamName: 'Backend', healthStatus: 'healthy', healthScore: 80 }),
      createTeamSnapshot({ teamId: 't2', teamName: 'Frontend', healthStatus: 'risk', healthScore: 30 }),
      createTeamSnapshot({ teamId: 't3', teamName: 'Design', healthStatus: 'attention', healthScore: 55 }),
    ];
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    // Each card shows progress percentage
    expect(screen.getAllByText('60%').length).toBeGreaterThanOrEqual(3);
  });

  it('displays summary bar with average progress', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', healthStatus: 'healthy' }),
      createTeamSnapshot({ teamId: 't2', healthStatus: 'risk' }),
    ];
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('Progresso médio')).toBeInTheDocument();
  });

  it('sorts teams risk first', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', teamName: 'Healthy Team', healthStatus: 'healthy' }),
      createTeamSnapshot({ teamId: 't2', teamName: 'Risk Team', healthStatus: 'risk' }),
    ];
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} teamOkrSnapshots={teams} />);
    const cards = screen.getAllByText(/Team$/);
    expect(cards[0]).toHaveTextContent('Risk Team');
    expect(cards[1]).toHaveTextContent('Healthy Team');
  });

  it('renders inline decision for overview step', () => {
    render(<MbrTeamOkrsOverviewStep {...defaultProps()} />);
    expect(screen.getByTestId('inline-decision-team-okrs-overview')).toBeInTheDocument();
  });

  it('calls onContinue when primary button clicked', () => {
    const props = defaultProps();
    render(<MbrTeamOkrsOverviewStep {...props} />);
    fireEvent.click(screen.getByTestId('wizard-footer-primary'));
    expect(props.onContinue).toHaveBeenCalled();
  });
});

// ============================================================
// Detail Tests
// ============================================================

describe('MbrTeamOkrsDetailStep', () => {
  const defaultProps = () => ({
    teamOkrSnapshots: [] as MbrTeamOkrSnapshot[],
    onTeamOkrSnapshotsChange: vi.fn(),
    currentTeamIndex: 0,
    onCurrentTeamIndexChange: vi.fn(),
    decisions: [] as TeamCheckinDecision[],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  });

  it('shows empty state when no teams', () => {
    render(<MbrTeamOkrsDetailStep {...defaultProps()} />);
    expect(screen.getByText(/Nenhum time com OKRs para revisar/)).toBeInTheDocument();
  });

  it('renders current team name in header', () => {
    const teams = [createTeamSnapshot({ teamName: 'Dev Backend' })];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('Dev Backend')).toBeInTheDocument();
  });

  it('shows team navigation with correct count', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', teamName: 'Team A' }),
      createTeamSnapshot({ teamId: 't2', teamName: 'Team B' }),
    ];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('renders objectives and KRs', () => {
    const teams = [createTeamSnapshot()];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('Melhorar performance da API')).toBeInTheDocument();
    expect(screen.getByText('Reduzir latência p95')).toBeInTheDocument();
    expect(screen.getByText('Cobertura de testes')).toBeInTheDocument();
  });

  it('shows reviewed checkbox', () => {
    const teams = [createTeamSnapshot()];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText(/Marcar "Dev Backend" como revisado/)).toBeInTheDocument();
  });

  it('disables continue when not all teams reviewed', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', reviewed: false }),
      createTeamSnapshot({ teamId: 't2', reviewed: true }),
    ];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByTestId('wizard-footer-primary')).toBeDisabled();
  });

  it('enables continue when all teams with OKRs are reviewed', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', reviewed: true }),
      createTeamSnapshot({ teamId: 't2', reviewed: true }),
    ];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByTestId('wizard-footer-primary')).not.toBeDisabled();
  });

  it('teams without OKRs do not block gate', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', reviewed: true }),
      createTeamSnapshot({ teamId: 't2', teamName: 'Empty Team', objectives: [], reviewed: false }),
    ];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByTestId('wizard-footer-primary')).not.toBeDisabled();
  });

  it('toggles reviewed state via checkbox', () => {
    const onChange = vi.fn();
    const teams = [createTeamSnapshot({ reviewed: false })];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} onTeamOkrSnapshotsChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ reviewed: true })])
    );
  });

  it('renders inline decision for detail step', () => {
    const teams = [createTeamSnapshot()];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByTestId('inline-decision-team-okrs-detail')).toBeInTheDocument();
  });

  it('shows review progress', () => {
    const teams = [
      createTeamSnapshot({ teamId: 't1', reviewed: true }),
      createTeamSnapshot({ teamId: 't2', reviewed: false }),
    ];
    render(<MbrTeamOkrsDetailStep {...defaultProps()} teamOkrSnapshots={teams} />);
    expect(screen.getByText('1 de 2 times revisados')).toBeInTheDocument();
  });
});
