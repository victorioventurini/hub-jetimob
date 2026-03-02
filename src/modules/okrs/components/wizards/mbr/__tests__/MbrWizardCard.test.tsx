/**
 * @file MbrWizardCard.test.tsx
 * @description Tests for MBR wizard entry card
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MbrWizardCard } from '../MbrWizardCard';

const renderWithRouter = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('MbrWizardCard', () => {
  it('renders card title', () => {
    renderWithRouter(<MbrWizardCard />);
    expect(screen.getByText('Monthly Business Review')).toBeInTheDocument();
  });

  it('renders mensal badge', () => {
    renderWithRouter(<MbrWizardCard />);
    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderWithRouter(<MbrWizardCard />);
    expect(screen.getByText(/rito decisório mensal/i)).toBeInTheDocument();
  });

  it('renders duration estimate', () => {
    renderWithRouter(<MbrWizardCard />);
    expect(screen.getByText('~60 min')).toBeInTheDocument();
  });

  it('shows "Nenhum MBR realizado" when no last date', () => {
    renderWithRouter(<MbrWizardCard />);
    expect(screen.getByText('Nenhum MBR realizado')).toBeInTheDocument();
  });

  it('shows formatted last MBR date', () => {
    renderWithRouter(<MbrWizardCard lastMbrDate="2026-02-15T10:00:00Z" />);
    expect(screen.getByText(/Último:/)).toBeInTheDocument();
  });

  it('renders start button with link to /okrs/mbr', () => {
    renderWithRouter(<MbrWizardCard />);
    const link = screen.getByRole('link', { name: /iniciar mbr/i });
    expect(link).toHaveAttribute('href', '/okrs/mbr');
  });

  it('shows skeleton when loading', () => {
    renderWithRouter(<MbrWizardCard isLoading />);
    // Skeleton component renders with data-slot="skeleton"
    expect(screen.queryByText('Monthly Business Review')).not.toBeInTheDocument();
  });

  it('does not render content when loading', () => {
    renderWithRouter(<MbrWizardCard isLoading />);
    expect(screen.queryByText('Monthly Business Review')).not.toBeInTheDocument();
  });
});
