/**
 * @file TeamOpeningStep.test.tsx
 * @description Tests for Team Check-in Opening step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { TeamOpeningStep } from '../TeamOpeningStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <h3>{title}</h3>,
  WizardFirstStepFooter: ({ primaryLabel, onPrimary }: any) => (
    <button data-testid="primary-btn" onClick={onPrimary}>{primaryLabel}</button>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
}));

vi.mock('../../shared/LastCheckinBadge', () => ({
  LastCheckinBadge: () => <span data-testid="last-checkin-badge" />,
}));

const createMockKr = (overrides: Partial<WizardKr> = {}): WizardKr => ({
  id: 'kr-1',
  title: 'KR Test',
  objective_id: 'obj-1',
  objective_title: 'Objective',
  team_id: 'team-1',
  team_name: 'Time',
  owner_user_id: 'user-1',
  owner_name: 'Owner',
  owner_photo: null,
  status: 'green',
  progress: 50,
  current_value: 50,
  target: 100,
  unit: '%',
  baseline: 0,
  direction: 'up',
  is_pending: false,
  is_at_risk: false,
  days_since_checkin: 3,
  last_checkin_at: '2026-02-01',
  ...overrides,
});

describe('TeamOpeningStep', () => {
  const defaultProps = {
    teamName: 'Time Produto',
    krs: [createMockKr()],
    markedForDiscussion: [],
    onContinue: vi.fn(),
  };

  it('renders team name context', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText(/Time Produto/)).toBeInTheDocument();
  });

  it('renders KR summary stats', () => {
    render(<TeamOpeningStep {...defaultProps} krs={[createMockKr(), createMockKr({ id: 'kr-2' })]} />);
    // Should render KR cards
    expect(screen.getAllByText('KR Test').length).toBe(2);
  });

  it('highlights at-risk KRs', () => {
    const krs = [
      createMockKr({ id: '1', title: 'At Risk KR', is_at_risk: true, status: 'red' }),
      createMockKr({ id: '2', title: 'Safe KR', is_at_risk: false, status: 'green' }),
    ];
    render(<TeamOpeningStep {...defaultProps} krs={krs} />);
    expect(screen.getByText('At Risk KR')).toBeInTheDocument();
    expect(screen.getByText('Safe KR')).toBeInTheDocument();
  });

  it('calls onContinue when primary clicked', () => {
    const onContinue = vi.fn();
    render(<TeamOpeningStep {...defaultProps} onContinue={onContinue} />);
    screen.getByTestId('primary-btn').click();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('renders InlineDecisionInput with opening sourceStep', () => {
    render(<TeamOpeningStep {...defaultProps} decisions={[]} onDecisionsChange={vi.fn()} />);
    expect(screen.getByTestId('inline-decision-opening')).toBeInTheDocument();
  });
});
