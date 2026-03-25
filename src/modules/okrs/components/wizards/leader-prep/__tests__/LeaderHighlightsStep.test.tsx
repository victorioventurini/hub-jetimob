/**
 * @file LeaderHighlightsStep.test.tsx
 * @description Tests for Leader Prep Highlights step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { LeaderHighlightsStep } from '../LeaderHighlightsStep';
import type { LeaderHighlight, VicInsight } from '@/modules/okrs/types/wizard';

vi.mock('../shared/VicInsightCard', () => ({
  VicInsightsList: ({ insights }: any) => (
    <div data-testid="vic-insights">{insights.length} insights</div>
  ),
}));
vi.mock('@/modules/okrs/components/wizards/shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
}));
vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicStepHelper: () => null,
}));
vi.mock('@/lib/colors', () => ({
  HIGHLIGHT_CARD_STYLES: {
    stagnant: { card: '', icon: '' },
    blocked: { card: '', icon: '' },
    initiative_impact: { card: '', icon: '' },
    help_requested: { card: '', icon: '' },
    overdue: { card: '', icon: '' },
  },
  RAG_STATUS_COLORS: {
    red: { badge: '' },
    yellow: { badge: '' },
  },
}));
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const mockHighlight = (overrides: Partial<LeaderHighlight> = {}): LeaderHighlight => ({
  id: 'h1',
  type: 'stagnant',
  title: 'KR travado',
  description: 'Sem progresso há 14 dias',
  priority: 'high',
  ...overrides,
});

describe('LeaderHighlightsStep', () => {
  it('renders header', () => {
    render(<LeaderHighlightsStep highlights={[]} aiInsights={[]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Pontos que merecem conversa')).toBeInTheDocument();
  });

  it('shows empty state when no highlights', () => {
    render(<LeaderHighlightsStep highlights={[]} aiInsights={[]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Tudo em ordem!')).toBeInTheDocument();
  });

  it('renders highlights', () => {
    render(<LeaderHighlightsStep highlights={[mockHighlight()]} aiInsights={[]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('KR travado')).toBeInTheDocument();
    expect(screen.getByText('Sem progresso há 14 dias')).toBeInTheDocument();
  });

  it('sorts by priority (high first)', () => {
    render(
      <LeaderHighlightsStep
        highlights={[
          mockHighlight({ id: '1', title: 'Low priority', priority: 'low' }),
          mockHighlight({ id: '2', title: 'High priority', priority: 'high' }),
        ]}
        aiInsights={[]}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const items = screen.getAllByText(/priority/i);
    expect(items[0].textContent).toBe('High priority');
  });

  it('renders AI insights section', () => {
    const insights: VicInsight[] = [
      { id: 'i1', type: 'insight', content: 'Test insight', priority: 'medium', source: 'analista-kpis', dismissed: false },
    ];
    render(<LeaderHighlightsStep highlights={[]} aiInsights={insights} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Insights do Vic')).toBeInTheDocument();
  });

  it('calls onContinue and onBack', () => {
    const onContinue = vi.fn();
    const onBack = vi.fn();
    render(<LeaderHighlightsStep highlights={[]} aiInsights={[]} onContinue={onContinue} onBack={onBack} />);
    fireEvent.click(screen.getByText('Preparar pauta'));
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
