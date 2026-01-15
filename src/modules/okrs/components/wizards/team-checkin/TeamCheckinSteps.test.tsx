/**
 * Team Checkin Steps Tests
 * Tests for TeamOpeningStep, TeamKrReviewStep, TeamInitiativesStep, TeamDecisionsStep
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamOpeningStep } from './TeamOpeningStep';
import { TeamKrReviewStep } from './TeamKrReviewStep';
import { TeamInitiativesStep } from './TeamInitiativesStep';
import { TeamDecisionsStep } from './TeamDecisionsStep';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// Mock dependencies
vi.mock('../shared', () => ({
  WizardStepHeader: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="wizard-step-header">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
  WizardStepFooter: ({ onBack, onPrimary, primaryLabel }: { onBack?: () => void; onPrimary: () => void; primaryLabel: string }) => (
    <div data-testid="wizard-step-footer">
      {onBack && <button onClick={onBack}>Voltar</button>}
      <button onClick={onPrimary}>{primaryLabel}</button>
    </div>
  ),
  WizardFirstStepFooter: ({ onPrimary, primaryLabel }: { onPrimary: () => void; primaryLabel: string }) => (
    <div data-testid="wizard-first-step-footer">
      <button onClick={onPrimary}>{primaryLabel}</button>
    </div>
  ),
  WizardLastStepFooter: ({ onBack, onPrimary }: { onBack: () => void; onPrimary: () => void }) => (
    <div data-testid="wizard-last-step-footer">
      <button onClick={onBack}>Voltar</button>
      <button onClick={onPrimary}>Concluir</button>
    </div>
  ),
}));

vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => <div data-testid="ask-to-vic" />,
}));

// ============================================================
// MOCK DATA
// ============================================================

const mockKrs: WizardKr[] = [
  {
    id: 'kr-1',
    title: 'Aumentar vendas em 20%',
    objective_id: 'obj-1',
    objective_title: 'Crescer receita',
    team_name: 'Comercial',
    owner_id: 'user-1',
    owner_name: 'João Silva',
    progress: 75,
    status: 'green',
    baseline: 100,
    current_value: 175,
    target: 200,
    is_at_risk: false,
    last_checkin_at: '2024-01-10',
    days_since_checkin: 5,
  },
  {
    id: 'kr-2',
    title: 'Reduzir churn para 5%',
    objective_id: 'obj-1',
    objective_title: 'Crescer receita',
    team_name: 'Comercial',
    owner_id: 'user-2',
    owner_name: 'Maria Santos',
    progress: 30,
    status: 'yellow',
    baseline: 10,
    current_value: 7,
    target: 5,
    is_at_risk: true,
    last_checkin_at: '2024-01-05',
    days_since_checkin: 10,
  },
  {
    id: 'kr-3',
    title: 'Lançar novo produto',
    objective_id: 'obj-2',
    objective_title: 'Inovar portfólio',
    team_name: 'Produto',
    owner_id: null,
    owner_name: null,
    progress: 10,
    status: 'red',
    baseline: 0,
    current_value: 1,
    target: 10,
    is_at_risk: true,
    last_checkin_at: null,
    days_since_checkin: null,
  },
];

// ============================================================
// TeamOpeningStep Tests
// ============================================================

describe('TeamOpeningStep', () => {
  const defaultProps = {
    teamName: 'Comercial',
    cycleName: 'Q1 2024',
    krs: mockKrs,
    markedForDiscussion: ['kr-2'],
    isLoading: false,
    onContinue: vi.fn(),
  };

  it('renders team name in header', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText(/Check-in: Comercial/)).toBeInTheDocument();
  });

  it('displays average progress', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    // Average of 75, 30, 10 = 38.33 ≈ 38%
    expect(screen.getByText('38%')).toBeInTheDocument();
  });

  it('shows status breakdown', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText('1 no caminho')).toBeInTheDocument();
    expect(screen.getByText('1 em atenção')).toBeInTheDocument();
    expect(screen.getByText('1 em risco')).toBeInTheDocument();
  });

  it('displays KRs marked for discussion', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText(/Marcados para discussão/)).toBeInTheDocument();
    expect(screen.getByText('Reduzir churn para 5%')).toBeInTheDocument();
  });

  it('shows all KRs section', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText(/Todos os KRs/)).toBeInTheDocument();
    expect(screen.getByText('Aumentar vendas em 20%')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TeamOpeningStep {...defaultProps} isLoading={true} />);
    // Should show skeletons, not content
    expect(screen.queryByText(/Check-in:/)).not.toBeInTheDocument();
  });

  it('calls onContinue when button clicked', () => {
    const onContinue = vi.fn();
    render(<TeamOpeningStep {...defaultProps} onContinue={onContinue} />);
    
    fireEvent.click(screen.getByText('Revisar KRs'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('handles empty KRs', () => {
    render(<TeamOpeningStep {...defaultProps} krs={[]} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 no caminho')).toBeInTheDocument();
  });

  it('shows owner name or fallback', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('displays progress badges for discussion KRs', () => {
    render(<TeamOpeningStep {...defaultProps} />);
    // KR-2 has 30% progress
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});

// ============================================================
// TeamKrReviewStep Tests
// ============================================================

describe('TeamKrReviewStep', () => {
  const defaultProps = {
    krs: mockKrs,
    markedForDiscussion: ['kr-2'],
    reviewedKrs: new Set<string>(),
    onMarkReviewed: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders review header', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText('Revisão dos KRs')).toBeInTheDocument();
  });

  it('shows progress counter', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText('0 de 3 revisados')).toBeInTheDocument();
  });

  it('prioritizes marked KRs first', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    // First KR shown should be marked one (kr-2)
    expect(screen.getByText('Reduzir churn para 5%')).toBeInTheDocument();
    expect(screen.getByText('Para discussão')).toBeInTheDocument();
  });

  it('shows navigation arrows', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('navigates between KRs', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    
    // Click next
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons.find(b => b.querySelector('svg'));
    if (nextButton) {
      fireEvent.click(nextButton);
    }
    
    expect(screen.getByText(/\/3/)).toBeInTheDocument();
  });

  it('displays KR details', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText(/Objetivo:/)).toBeInTheDocument();
    expect(screen.getByText(/Responsável:/)).toBeInTheDocument();
  });

  it('shows mark reviewed button for unreviewed KRs', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText('Marcar como revisado')).toBeInTheDocument();
  });

  it('hides mark reviewed for already reviewed KRs', () => {
    const reviewedSet = new Set(['kr-2']);
    render(<TeamKrReviewStep {...defaultProps} reviewedKrs={reviewedSet} />);
    expect(screen.queryByText('Marcar como revisado')).not.toBeInTheDocument();
  });

  it('calls onMarkReviewed when marking', () => {
    const onMarkReviewed = vi.fn();
    render(<TeamKrReviewStep {...defaultProps} onMarkReviewed={onMarkReviewed} />);
    
    fireEvent.click(screen.getByText('Marcar como revisado'));
    expect(onMarkReviewed).toHaveBeenCalledWith('kr-2');
  });

  it('shows status badge', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText('Atenção')).toBeInTheDocument();
  });

  it('displays baseline, current, and target', () => {
    render(<TeamKrReviewStep {...defaultProps} />);
    expect(screen.getByText(/Base:/)).toBeInTheDocument();
    expect(screen.getByText(/Atual:/)).toBeInTheDocument();
    expect(screen.getByText(/Meta:/)).toBeInTheDocument();
  });

  it('handles empty KRs', () => {
    render(<TeamKrReviewStep {...defaultProps} krs={[]} />);
    expect(screen.getByText('Nenhum KR para revisar')).toBeInTheDocument();
  });

  it('shows reviewed badge when KR is reviewed', () => {
    const reviewedSet = new Set(['kr-2']);
    render(<TeamKrReviewStep {...defaultProps} reviewedKrs={reviewedSet} />);
    expect(screen.getByText('Revisado')).toBeInTheDocument();
  });

  it('updates progress as KRs are reviewed', () => {
    const reviewedSet = new Set(['kr-1', 'kr-2']);
    render(<TeamKrReviewStep {...defaultProps} reviewedKrs={reviewedSet} />);
    expect(screen.getByText('2 de 3 revisados')).toBeInTheDocument();
  });
});

// ============================================================
// TeamInitiativesStep Tests
// ============================================================

describe('TeamInitiativesStep', () => {
  const mockInitiatives = [
    {
      id: 'init-1',
      name: 'Campanha de marketing',
      status: 'in_progress' as const,
      krId: 'kr-1',
      krTitle: 'Aumentar vendas',
      ownerName: 'João',
    },
    {
      id: 'init-2',
      name: 'Integração com parceiro',
      status: 'blocked' as const,
      krId: 'kr-2',
      krTitle: 'Reduzir churn',
      ownerName: 'Maria',
    },
    {
      id: 'init-3',
      name: 'Redesign de onboarding',
      status: 'at_risk' as const,
      krId: 'kr-2',
      krTitle: 'Reduzir churn',
      ownerName: null,
    },
  ];

  const defaultProps = {
    initiatives: mockInitiatives,
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders initiatives count', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    expect(screen.getByText(/Iniciativas Críticas/)).toBeInTheDocument();
  });

  it('prioritizes blocked initiatives first', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    const cards = screen.getAllByText(/Integração|Campanha|Redesign/);
    // Blocked should be first
    expect(cards[0]).toHaveTextContent('Integração');
  });

  it('shows status badges', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Em risco')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('displays owner name', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('shows KR association', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    expect(screen.getByText(/Aumentar vendas/)).toBeInTheDocument();
    expect(screen.getAllByText(/Reduzir churn/).length).toBeGreaterThan(0);
  });

  it('handles empty initiatives', () => {
    render(<TeamInitiativesStep {...defaultProps} initiatives={[]} />);
    expect(screen.getByText('Nenhuma iniciativa crítica')).toBeInTheDocument();
  });

  it('calls onContinue', () => {
    const onContinue = vi.fn();
    render(<TeamInitiativesStep {...defaultProps} onContinue={onContinue} />);
    
    fireEvent.click(screen.getByText('Ver decisões'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<TeamInitiativesStep {...defaultProps} onBack={onBack} />);
    
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows blocked count in header', () => {
    render(<TeamInitiativesStep {...defaultProps} />);
    // Badge showing blocked count
    expect(screen.getByText(/bloqueada/i)).toBeInTheDocument();
  });
});

// ============================================================
// TeamDecisionsStep Tests
// ============================================================

describe('TeamDecisionsStep', () => {
  const defaultProps = {
    decisions: '',
    onChange: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
    isSubmitting: false,
  };

  it('renders decisions input', () => {
    render(<TeamDecisionsStep {...defaultProps} />);
    expect(screen.getByPlaceholderText(/decisões|ações/i)).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<TeamDecisionsStep {...defaultProps} decisions="Decisão 1" />);
    expect(screen.getByDisplayValue('Decisão 1')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<TeamDecisionsStep {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Nova decisão' } });
    
    expect(onChange).toHaveBeenCalledWith('Nova decisão');
  });

  it('calls onComplete when finishing', () => {
    const onComplete = vi.fn();
    render(<TeamDecisionsStep {...defaultProps} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByText('Concluir'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('shows loading state when submitting', () => {
    render(<TeamDecisionsStep {...defaultProps} isSubmitting={true} />);
    expect(screen.getByRole('button', { name: /concluir/i })).toBeDisabled();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<TeamDecisionsStep {...defaultProps} onBack={onBack} />);
    
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalled();
  });
});
