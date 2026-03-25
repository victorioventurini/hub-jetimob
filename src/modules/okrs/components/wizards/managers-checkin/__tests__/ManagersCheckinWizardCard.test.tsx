/**
 * @file ManagersCheckinWizardCard.test.tsx
 * @description Tests for Managers Check-in entry card
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BrowserRouter } from 'react-router-dom';
import { ManagersCheckinWizardCard } from '../ManagersCheckinWizardCard';

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const renderCard = (props: Partial<Parameters<typeof ManagersCheckinWizardCard>[0]> = {}) =>
  render(
    <BrowserRouter>
      <ManagersCheckinWizardCard {...props} />
    </BrowserRouter>
  );

describe('ManagersCheckinWizardCard', () => {
  it('renders title', () => {
    renderCard();
    expect(screen.getByText('Check-in de Gestores')).toBeInTheDocument();
  });

  it('shows area count in description', () => {
    renderCard({ areaCount: 5 });
    expect(screen.getByText(/5 áreas/)).toBeInTheDocument();
  });

  it('shows blocked items count', () => {
    renderCard({ blockedItemsCount: 2 });
    expect(screen.getByText('2 bloqueios')).toBeInTheDocument();
  });

  it('shows dependencies count', () => {
    renderCard({ crossDependenciesCount: 3 });
    expect(screen.getByText('3 dependências')).toBeInTheDocument();
  });

  it('shows attention badge when issues', () => {
    renderCard({ blockedItemsCount: 1 });
    expect(screen.getByText('Requer atenção')).toBeInTheDocument();
  });

  it('renders link to route', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/okrs/managers-checkin');
  });

  it('shows loading skeleton', () => {
    renderCard({ isLoading: true });
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });
});
