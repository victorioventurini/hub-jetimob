/**
 * @file LeaderPrepStep.test.tsx
 * @description Tests for Leader Prep agenda preparation step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeaderPrepStep } from '../LeaderPrepStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { KrAction } from '@/modules/okrs/types/wizard';

vi.mock('@/modules/okrs/components/wizards/shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));
vi.mock('@/modules/okrs/components/OkrProgressBar', () => ({
  OkrProgressBar: () => null,
}));
vi.mock('../shared/LatestCheckinSummary', () => ({
  LatestCheckinSummary: () => null,
}));
vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>,
}));

const mockKr = (overrides: Partial<WizardKr> = {}): WizardKr => ({
  id: 'kr-1',
  title: 'KR Test',
  objective_id: 'obj-1',
  objective_title: 'Objetivo Test',
  baseline: 0,
  current_value: 50,
  target: 100,
  progress: 50,
  unit: '%',
  direction: 'up' as const,
  status: 'yellow' as const,
  is_at_risk: false,
  is_pending: false,
  days_since_checkin: 5,
  last_checkin_at: '2026-01-01',
  owner_name: 'João',
  owner_photo: null,
  team_name: 'Engenharia',
  latest_checkin: null,
} as WizardKr);

describe('LeaderPrepStep', () => {
  const defaultProps = () => ({
    krs: [] as WizardKr[],
    krActions: [] as KrAction[],
    onActionsChange: vi.fn(),
    meetingNotes: '',
    onMeetingNotesChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  });

  it('renders header', () => {
    render(<LeaderPrepStep {...defaultProps()} />);
    expect(screen.getByText('Preparar pauta da reunião')).toBeInTheDocument();
  });

  it('shows empty state when no KRs', () => {
    render(<LeaderPrepStep {...defaultProps()} />);
    expect(screen.getByText('Nenhum KR para preparar')).toBeInTheDocument();
  });

  it('renders KR list', () => {
    render(<LeaderPrepStep {...defaultProps()} krs={[mockKr()]} />);
    expect(screen.getByText('KR Test')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('GATE: disables continue when no actions and KRs exist', () => {
    render(<LeaderPrepStep {...defaultProps()} krs={[mockKr()]} />);
    expect(screen.getByText('Ver alinhamento').closest('button')).toBeDisabled();
  });

  it('enables continue when actions exist', () => {
    const actions: KrAction[] = [{ krId: 'kr-1', actionType: 'discuss_group' }];
    render(<LeaderPrepStep {...defaultProps()} krs={[mockKr()]} krActions={actions} />);
    expect(screen.getByText('Ver alinhamento').closest('button')).not.toBeDisabled();
  });

  it('shows action count badges', () => {
    const actions: KrAction[] = [
      { krId: 'kr-1', actionType: 'discuss_group' },
      { krId: 'kr-2', actionType: 'followup_1on1' },
    ];
    render(<LeaderPrepStep {...defaultProps()} krs={[mockKr(), mockKr({ id: 'kr-2', title: 'KR 2' })]} krActions={actions} />);
    expect(screen.getByText('1 em grupo')).toBeInTheDocument();
    expect(screen.getByText('1 1:1')).toBeInTheDocument();
  });

  it('renders meeting notes textarea', () => {
    render(<LeaderPrepStep {...defaultProps()} />);
    expect(screen.getByText('Notas pré-reunião')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/anotações/i)).toBeInTheDocument();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<LeaderPrepStep {...defaultProps()} onBack={onBack} />);
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
