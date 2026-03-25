/**
 * @file LeaderAlignmentStep.test.tsx
 * @description Tests for Leader Prep Alignment step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { LeaderAlignmentStep } from '../LeaderAlignmentStep';
import type { ParentObjective } from '../LeaderAlignmentStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

vi.mock('../shared/ReflectionQuestions', () => ({
  MicrocopyQuestion: ({ question }: any) => <p>{question}</p>,
}));
vi.mock('@/lib/colors', () => ({
  RAG_STATUS_COLORS: {
    green: { dot: '', badge: '' },
    yellow: { dot: '', badge: '' },
    red: { dot: '', badge: '' },
    not_started: { dot: '', badge: '' },
  },
}));

const mockKr = (progress: number): WizardKr => ({
  id: `kr-${progress}`,
  title: 'KR',
  objective_id: 'obj-1',
  objective_title: 'Obj',
  baseline: 0,
  current_value: progress,
  target: 100,
  progress,
  unit: '%',
  direction: 'up',
  status: 'green',
  is_at_risk: false,
  is_pending: false,
  days_since_checkin: 1,
  last_checkin_at: null,
  owner_name: null,
  owner_photo: null,
  team_name: 'Test',
  latest_checkin: null,
} as WizardKr);

const mockParent = (overrides: Partial<ParentObjective> = {}): ParentObjective => ({
  id: 'p1',
  title: 'OKR da Área',
  progress: 60,
  status: 'yellow',
  teamName: 'Área X',
  ...overrides,
});

describe('LeaderAlignmentStep', () => {
  it('renders header', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[]}
        parentObjectives={[]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Alinhamento com a Área')).toBeInTheDocument();
  });

  it('shows team summary with KR count', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[mockKr(50), mockKr(70)]}
        parentObjectives={[]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Engenharia')).toBeInTheDocument();
    expect(screen.getByText('2 KRs no ciclo')).toBeInTheDocument();
  });

  it('renders parent objectives', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[mockKr(50)]}
        parentObjectives={[mockParent()]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('OKR da Área')).toBeInTheDocument();
    expect(screen.getByText('Área X')).toBeInTheDocument();
  });

  it('shows no-parent message when empty', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[]}
        parentObjectives={[]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/Nenhum OKR de área/)).toBeInTheDocument();
  });

  it('shows alignment status', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[mockKr(60)]}
        parentObjectives={[mockParent({ progress: 60 })]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Time alinhado com a área')).toBeInTheDocument();
  });

  it('shows team behind status', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[mockKr(30)]}
        parentObjectives={[mockParent({ progress: 60 })]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Time atrás da área')).toBeInTheDocument();
  });

  it('renders reflection question', () => {
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[mockKr(50)]}
        parentObjectives={[mockParent()]}
        onStartCheckin={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/claramente contribuindo/)).toBeInTheDocument();
  });

  it('calls navigation callbacks', () => {
    const onStart = vi.fn();
    const onBack = vi.fn();
    render(
      <LeaderAlignmentStep
        teamName="Engenharia"
        teamKrs={[]}
        parentObjectives={[]}
        onStartCheckin={onStart}
        onBack={onBack}
      />
    );
    fireEvent.click(screen.getByText(/Iniciar Check-in/));
    expect(onStart).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
