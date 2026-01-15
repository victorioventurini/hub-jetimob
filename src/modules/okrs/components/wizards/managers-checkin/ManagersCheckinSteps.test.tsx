/**
 * Managers Checkin Steps Tests
 * Tests for ManagersPanoramaStep, ManagersCrossIssuesStep, ManagersAdjustmentsStep
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagersPanoramaStep } from './ManagersPanoramaStep';
import { ManagersCrossIssuesStep } from './ManagersCrossIssuesStep';
import { ManagersAdjustmentsStep } from './ManagersAdjustmentsStep';
import type { AreaOkrSummary, CrossDependency } from '@/modules/okrs/types/wizard';

// Mock dependencies
vi.mock('../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => <span data-testid="tooltip" />,
}));

vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => <div data-testid="ask-to-vic" />,
}));

vi.mock('../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => (
    <div data-testid="wizard-step-header">{title}</div>
  ),
  WizardStepFooter: ({ onBack, onPrimary, primaryLabel }: { onBack?: () => void; onPrimary: () => void; primaryLabel: string }) => (
    <div data-testid="wizard-step-footer">
      {onBack && <button onClick={onBack}>Voltar</button>}
      <button onClick={onPrimary}>{primaryLabel}</button>
    </div>
  ),
  WizardLastStepFooter: ({ onBack, onPrimary }: { onBack: () => void; onPrimary: () => void }) => (
    <div data-testid="wizard-last-step-footer">
      <button onClick={onBack}>Voltar</button>
      <button onClick={onPrimary}>Concluir Check-in</button>
    </div>
  ),
}));

// ============================================================
// MOCK DATA
// ============================================================

const mockAreas: AreaOkrSummary[] = [
  {
    teamId: 'team-1',
    areaName: 'Comercial',
    okrCount: 5,
    avgProgress: 75,
    atRiskCount: 1,
    trend: 'improving',
  },
  {
    teamId: 'team-2',
    areaName: 'Produto',
    okrCount: 3,
    avgProgress: 45,
    atRiskCount: 2,
    trend: 'declining',
  },
  {
    teamId: 'team-3',
    areaName: 'Marketing',
    okrCount: 4,
    avgProgress: 60,
    atRiskCount: 0,
    trend: 'stable',
  },
];

const mockDependencies: CrossDependency[] = [
  {
    id: 'dep-1',
    description: 'API de integração',
    fromTeam: 'Produto',
    toTeam: 'Tecnologia',
    status: 'blocked',
    impact: 'Alto impacto em entregas',
  },
  {
    id: 'dep-2',
    description: 'Material de campanha',
    fromTeam: 'Marketing',
    toTeam: 'Design',
    status: 'at_risk',
    impact: 'Atraso potencial',
  },
  {
    id: 'dep-3',
    description: 'Dados de vendas',
    fromTeam: 'Comercial',
    toTeam: 'BI',
    status: 'healthy',
    impact: null,
  },
];

// ============================================================
// ManagersPanoramaStep Tests
// ============================================================

describe('ManagersPanoramaStep', () => {
  const defaultProps = {
    areas: mockAreas,
    companyProgress: 60,
    isLoading: false,
    onContinue: vi.fn(),
  };

  it('renders panorama header', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('Panorama Geral')).toBeInTheDocument();
  });

  it('displays company progress', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('empresa')).toBeInTheDocument();
  });

  it('shows area count', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('3 áreas em análise')).toBeInTheDocument();
  });

  it('calculates average progress', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    // Average of 75, 45, 60 = 60%
    expect(screen.getByText('Progresso médio')).toBeInTheDocument();
  });

  it('shows total at risk count', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    // Total at risk: 1 + 2 + 0 = 3
    expect(screen.getByText('3 em risco')).toBeInTheDocument();
  });

  it('renders all area cards', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('shows OKR count per area', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('5 OKRs')).toBeInTheDocument();
    expect(screen.getByText('3 OKRs')).toBeInTheDocument();
    expect(screen.getByText('4 OKRs')).toBeInTheDocument();
  });

  it('displays trend icons', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    // Should have trend icons (TrendingUp, TrendingDown, Minus)
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('shows at risk per area', () => {
    render(<ManagersPanoramaStep {...defaultProps} />);
    expect(screen.getByText('1 em risco')).toBeInTheDocument();
    expect(screen.getByText('2 em risco')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ManagersPanoramaStep {...defaultProps} isLoading={true} />);
    expect(screen.queryByText('Panorama Geral')).not.toBeInTheDocument();
  });

  it('handles empty areas', () => {
    render(<ManagersPanoramaStep {...defaultProps} areas={[]} />);
    expect(screen.getByText('Nenhuma área encontrada')).toBeInTheDocument();
  });

  it('calls onContinue', () => {
    const onContinue = vi.fn();
    render(<ManagersPanoramaStep {...defaultProps} onContinue={onContinue} />);
    
    fireEvent.click(screen.getByText('Ver pontos de atenção'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('highlights areas with at-risk items', () => {
    const { container } = render(<ManagersPanoramaStep {...defaultProps} />);
    // Areas with atRiskCount > 0 should have special border
    const cards = container.querySelectorAll('[class*="border-orange"]');
    expect(cards.length).toBe(2); // Comercial (1) and Produto (2)
  });
});

// ============================================================
// ManagersCrossIssuesStep Tests
// ============================================================

describe('ManagersCrossIssuesStep', () => {
  const defaultProps = {
    dependencies: mockDependencies,
    onContinue: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders cross issues header', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    expect(screen.getByText(/Pontos de Atenção|Dependências/i)).toBeInTheDocument();
  });

  it('prioritizes blocked dependencies', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    const cards = screen.getAllByText(/API|Material|Dados/);
    // Blocked should be first
    expect(cards[0]).toHaveTextContent('API');
  });

  it('shows status badges', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Em risco')).toBeInTheDocument();
    expect(screen.getByText('Saudável')).toBeInTheDocument();
  });

  it('displays team associations', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    expect(screen.getByText(/Produto/)).toBeInTheDocument();
    expect(screen.getByText(/Tecnologia/)).toBeInTheDocument();
  });

  it('shows impact information', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    expect(screen.getByText('Alto impacto em entregas')).toBeInTheDocument();
    expect(screen.getByText('Atraso potencial')).toBeInTheDocument();
  });

  it('handles empty dependencies', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} dependencies={[]} />);
    expect(screen.getByText(/Nenhuma dependência|Sem pontos/i)).toBeInTheDocument();
  });

  it('calls onContinue', () => {
    const onContinue = vi.fn();
    render(<ManagersCrossIssuesStep {...defaultProps} onContinue={onContinue} />);
    
    fireEvent.click(screen.getByText('Definir ajustes'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<ManagersCrossIssuesStep {...defaultProps} onBack={onBack} />);
    
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows summary of blocked and at-risk', () => {
    render(<ManagersCrossIssuesStep {...defaultProps} />);
    // Should show count of blocked (1) and at_risk (1)
    expect(screen.getByText(/1.*bloqueada/i)).toBeInTheDocument();
  });
});

// ============================================================
// ManagersAdjustmentsStep Tests
// ============================================================

describe('ManagersAdjustmentsStep', () => {
  const defaultProps = {
    adjustments: ['Ajuste 1', 'Ajuste 2'],
    onChange: vi.fn(),
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders adjustments header', () => {
    render(<ManagersAdjustmentsStep {...defaultProps} />);
    expect(screen.getByText(/Ajustes|Decisões/i)).toBeInTheDocument();
  });

  it('displays existing adjustments', () => {
    render(<ManagersAdjustmentsStep {...defaultProps} />);
    expect(screen.getByText('Ajuste 1')).toBeInTheDocument();
    expect(screen.getByText('Ajuste 2')).toBeInTheDocument();
  });

  it('allows adding new adjustment', () => {
    const onChange = vi.fn();
    render(<ManagersAdjustmentsStep {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText(/ajuste|decisão/i);
    fireEvent.change(input, { target: { value: 'Novo ajuste' } });
    
    const addButton = screen.getByRole('button', { name: /adicionar/i });
    fireEvent.click(addButton);
    
    expect(onChange).toHaveBeenCalled();
  });

  it('allows removing adjustment', () => {
    const onChange = vi.fn();
    render(<ManagersAdjustmentsStep {...defaultProps} onChange={onChange} />);
    
    const removeButtons = screen.getAllByRole('button', { name: /remover|×|x/i });
    fireEvent.click(removeButtons[0]);
    
    expect(onChange).toHaveBeenCalled();
  });

  it('handles empty adjustments', () => {
    render(<ManagersAdjustmentsStep {...defaultProps} adjustments={[]} />);
    expect(screen.getByPlaceholderText(/ajuste|decisão/i)).toBeInTheDocument();
  });

  it('shows suggestions', () => {
    render(<ManagersAdjustmentsStep {...defaultProps} />);
    expect(screen.getByText(/Sugestões/i)).toBeInTheDocument();
  });

  it('calls onComplete', () => {
    const onComplete = vi.fn();
    render(<ManagersAdjustmentsStep {...defaultProps} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByText('Concluir Check-in'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<ManagersAdjustmentsStep {...defaultProps} onBack={onBack} />);
    
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalled();
  });

  it('validates input before adding', () => {
    const onChange = vi.fn();
    render(<ManagersAdjustmentsStep {...defaultProps} onChange={onChange} />);
    
    // Try to add empty adjustment
    const addButton = screen.getByRole('button', { name: /adicionar/i });
    fireEvent.click(addButton);
    
    // Should not call onChange with empty value
    expect(onChange).not.toHaveBeenCalled();
  });
});
