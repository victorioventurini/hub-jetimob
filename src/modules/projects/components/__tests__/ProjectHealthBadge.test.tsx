import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ProjectHealthBadge } from '../ProjectHealthBadge';

describe('ProjectHealthBadge', () => {
  it('renders "No prazo" for on_track', () => {
    renderWithProviders(<ProjectHealthBadge health="on_track" />);
    expect(screen.getByText('No prazo')).toBeInTheDocument();
  });

  it('renders "Em risco" for at_risk', () => {
    renderWithProviders(<ProjectHealthBadge health="at_risk" />);
    expect(screen.getByText('Em risco')).toBeInTheDocument();
  });

  it('renders "Atrasado" for late', () => {
    renderWithProviders(<ProjectHealthBadge health="late" />);
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <ProjectHealthBadge health="on_track" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
