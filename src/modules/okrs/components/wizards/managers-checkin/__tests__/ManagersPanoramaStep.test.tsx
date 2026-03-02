/**
 * @file ManagersPanoramaStep.test.tsx
 * @description Tests for Managers Check-in Panorama step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagersPanoramaStep } from '../ManagersPanoramaStep';
import type { AreaOkrSummary } from '@/modules/okrs/types/wizard';

vi.mock('../shared/LastCheckinBadge', () => ({
  LastCheckinBadge: () => null,
}));
vi.mock('../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));
vi.mock('@/lib/colors', () => ({
  getProgressBarStyle: () => '',
  TREND_COLORS: { improving: '', declining: '', stable: '' },
}));
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const mockArea = (overrides: Partial<AreaOkrSummary> = {}): AreaOkrSummary => ({
  teamId: 'team-1',
  areaName: 'Vendas',
  okrCount: 3,
  avgProgress: 65,
  atRiskCount: 1,
  trend: 'improving' as const,
  ...overrides,
});

describe('ManagersPanoramaStep', () => {
  it('renders header', () => {
    render(<ManagersPanoramaStep areas={[]} companyProgress={45} onContinue={vi.fn()} />);
    expect(screen.getByText('Panorama Geral')).toBeInTheDocument();
  });

  it('shows company progress', () => {
    render(<ManagersPanoramaStep areas={[]} companyProgress={45} onContinue={vi.fn()} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('empresa')).toBeInTheDocument();
  });

  it('renders area cards', () => {
    render(<ManagersPanoramaStep areas={[mockArea()]} companyProgress={45} onContinue={vi.fn()} />);
    expect(screen.getByText('Vendas')).toBeInTheDocument();
    expect(screen.getByText('3 OKRs')).toBeInTheDocument();
  });

  it('shows at-risk badge when issues exist', () => {
    render(<ManagersPanoramaStep areas={[mockArea({ atRiskCount: 2 })]} companyProgress={45} onContinue={vi.fn()} />);
    expect(screen.getByText('2 em risco')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ManagersPanoramaStep areas={[]} companyProgress={0} onContinue={vi.fn()} />);
    expect(screen.getByText('Nenhuma área encontrada')).toBeInTheDocument();
  });

  it('calls onContinue', () => {
    const onContinue = vi.fn();
    render(<ManagersPanoramaStep areas={[]} companyProgress={0} onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Ver pontos de atenção'));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
