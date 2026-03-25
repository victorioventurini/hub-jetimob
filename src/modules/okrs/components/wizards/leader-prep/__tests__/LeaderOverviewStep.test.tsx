/**
 * @file LeaderOverviewStep.test.tsx
 * @description Tests for Leader Prep Overview step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { LeaderOverviewStep } from '../LeaderOverviewStep';
import type { LeaderOverviewMetrics } from '@/modules/okrs/types/wizard';

vi.mock('../shared/LastCheckinBadge', () => ({
  LastCheckinBadge: () => null,
}));
vi.mock('@/modules/okrs/components/wizards/shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));
vi.mock('@/lib/colors', () => ({
  METRIC_CARD_STYLES: {
    success: { card: '', iconBg: '', icon: '' },
    warning: { card: '', iconBg: '', icon: '' },
    danger: { card: '', iconBg: '', icon: '' },
    neutral: { iconBg: '', icon: '' },
    purple: { card: '', iconBg: '', icon: '' },
  },
  getHealthScoreColor: () => ({ text: '', progress: '' }),
}));
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const mockMetrics: LeaderOverviewMetrics = {
  totalKrs: 10,
  krsUpdatedOnTime: 6,
  krsUpdatedLate: 2,
  krsNoUpdate: 2,
  krsAtRisk: 3,
  krsStagnant: 1,
  initiativesCritical: 1,
  collaboratorsNeedingHelp: 2,
};

describe('LeaderOverviewStep', () => {
  it('renders team name', () => {
    render(<LeaderOverviewStep metrics={mockMetrics} teamName="Engenharia" onContinue={vi.fn()} />);
    expect(screen.getByText(/Engenharia/)).toBeInTheDocument();
  });

  it('renders cycle name when provided', () => {
    render(<LeaderOverviewStep metrics={mockMetrics} teamName="Engenharia" cycleName="Q1 2026" onContinue={vi.fn()} />);
    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
  });

  it('shows total KRs count', () => {
    render(<LeaderOverviewStep metrics={mockMetrics} teamName="Engenharia" onContinue={vi.fn()} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('KRs no ciclo')).toBeInTheDocument();
  });

  it('renders metric cards with values', () => {
    render(<LeaderOverviewStep metrics={mockMetrics} teamName="Engenharia" onContinue={vi.fn()} />);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('No prazo')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Em risco')).toBeInTheDocument();
  });

  it('shows empty state when no KRs', () => {
    render(<LeaderOverviewStep metrics={null} teamName="Engenharia" onContinue={vi.fn()} />);
    expect(screen.getByText('Nenhum KR encontrado')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<LeaderOverviewStep metrics={null} teamName="Engenharia" isLoading onContinue={vi.fn()} />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('calls onContinue when button clicked', () => {
    const onContinue = vi.fn();
    render(<LeaderOverviewStep metrics={mockMetrics} teamName="Engenharia" onContinue={onContinue} />);
    fireEvent.click(screen.getByText('Ver destaques'));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
