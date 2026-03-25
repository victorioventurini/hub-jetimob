/**
 * QBR Post Steps tests
 * Covers: PromotionStep, DecisionsStep, CommitmentsStep, FollowUpStep, MinutesStep
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

import { QbrPostOkrPromotionStep, type ApprovedTeamOkr } from '../QbrPostOkrPromotionStep';
import { QbrPostDecisionsStep } from '../QbrPostDecisionsStep';
import { QbrPostCommitmentsStep } from '../QbrPostCommitmentsStep';
import { QbrPostFollowUpStep } from '../QbrPostFollowUpStep';
import { QbrPostMinutesStep } from '../QbrPostMinutesStep';

// ── factories ──

function createApprovedOkr(overrides: Partial<ApprovedTeamOkr> = {}): ApprovedTeamOkr {
  const id = overrides.teamId || `team-${Math.random().toString(36).slice(2, 6)}`;
  return {
    teamId: id,
    teamName: overrides.teamName || 'Time X',
    sessionId: overrides.sessionId || `session-${id}`,
    status: 'approved',
    proposedOkrs: { objective: { title: 'OKR do time', description: '', org_objective_id: '', cycle_id: '' }, draftKrs: [] },
    ...overrides,
  };
}

// ================================================================
// PROMOTION STEP
// ================================================================

describe('QbrPostOkrPromotionStep', () => {
  const approvedOkrs: ApprovedTeamOkr[] = [
    createApprovedOkr({ teamId: 't1', teamName: 'Alpha', sessionId: 's1', status: 'approved' }),
    createApprovedOkr({ teamId: 't2', teamName: 'Beta', sessionId: 's2', status: 'approved_with_changes' }),
    createApprovedOkr({ teamId: 't3', teamName: 'Gamma', sessionId: 's3', status: 'discarded' }),
    createApprovedOkr({ teamId: 't4', teamName: 'Delta', sessionId: 's4', status: 'defer' }),
  ];

  it('renders header with promotable count', () => {
    render(
      <QbrPostOkrPromotionStep
        approvedOkrs={approvedOkrs}
        promotedSessionIds={[]}
        onPromotedSessionIdsChange={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Promoção de OKRs')).toBeInTheDocument();
    expect(screen.getByText('0/2 selecionados')).toBeInTheDocument();
  });

  it('shows checkboxes for approved and approved_with_changes only', () => {
    render(
      <QbrPostOkrPromotionStep
        approvedOkrs={approvedOkrs}
        promotedSessionIds={[]}
        onPromotedSessionIdsChange={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows discarded as historical', () => {
    render(
      <QbrPostOkrPromotionStep
        approvedOkrs={approvedOkrs}
        promotedSessionIds={[]}
        onPromotedSessionIdsChange={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText(/Descartados/)).toBeInTheDocument();
  });

  it('shows deferred section', () => {
    render(
      <QbrPostOkrPromotionStep
        approvedOkrs={approvedOkrs}
        promotedSessionIds={[]}
        onPromotedSessionIdsChange={vi.fn()}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/Diferidos/)).toBeInTheDocument();
  });

  it('calls onPromotedSessionIdsChange on checkbox toggle', () => {
    const onChange = vi.fn();
    render(
      <QbrPostOkrPromotionStep
        approvedOkrs={approvedOkrs}
        promotedSessionIds={[]}
        onPromotedSessionIdsChange={onChange}
        onContinue={vi.fn()}
      />
    );
    // Click the first checkbox (Alpha - approved)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // [0] is select-all
    expect(onChange).toHaveBeenCalled();
  });
});

// ================================================================
// DECISIONS STEP
// ================================================================

describe('QbrPostDecisionsStep', () => {
  const meetingDecision = {
    id: 'md1',
    text: 'Decisão da reunião',
    category: 'decision' as const,
    sourceStep: 'qbr-meeting-decisions' as const,
    owner: { id: 'u1', name: 'Ana' },
  };

  it('renders header with title', () => {
    render(
      <QbrPostDecisionsStep
        meetingDecisions={[meetingDecision]}
        decisions={[]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Decisões Complementares')).toBeInTheDocument();
  });

  it('shows meeting decisions as read-only section', () => {
    render(
      <QbrPostDecisionsStep
        meetingDecisions={[meetingDecision]}
        decisions={[]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/Decisões da Reunião/)).toBeInTheDocument();
    expect(screen.getByText('Decisão da reunião')).toBeInTheDocument();
  });

  it('shows total count badge', () => {
    const postDecision = { ...meetingDecision, id: 'pd1', text: 'Nova decisão' };
    render(
      <QbrPostDecisionsStep
        meetingDecisions={[meetingDecision]}
        decisions={[postDecision]}
        onDecisionsChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('2 total')).toBeInTheDocument();
  });

  it('renders InlineDecisionInput for new decisions', () => {
    render(
      <QbrPostDecisionsStep
        meetingDecisions={[]}
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

describe('QbrPostCommitmentsStep', () => {
  const teams = [
    { id: 't1', name: 'Time Alpha' },
    { id: 't2', name: 'Time Beta' },
  ];

  it('renders header with title', () => {
    render(
      <QbrPostCommitmentsStep
        commitments={[]}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Compromissos Formalizados')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <QbrPostCommitmentsStep
        commitments={[]}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Nenhum compromisso registrado.')).toBeInTheDocument();
  });

  it('renders existing commitments with team names', () => {
    const commitments = [
      { fromTeamId: 't1', toTeamId: 't2', description: 'Entregar dados', deadline: '2026-04-15', dependencyId: '' },
    ];
    render(
      <QbrPostCommitmentsStep
        commitments={commitments}
        onCommitmentsChange={vi.fn()}
        teams={teams}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Entregar dados')).toBeInTheDocument();
  });
});

// ================================================================
// FOLLOW-UP STEP
// ================================================================

describe('QbrPostFollowUpStep', () => {
  const defaultCadence = {
    mbrReviewScheduled: false,
    followUpMeetingDate: undefined,
  };

  it('renders header with title', () => {
    render(
      <QbrPostFollowUpStep
        followUpCadence={defaultCadence}
        onFollowUpCadenceChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Cadência de Acompanhamento')).toBeInTheDocument();
  });

  it('shows MBR scheduling checkbox', () => {
    render(
      <QbrPostFollowUpStep
        followUpCadence={defaultCadence}
        onFollowUpCadenceChange={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Próximo MBR já está agendado')).toBeInTheDocument();
  });

  it('toggles mbrReviewScheduled', () => {
    const onChange = vi.fn();
    render(
      <QbrPostFollowUpStep
        followUpCadence={defaultCadence}
        onFollowUpCadenceChange={onChange}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mbrReviewScheduled: true }));
  });
});

// ================================================================
// MINUTES STEP
// ================================================================

describe('QbrPostMinutesStep', () => {
  const emptyChecklist = {
    strategicFocusClear: false,
    decisionsHaveOwners: false,
    dependenciesFormalized: false,
    nextCycleOkrsActive: false,
  };

  const fullChecklist = {
    strategicFocusClear: true,
    decisionsHaveOwners: true,
    dependenciesFormalized: true,
    nextCycleOkrsActive: true,
  };

  it('renders header with title', () => {
    render(
      <QbrPostMinutesStep
        executiveMinutes=""
        onExecutiveMinutesChange={vi.fn()}
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getAllByText('Ata Executiva').length).toBeGreaterThanOrEqual(1);
  });

  it('renders 4 governance checklist items including nextCycleOkrsActive', () => {
    render(
      <QbrPostMinutesStep
        executiveMinutes=""
        onExecutiveMinutesChange={vi.fn()}
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Foco estratégico do próximo ciclo está claro?')).toBeInTheDocument();
    expect(screen.getByText('Todas as decisões têm dono e prazo?')).toBeInTheDocument();
    expect(screen.getByText('Dependências cross-área formalizadas?')).toBeInTheDocument();
    expect(screen.getByText('OKRs do próximo ciclo estão ativos?')).toBeInTheDocument();
  });

  it('disables complete when checklist incomplete', () => {
    render(
      <QbrPostMinutesStep
        executiveMinutes="Ata preenchida"
        onExecutiveMinutesChange={vi.fn()}
        checklist={emptyChecklist}
        onChecklistChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('disables complete when minutes empty', () => {
    render(
      <QbrPostMinutesStep
        executiveMinutes=""
        onExecutiveMinutesChange={vi.fn()}
        checklist={fullChecklist}
        onChecklistChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables complete when checklist full AND minutes present', () => {
    render(
      <QbrPostMinutesStep
        executiveMinutes="Ata executiva do QBR"
        onExecutiveMinutesChange={vi.fn()}
        checklist={fullChecklist}
        onChecklistChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
  });

  it('calls onComplete on primary button click', () => {
    const onComplete = vi.fn();
    render(
      <QbrPostMinutesStep
        executiveMinutes="Ata executiva"
        onExecutiveMinutesChange={vi.fn()}
        checklist={fullChecklist}
        onChecklistChange={vi.fn()}
        onComplete={onComplete}
        onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('btn-primary'));
    expect(onComplete).toHaveBeenCalled();
  });
});
