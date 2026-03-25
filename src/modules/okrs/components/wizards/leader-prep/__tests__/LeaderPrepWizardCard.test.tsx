/**
 * @file LeaderPrepWizardCard.test.tsx
 * @description Tests for Leader Prep entry card
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LeaderPrepWizardCard } from '../LeaderPrepWizardCard';

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

import { vi } from 'vitest';

const renderCard = (props: Partial<Parameters<typeof LeaderPrepWizardCard>[0]> = {}) =>
  render(
    <LeaderPrepWizardCard teamId="team-1" teamName="Engenharia" {...props} />
  );

describe('LeaderPrepWizardCard', () => {
  it('renders title', () => {
    renderCard();
    expect(screen.getByText('Preparar Check-in do Time')).toBeInTheDocument();
  });

  it('renders team name in description', () => {
    renderCard();
    expect(screen.getByText(/Engenharia/)).toBeInTheDocument();
  });

  it('shows alert badge when at risk', () => {
    renderCard({ atRiskCount: 3, pendingCount: 1 });
    expect(screen.getByText('4 alertas')).toBeInTheDocument();
  });

  it('renders link to leader-prep route', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/okrs/leader-prep?team=team-1');
  });

  it('shows loading state', () => {
    renderCard({ isLoading: true });
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('shows Preparar button', () => {
    renderCard();
    expect(screen.getByText('Preparar')).toBeInTheDocument();
  });
});
