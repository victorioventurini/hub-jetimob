/**
 * QBR Meeting Steps tests
 * Covers: OpeningStep, OkrReviewStep, DecisionsStep, CommitmentsStep, ClosingStep
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';

// ── shared mocks ──
vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, badge }: { title: string; badge?: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3>{badge && <span>{badge}</span>}</div>
  ),
  WizardFirstStepFooter: ({ onPrimary, primaryLabel }: any) => (
    <button data-testid="btn-primary" onClick={onPrimary}>{primaryLabel || 'Continuar'}</button>
  ),
  WizardStepFooter: ({ onBack, onPrimary, primaryDisabled, primaryLabel }: any) => (
    <div>
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel || 'Continuar'}</button>
    </div>
  ),
  WizardLastStepFooter: ({ onBack, onPrimary, primaryDisabled, primaryLoading }: any) => (
    <div>
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryDisabled}>
        {primaryLoading ? 'Salvando...' : 'Concluir'}
      </button>
    </div>
  ),
  WizardStepScaffold: ({ header, footer, bottomFixed, children }: any) => (
    <div>{header}{bottomFixed}{children}{footer}</div>
  ),
  InlineDecisionInput: () => <div data-testid="inline-decision-input" />,
  DecisionCard: ({ decision }: any) => <div data-testid="decision-card">{decision.text}</div>,
}));

import { QbrMeetingOpeningStep } from '../QbrMeetingOpeningStep';
import { QbrMeetingOkrReviewStep, type TeamForReview } from '../QbrMeetingOkrReviewStep';
import { QbrMeetingDecisionsStep } from '../QbrMeetingDecisionsStep';
import { QbrMeetingCommitmentsStep } from '../QbrMeetingCommitmentsStep';
import { QbrMeetingClosingStep } from '../QbrMeetingClosingStep';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

// ── factories ──

function createKpiSnapshot(overrides: Partial<MbrKpiSnapshot> = {}): MbrKpiSnapshot {
  return {
    kpiId: `kpi-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Revenue',
    unit: 'R$',
    ragStatus: 'green',
    currentValue: 100,
    previousValue: 90,
    target: 120,
    variationVsLastMonth: 5,
    variationVsTarget: -16,
    requiresStrategicDecision: false,
    ...overrides,
  };
}

function createTeamForReview(overrides: Partial<TeamForReview> = {}): TeamForReview {
  const id = overrides.teamId || `team-${Math.random().toString(36).slice(2, 6)}`;
  return {
    teamId: id,
    teamName: overrides.teamName || 'Time Alpha',
    sessionId: `session-${id}`,
    proposedOkrs: { objective: { title: 'OKR proposto', description: '', org_objective_id: '', cycle_id: '' }, draftKrs: [] },
    hasSubmission: true,
    ...overrides,
  };
}

// ================================================================
// OPENING STEP
// ================================================================

describe('QbrMeetingOpeningStep', () => {
  const defaultProps = {
    cLevelDirectives: [
      { category: 'strategic_question' as const, text: 'Revisar metas Q2' },
      { category: 'challenge' as const, text: 'Concorrência agressiva' },
    ],
    leaderSummaryCount: 5,
    orgKpiSnapshots: [] as MbrKpiSnapshot[],
    onContinue: vi.fn(),
  };

  it('renders header with title', () => {
    render(<QbrMeetingOpeningStep {...defaultProps} />);
    expect(screen.getByText('Abertura do QBR')).toBeInTheDocument();
  });

  it('shows leader summary count badge', () => {
    render(<QbrMeetingOpeningStep {...defaultProps} />);
    expect(screen.getByText('5 times')).toBeInTheDocument();
  });

  it('renders C-Level directives as agenda', () => {
    render(<QbrMeetingOpeningStep {...defaultProps} />);
    expect(screen.getByText('Revisar metas Q2')).toBeInTheDocument();
    expect(screen.getByText('Concorrência agressiva')).toBeInTheDocument();
  });

  it('shows alert KPIs when present', () => {
    const props = {
      ...defaultProps,
      orgKpiSnapshots: [
        createKpiSnapshot({ name: 'Churn', ragStatus: 'red' }),
        createKpiSnapshot({ name: 'NPS', ragStatus: 'yellow' }),
        createKpiSnapshot({ name: 'Revenue', ragStatus: 'green' }),
      ],
    };
    render(<QbrMeetingOpeningStep {...props} />);
    expect(screen.getByText('Churn')).toBeInTheDocument();
    expect(screen.getByText('NPS')).toBeInTheDocument();
    expect(screen.queryByText(/Revenue/)).not.toBeInTheDocument(); // green KPI not in alert
  });

  it('calls onContinue on primary button', () => {
    render(<QbrMeetingOpeningStep {...defaultProps} />);
    fireEvent.click(screen.getByTestId('btn-primary'));
    expect(defaultProps.onContinue).toHaveBeenCalled();
  });
});

// ================================================================
// OKR REVIEW STEP
// ================================================================

describe('QbrMeetingOkrReviewStep', () => {
  const teams: TeamForReview[] = [
    createTeamForReview({ teamId: 't1', teamName: 'Time Alpha' }),
    createTeamForReview({ teamId: 't2', teamName: 'Time Beta' }),
    createTeamForReview({ teamId: 't3', teamName: 'Time Gamma' }),
  ];

  const defaultProps = {
    teamsForReview: teams,
    approvals: [] as any[],
    onApprovalsChange: vi.fn(),
    currentTeamIndex: 0,
    onCurrentTeamIndexChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header with review count', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    expect(screen.getByText('Revisão de OKRs por Time')).toBeInTheDocument();
    expect(screen.getByText('3 pendentes')).toBeInTheDocument();
  });

  it('shows current team name', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    expect(screen.getByText('Time Alpha')).toBeInTheDocument();
  });

  it('disables continue until all reviewed', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables continue when all teams reviewed', () => {
    const props = {
      ...defaultProps,
      approvals: [
        { teamId: 't1', sessionId: 'session-t1', status: 'approved' as const },
        { teamId: 't2', sessionId: 'session-t2', status: 'approved_with_changes' as const },
        { teamId: 't3', sessionId: 'session-t3', status: 'defer' as const },
      ],
    };
    render(<QbrMeetingOkrReviewStep {...props} />);
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
    expect(screen.getByText('✓ Todos revisados')).toBeInTheDocument();
  });

  it('renders 4 approval status buttons', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText('Aprovado c/ ajustes')).toBeInTheDocument();
    expect(screen.getByText('Descartado')).toBeInTheDocument();
    expect(screen.getByText('Diferido')).toBeInTheDocument();
  });

  it('discard button is disabled without justification', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    const discardBtn = screen.getByText('Descartado').closest('button');
    expect(discardBtn).toBeDisabled();
  });

  it('shows proposed OKR title', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    expect(screen.getByText('OKR proposto')).toBeInTheDocument();
  });

  it('navigates between teams', () => {
    render(<QbrMeetingOkrReviewStep {...defaultProps} />);
    fireEvent.click(screen.getByText(/Próximo/));
    expect(defaultProps.onCurrentTeamIndexChange).toHaveBeenCalledWith(1);
  });
});

// ================================================================
// DECISIONS STEP
// ================================================================

describe('QbrMeetingDecisionsStep', () => {
  it('renders header with title', () => {
    render(
      <QbrMeetingDecisionsStep
        decisions={[]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Decisões Estratégicas')).toBeInTheDocument();
  });

  it('gate: disables continue with no decisions', () => {
    render(
      <QbrMeetingDecisionsStep
        decisions={[]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables continue with at least 1 decision', () => {
    const decision = {
      id: 'd1',
      text: 'Expandir time',
      category: 'decision' as const,
      sourceStep: 'qbr-meeting-decisions' as const,
      owner: { id: 'u1', name: 'João' },
    };
    render(
      <QbrMeetingDecisionsStep
        decisions={[decision]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
  });

  it('renders InlineDecisionInput', () => {
    render(
      <QbrMeetingDecisionsStep
        decisions={[]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('inline-decision-input')).toBeInTheDocument();
  });
});

// ================================================================
// COMMITMENTS STEP
// ================================================================

describe('QbrMeetingCommitmentsStep', () => {
  const teams = [
    { id: 't1', name: 'Time Alpha' },
    { id: 't2', name: 'Time Beta' },
  ];

  it('renders header with title', () => {
    render(
      <QbrMeetingCommitmentsStep
        commitments={[]}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Compromissos Cross-Área')).toBeInTheDocument();
  });

  it('shows empty state when no commitments', () => {
    render(
      <QbrMeetingCommitmentsStep
        commitments={[]}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Nenhum compromisso registrado.')).toBeInTheDocument();
  });

  it('renders existing commitments', () => {
    const commitments = [
      { fromTeamId: 't1', toTeamId: 't2', description: 'Entregar API', deadline: '2026-04-30' },
    ];
    render(
      <QbrMeetingCommitmentsStep
        commitments={commitments}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Entregar API')).toBeInTheDocument();
  });
});

// ================================================================
// CLOSING STEP
// ================================================================

describe('QbrMeetingClosingStep', () => {
  const emptyChecklist = {
    allTeamsReviewed: false,
    decisionsHaveOwners: false,
    dependenciesFormalized: false,
    feedbackLinkSent: false,
  };

  const fullChecklist = {
    allTeamsReviewed: true,
    decisionsHaveOwners: true,
    dependenciesFormalized: true,
    feedbackLinkSent: true,
  };

  it('renders header with title', () => {
    render(
      <QbrMeetingClosingStep
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        ritualFeedback={[]}
        onRitualFeedbackChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Encerramento')).toBeInTheDocument();
  });

  it('renders 4 governance checklist items', () => {
    render(
      <QbrMeetingClosingStep
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        ritualFeedback={[]}
        onRitualFeedbackChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Todos os times tiveram OKRs revisados?')).toBeInTheDocument();
    expect(screen.getByText('Toda decisão tem dono e prazo?')).toBeInTheDocument();
    expect(screen.getByText('Dependências cross-área registradas?')).toBeInTheDocument();
    expect(screen.getByText('Link de avaliação enviado para participantes?')).toBeInTheDocument();
  });

  it('disables complete until all checked', () => {
    render(
      <QbrMeetingClosingStep
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        ritualFeedback={[]}
        onRitualFeedbackChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables complete when all checked', () => {
    render(
      <QbrMeetingClosingStep
        checklist={fullChecklist}
        onChecklistChange={vi.fn()}
        ritualFeedback={[]}
        onRitualFeedbackChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
  });

  it('renders star rating for ritual feedback', () => {
    render(
      <QbrMeetingClosingStep
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        ritualFeedback={[]}
        onRitualFeedbackChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Feedback do Rito')).toBeInTheDocument();
  });
});
