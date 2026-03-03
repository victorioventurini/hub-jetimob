import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MbrTeamOkrsDetailStep, MbrTeamOkrsDetailStepProps } from '../MbrTeamOkrsDetailStep';
import type { MbrTeamOkrSnapshot } from '@/modules/okrs/types/wizard';

// ── Mocks ────────────────────────────────────────────────────
vi.mock('@/modules/okrs/components/OkrProgressBar', () => ({
  OkrProgressBar: () => <div data-testid="okr-progress-bar" />,
}));
vi.mock('@/modules/okrs/components/OkrStatusBadge', () => ({
  OkrStatusBadge: ({ status }: { status: string }) => <span data-testid="okr-status-badge">{status}</span>,
}));
vi.mock('../../shared/LastCheckinBadge', () => ({
  LastCheckinBadge: () => <span data-testid="last-checkin-badge" />,
}));

// ── Fixtures ─────────────────────────────────────────────────
function makeTeam(overrides: Partial<MbrTeamOkrSnapshot> & { teamId?: string; teamName?: string } = {}): MbrTeamOkrSnapshot {
  return {
    teamId: 'team-1',
    teamName: 'Comercial',
    healthScore: 75,
    healthStatus: 'healthy',
    reviewed: false,
    objectives: [
      {
        objectiveId: 'obj-1',
        title: 'Crescer receita',
        progress: 50,
        status: 'green',
        krCount: 1,
        krsAtRisk: 0,
        krsStagnant: 0,
        trend: 'stable' as const,
        keyResults: [
          {
            krId: 'kr-1',
            title: 'MRR 100k',
            progress: 50,
            baseline: 0,
            current: 50,
            target: 100,
            direction: 'up' as const,
            status: 'green',
            unit: 'R$',
            ownerName: 'Alice',
            lastCheckinAt: '',
          },
        ],
      },
    ],
    ...overrides,
  };
}

const team1 = makeTeam();
const team2 = makeTeam({ teamId: 'team-2', teamName: 'Produto', reviewed: true });
const emptyTeam = makeTeam({ teamId: 'team-3', teamName: 'Sem OKRs', objectives: [] });

function renderStep(overrides: Partial<MbrTeamOkrsDetailStepProps> = {}) {
  const props: MbrTeamOkrsDetailStepProps = {
    teamOkrSnapshots: [team1, team2, emptyTeam],
    onTeamOkrSnapshotsChange: vi.fn(),
    currentTeamIndex: 0,
    onCurrentTeamIndexChange: vi.fn(),
    decisions: [],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<MbrTeamOkrsDetailStep {...props} />);
  return props;
}

// ── Tests ────────────────────────────────────────────────────
describe('MbrTeamOkrsDetailStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders current team info (1 of N)', () => {
    renderStep({ currentTeamIndex: 0 });
    expect(screen.getByText(/Time 1 de 2/)).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
  });

  it('skips teams without OKRs in navigation count', () => {
    renderStep({ currentTeamIndex: 0 });
    // 3 snapshots but only 2 have OKRs
    expect(screen.getByText(/Time 1 de 2/)).toBeInTheDocument();
  });

  it('shows "Próximo time" on non-last team', () => {
    renderStep({ currentTeamIndex: 0 });
    expect(screen.getByText('Próximo time')).toBeInTheDocument();
  });

  it('shows "Prosseguir para OKRs Org" on last team', () => {
    renderStep({ currentTeamIndex: 1 });
    expect(screen.getByText('Prosseguir para OKRs Org')).toBeInTheDocument();
  });

  it('calls onCurrentTeamIndexChange(1) when clicking "Próximo time"', async () => {
    const user = userEvent.setup();
    const props = renderStep({ currentTeamIndex: 0 });
    await user.click(screen.getByText('Próximo time'));
    expect(props.onCurrentTeamIndexChange).toHaveBeenCalledWith(1);
  });

  it('calls onBack() when clicking "Voltar" on first team', async () => {
    const user = userEvent.setup();
    const props = renderStep({ currentTeamIndex: 0 });
    await user.click(screen.getByText('Voltar'));
    expect(props.onBack).toHaveBeenCalled();
    expect(props.onCurrentTeamIndexChange).not.toHaveBeenCalled();
  });

  it('calls onCurrentTeamIndexChange(0) when clicking "Time anterior" on second team', async () => {
    const user = userEvent.setup();
    const props = renderStep({ currentTeamIndex: 1 });
    await user.click(screen.getByText('Time anterior'));
    expect(props.onCurrentTeamIndexChange).toHaveBeenCalledWith(0);
  });

  it('disables primary on last team when not all reviewed', () => {
    renderStep({ currentTeamIndex: 1 });
    const btn = screen.getByText('Prosseguir para OKRs Org').closest('button');
    // team1 is not reviewed
    expect(btn).toBeDisabled();
  });

  it('enables primary on last team when all reviewed', () => {
    const allReviewed = [
      makeTeam({ reviewed: true }),
      makeTeam({ teamId: 'team-2', teamName: 'Produto', reviewed: true }),
    ];
    renderStep({ teamOkrSnapshots: allReviewed, currentTeamIndex: 1 });
    const btn = screen.getByText('Prosseguir para OKRs Org').closest('button');
    expect(btn).not.toBeDisabled();
  });

  it('calls onContinue on last team when all reviewed and next clicked', async () => {
    const user = userEvent.setup();
    const allReviewed = [
      makeTeam({ reviewed: true }),
      makeTeam({ teamId: 'team-2', teamName: 'Produto', reviewed: true }),
    ];
    const props = renderStep({ teamOkrSnapshots: allReviewed, currentTeamIndex: 1 });
    await user.click(screen.getByText('Prosseguir para OKRs Org'));
    expect(props.onContinue).toHaveBeenCalled();
  });

  it('renders empty state when no teams have OKRs', () => {
    renderStep({ teamOkrSnapshots: [emptyTeam] });
    expect(screen.getByText('Nenhum time com OKRs para revisar.')).toBeInTheDocument();
  });

  it('toggles reviewed checkbox', async () => {
    const user = userEvent.setup();
    const props = renderStep({ currentTeamIndex: 0 });
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(props.onTeamOkrSnapshotsChange).toHaveBeenCalled();
  });
});
