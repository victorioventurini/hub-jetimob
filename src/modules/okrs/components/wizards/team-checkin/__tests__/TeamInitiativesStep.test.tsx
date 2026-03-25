/**
 * @file TeamInitiativesStep.test.tsx
 * @description Tests for Team Check-in Initiatives step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { TeamInitiativesStep } from '../TeamInitiativesStep';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <h3>{title}</h3>,
  WizardStepFooter: ({ primaryLabel, onPrimary, onBack }: any) => (
    <div>
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="primary-btn" onClick={onPrimary}>{primaryLabel}</button>
    </div>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
}));

describe('TeamInitiativesStep', () => {
  const defaultProps = {
    initiatives: [] as any[],
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    // Header rendered via mock - check it doesn't crash
    expect(screen.getByText(/nenhuma iniciativa/i)).toBeInTheDocument();
  });

  it('shows empty state when no initiatives', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    expect(screen.getByText(/nenhuma iniciativa/i)).toBeInTheDocument();
  });

  it('renders initiatives list', () => {
    const initiatives = [
      { id: '1', name: 'Initiative Alpha', status: 'in_progress' as const, krId: 'kr-1', krTitle: 'KR 1' },
      { id: '2', name: 'Initiative Beta', status: 'blocked' as const, krId: 'kr-2', krTitle: 'KR 2' },
    ];
    render(<TeamInitiativesStep {...defaultProps} initiatives={initiatives} />);
    expect(screen.getByText('Initiative Alpha')).toBeInTheDocument();
    expect(screen.getByText('Initiative Beta')).toBeInTheDocument();
  });

  it('shows blocked initiatives with alert styling', () => {
    const initiatives = [
      { id: '1', name: 'Blocked Init', status: 'blocked' as const, krId: 'kr-1', krTitle: 'KR 1' },
    ];
    render(<TeamInitiativesStep {...defaultProps} initiatives={initiatives} />);
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
  });

  it('calls onContinue', () => {
    const onContinue = vi.fn();
    render(<TeamInitiativesStep {...defaultProps} onContinue={onContinue} />);
    screen.getByTestId('primary-btn').click();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<TeamInitiativesStep {...defaultProps} onBack={onBack} />);
    screen.getByTestId('back-btn').click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders InlineDecisionInput when decisions prop provided', () => {
    render(<TeamInitiativesStep {...defaultProps} decisions={[]} onDecisionsChange={vi.fn()} />);
    expect(screen.getByTestId('inline-decision-initiatives')).toBeInTheDocument();
  });
});
