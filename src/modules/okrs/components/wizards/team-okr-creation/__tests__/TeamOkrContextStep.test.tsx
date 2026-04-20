/**
 * @file TeamOkrContextStep tests
 * @description Cobre o bug do "passo 2 travado em geração" — garante que:
 *  - Não invoca IA quando aiInsight já existe (evita re-render loop)
 *  - Tenta gerar apenas UMA vez por mount (mesmo com re-renders do pai)
 *  - Não trava UI quando IA falha
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { WizardAiInsight } from '@/modules/okrs/hooks';

// ---------- Mocks ----------
const invokeVicMock = vi.fn();
vi.mock('@/modules/okrs/hooks', () => ({
  useWizardAI: () => ({ invokeVic: invokeVicMock }),
}));

vi.mock('@/modules/vic', () => ({
  VicGeneratingCard: () => <div data-testid="vic-generating">Gerando...</div>,
  VicTypewriterText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock('../../shared/VicInsightCard', () => ({
  VicInsightCard: (props: any) => (
    <div data-testid="vic-insight">
      {props.content ?? props.insight?.content ?? ''}
    </div>
  ),
}));

vi.mock('../../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
  WizardTooltip: () => null,
}));

vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicInline: () => null,
  AskToVicStepHelper: () => null,
}));

vi.mock('../../shared', () => ({
  WizardStepFooter: () => <div data-testid="footer" />,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { TeamOkrContextStep } from '../TeamOkrContextStep';

const wrap = (ui: React.ReactElement) => (
  <TooltipProvider>{ui}</TooltipProvider>
);

const baseProps = {
  teamName: 'Marketing',
  orgObjectives: [
    { id: '1', title: 'Crescer 30%', progress: 50, status: 'green' as const, keyResultsCount: 3 },
  ],
  strategicKpis: [
    { id: 'k1', name: 'MRR', currentValue: 100, targetValue: 200, unit: 'R$', trend: 'up' as const },
  ],
  impactReflection: '',
  aiInsight: null,
  onImpactReflectionChange: vi.fn(),
  onAiInsightChange: vi.fn(),
  onContinue: vi.fn(),
  onBack: vi.fn(),
};

describe('TeamOkrContextStep', () => {
  beforeEach(() => {
    invokeVicMock.mockReset();
  });

  it('NÃO invoca IA quando aiInsight já está persistido', async () => {
    const persisted: WizardAiInsight = {
      id: 'context-insight',
      type: 'insight',
      content: 'Insight previamente salvo',
      priority: 'medium',
      source: 'alinhamento-estrategico',
    };
    render(wrap(<TeamOkrContextStep {...baseProps} aiInsight={persisted} />));

    expect(invokeVicMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('vic-insight')).toHaveTextContent('Insight previamente salvo');
  });

  it('invoca IA UMA única vez por mount mesmo com re-render do pai', async () => {
    invokeVicMock.mockResolvedValue({ response: 'Insight gerado' });

    const { rerender } = render(
      wrap(<TeamOkrContextStep {...baseProps} onAiInsightChange={vi.fn()} />)
    );
    rerender(wrap(<TeamOkrContextStep {...baseProps} onAiInsightChange={vi.fn()} />));
    rerender(wrap(<TeamOkrContextStep {...baseProps} onAiInsightChange={vi.fn()} />));

    await waitFor(() => {
      expect(invokeVicMock).toHaveBeenCalledTimes(1);
    });
  });

  it('NÃO invoca IA quando não há orgObjectives', () => {
    render(wrap(<TeamOkrContextStep {...baseProps} orgObjectives={[]} />));
    expect(invokeVicMock).not.toHaveBeenCalled();
  });

  it('persiste insight via onAiInsightChange após geração bem-sucedida', async () => {
    invokeVicMock.mockResolvedValue({ response: 'Foco em receita recorrente' });
    const onAiInsightChange = vi.fn();

    render(wrap(<TeamOkrContextStep {...baseProps} onAiInsightChange={onAiInsightChange} />));

    await waitFor(() => {
      expect(onAiInsightChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'context-insight',
          content: 'Foco em receita recorrente',
          source: 'alinhamento-estrategico',
        })
      );
    });
  });

  it('para de "gerar" mesmo quando IA falha (sem travar UI)', async () => {
    invokeVicMock.mockRejectedValue(new Error('AI down'));

    render(wrap(<TeamOkrContextStep {...baseProps} />));

    await waitFor(() => {
      expect(screen.queryByTestId('vic-generating')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
