/**
 * @file ManagersCrossIssuesStep.test.tsx
 * @description Tests for Managers Cross Issues step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagersCrossIssuesStep } from '../ManagersCrossIssuesStep';
import type { CrossDependency } from '@/modules/okrs/types/wizard';

vi.mock('@/modules/okrs/components/wizards/shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));

const mockDep = (overrides: Partial<CrossDependency> = {}): CrossDependency => ({
  id: 'dep-1',
  description: 'API de Pagamentos bloqueada',
  status: 'blocked' as const,
  fromTeam: { id: 't1', name: 'Backend' },
  toTeam: { id: 't2', name: 'Frontend' },
  ...overrides,
});

describe('ManagersCrossIssuesStep', () => {
  it('renders header', () => {
    render(<ManagersCrossIssuesStep dependencies={[]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Dependências entre Áreas')).toBeInTheDocument();
  });

  it('shows empty state when no dependencies', () => {
    render(<ManagersCrossIssuesStep dependencies={[]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Sem dependências críticas')).toBeInTheDocument();
  });

  it('renders dependency cards', () => {
    render(<ManagersCrossIssuesStep dependencies={[mockDep()]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('API de Pagamentos bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('shows blocked badge count', () => {
    render(<ManagersCrossIssuesStep dependencies={[mockDep()]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('1 bloqueada')).toBeInTheDocument();
  });

  it('sorts blocked first', () => {
    render(
      <ManagersCrossIssuesStep
        dependencies={[
          mockDep({ id: '1', description: 'Healthy dep', status: 'healthy' }),
          mockDep({ id: '2', description: 'Blocked dep', status: 'blocked' }),
        ]}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const cards = screen.getAllByText(/dep$/);
    expect(cards[0].textContent).toBe('Blocked dep');
  });

  it('calls navigation callbacks', () => {
    const onContinue = vi.fn();
    const onBack = vi.fn();
    render(<ManagersCrossIssuesStep dependencies={[]} onContinue={onContinue} onBack={onBack} />);
    fireEvent.click(screen.getByText('Definir ajustes'));
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
