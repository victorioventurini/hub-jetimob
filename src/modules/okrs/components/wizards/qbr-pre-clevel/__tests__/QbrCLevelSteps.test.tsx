/**
 * QBR Pre C-Level Steps tests
 * Validates all 4 steps: SystemRead, Strategic, OkrValidation, Directives
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QbrCLevelSystemReadStep, type LeaderPreSubmission } from '../QbrCLevelSystemReadStep';
import { QbrCLevelStrategicStep, type QbrCLevelStrategicStepProps } from '../QbrCLevelStrategicStep';
import { QbrCLevelOkrValidationStep, type QbrCLevelOkrValidationStepProps, type TeamOkrProposal } from '../QbrCLevelOkrValidationStep';
import { QbrCLevelDirectivesStep, type QbrCLevelDirectivesStepProps } from '../QbrCLevelDirectivesStep';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, badge }: { title: string; badge?: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3>{badge && <span>{badge}</span>}</div>
  ),
  WizardFirstStepFooter: ({ onPrimary }: any) => (
    <button data-testid="btn-primary" onClick={onPrimary}>Continuar</button>
  ),
  WizardStepFooter: ({ onPrimary, onBack, primaryDisabled }: any) => (
    <div>
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryDisabled}>Continuar</button>
    </div>
  ),
  WizardStepScaffold: ({ header, footer, bottomFixed, children }: any) => (
    <div>{header}{bottomFixed}{children}{footer}</div>
  ),
  InlineDecisionInput: () => <div data-testid="inline-decision-input" />,
}));

// ============================================================
// FACTORIES
// ============================================================

function createSubmission(overrides: Partial<LeaderPreSubmission> = {}): LeaderPreSubmission {
  return {
    teamId: `team-${Math.random().toString(36).slice(2, 6)}`,
    teamName: 'Time Teste',
    snapshot: {
      krFinalStates: [
        { krId: 'kr-1', krTitle: 'KR 1', state: 'achieved', finalProgress: 100, paceStatus: 'on_pace' },
        { krId: 'kr-2', krTitle: 'KR 2', state: 'at_risk', finalProgress: 40, paceStatus: 'behind_pace' },
      ],
      kpiSnapshots: [],
      zombieCandidates: ['zombie-1'],
      kpisToCreate: [{ description: 'Novo KPI', suggestedScope: 'team', relatedKrTitle: '' }],
      learnings: { whatWorked: 'Rotinas', whatDidntWork: 'Deploys', debts: 'Testes' },
      proposedOkrs: { objective: { title: '', description: '', org_objective_id: null, cycle_id: null }, krPlan: { foundational: 1, contribution: 0, enabler: 0 }, draftKrs: [] },
    },
    ...overrides,
  };
}

function createKpi(overrides: Partial<MbrKpiSnapshot> = {}): MbrKpiSnapshot {
  return {
    kpiId: `kpi-${Math.random().toString(36).slice(2, 6)}`,
    name: 'KPI Org',
    currentValue: 80,
    previousValue: 75,
    target: 90,
    unit: '%',
    ragStatus: 'green',
    trend: 'improving',
    ...overrides,
  };
}

function createTeamProposal(overrides: Partial<TeamOkrProposal> = {}): TeamOkrProposal {
  return {
    teamId: `team-${Math.random().toString(36).slice(2, 6)}`,
    teamName: 'Time Alpha',
    hasSubmission: true,
    proposedOkrs: {
      objective: { title: 'Objetivo proposto', description: 'Desc', org_objective_id: null, cycle_id: null },
      draftKrs: [{ id: 'kr-d1', type: 'foundational', title: 'KR Draft', unit: '%', baseline: 0, target: 100, direction: 'up', owner_user_id: null, linked_org_kr_id: null }],
    },
    ...overrides,
  };
}

// ============================================================
// SYSTEM READ STEP
// ============================================================

describe('QbrCLevelSystemReadStep', () => {
  it('renders header with title', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[]}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Leitura do Sistema')).toBeInTheDocument();
  });

  it('shows submission count in badge', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[createSubmission(), createSubmission()]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[]}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('2 submissions')).toBeInTheDocument();
  });

  it('shows warning for teams without submission', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[{ teamId: 't1', teamName: 'Time Vendas' }]}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/Time Vendas/)).toBeInTheDocument();
  });

  it('aggregates KR states across submissions', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[createSubmission()]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[]}
        onContinue={vi.fn()}
      />
    );
    // 1 achieved from factory
    expect(screen.getByText('Alcançados')).toBeInTheDocument();
  });

  it('shows zombie and KPI-to-create counts', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[createSubmission()]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[]}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText(/zombie sinalizados/)).toBeInTheDocument();
    expect(screen.getByText(/sugeridos para criação/)).toBeInTheDocument();
  });

  it('shows consolidated learnings', () => {
    render(
      <QbrCLevelSystemReadStep
        leaderSubmissions={[createSubmission()]}
        orgKpiSnapshots={[]}
        teamsWithoutSubmission={[]}
        onContinue={vi.fn()}
      />
    );
    expect(screen.getByText('Aprendizados Consolidados')).toBeInTheDocument();
    expect(screen.getByText(/Rotinas/)).toBeInTheDocument();
  });
});

// ============================================================
// STRATEGIC STEP
// ============================================================

describe('QbrCLevelStrategicStep', () => {
  function renderStrategic(overrides: Partial<QbrCLevelStrategicStepProps> = {}) {
    const props: QbrCLevelStrategicStepProps = {
      strategicAnalysis: { alignmentAssessment: '', signalsTeamsMissed: '', whatNotToDo: '' },
      onStrategicAnalysisChange: vi.fn(),
      decisions: [],
      onDecisionsChange: vi.fn(),
      onContinue: vi.fn(),
      onBack: vi.fn(),
      ...overrides,
    };
    return render(<QbrCLevelStrategicStep {...props} />);
  }

  it('renders header with title', () => {
    renderStrategic();
    expect(screen.getByText('Análise Estratégica')).toBeInTheDocument();
  });

  it('renders three strategic textareas', () => {
    renderStrategic();
    expect(screen.getByText('Alinhamento com a Estratégia')).toBeInTheDocument();
    expect(screen.getByText('Sinais que os Times Não Viram')).toBeInTheDocument();
    expect(screen.getByText(/O que NÃO Fazer/)).toBeInTheDocument();
  });

  it('disables continue when all fields empty', () => {
    renderStrategic();
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables continue when any field filled', () => {
    renderStrategic({
      strategicAnalysis: { alignmentAssessment: 'Alinhado', signalsTeamsMissed: '', whatNotToDo: '' },
    });
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
  });
});

// ============================================================
// OKR VALIDATION STEP
// ============================================================

describe('QbrCLevelOkrValidationStep', () => {
  function renderValidation(overrides: Partial<QbrCLevelOkrValidationStepProps> = {}) {
    const props: QbrCLevelOkrValidationStepProps = {
      teamProposals: [createTeamProposal()],
      calibrationFlags: [],
      onCalibrationFlagsChange: vi.fn(),
      onContinue: vi.fn(),
      onBack: vi.fn(),
      ...overrides,
    };
    return render(<QbrCLevelOkrValidationStep {...props} />);
  }

  it('renders header with title', () => {
    renderValidation();
    expect(screen.getByText('Validação de OKRs')).toBeInTheDocument();
  });

  it('shows proposed objective title', () => {
    renderValidation();
    expect(screen.getByText('Objetivo proposto')).toBeInTheDocument();
    expect(screen.getByText('Objetivo proposto', { exact: false })).toBeInTheDocument();
  });

  it('shows empty state when no proposals', () => {
    renderValidation({ teamProposals: [] });
    expect(screen.getByText('Nenhum time submeteu propostas de OKRs.')).toBeInTheDocument();
  });

  it('shows team navigation with prev/next', () => {
    renderValidation({
      teamProposals: [
        createTeamProposal({ teamName: 'Alpha' }),
        createTeamProposal({ teamName: 'Beta' }),
      ],
    });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Próximo')).toBeInTheDocument();
  });

  it('shows calibration flags badge count', () => {
    renderValidation({
      calibrationFlags: [
        { teamId: 'team-1', flag: 'gap', note: 'Falta foco' },
        { teamId: 'team-2', flag: 'overlap', note: 'Duplicado' },
      ],
    });
    expect(screen.getByText('2 flags')).toBeInTheDocument();
  });
});

// ============================================================
// DIRECTIVES STEP
// ============================================================

describe('QbrCLevelDirectivesStep', () => {
  function renderDirectives(overrides: Partial<QbrCLevelDirectivesStepProps> = {}) {
    const props: QbrCLevelDirectivesStepProps = {
      directives: [],
      onDirectivesChange: vi.fn(),
      decisions: [],
      onDecisionsChange: vi.fn(),
      onContinue: vi.fn(),
      onBack: vi.fn(),
      ...overrides,
    };
    return render(<QbrCLevelDirectivesStep {...props} />);
  }

  it('renders header with title', () => {
    renderDirectives();
    expect(screen.getByText('Direcionamentos e Decisões')).toBeInTheDocument();
  });

  it('shows empty state when no directives', () => {
    renderDirectives();
    expect(screen.getByText(/Nenhum direcionamento adicionado/)).toBeInTheDocument();
  });

  it('renders existing directives with category labels', () => {
    renderDirectives({
      directives: [
        { text: 'Focar em retenção', category: 'strategic_question' },
        { text: 'Não investir em X', category: 'non_priority' },
      ],
    });
    expect(screen.getByText('Focar em retenção')).toBeInTheDocument();
    expect(screen.getByText('Pergunta estratégica')).toBeInTheDocument();
    expect(screen.getByText('Não-prioridade')).toBeInTheDocument();
  });

  it('shows item count badge', () => {
    renderDirectives({
      directives: [
        { text: 'Item 1', category: 'hypothesis' },
        { text: 'Item 2', category: 'challenge' },
      ],
    });
    expect(screen.getByText('2 itens')).toBeInTheDocument();
  });
});
