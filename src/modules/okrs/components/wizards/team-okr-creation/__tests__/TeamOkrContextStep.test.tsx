/**
 * @file TeamOkrContextStep tests
 * @description Cobre o bug do "passo 2 travado em geração" — garante que:
 *  - Não trava quando aiInsight já existe (não invoca IA novamente)
 *  - Tenta gerar apenas UMA vez por mount (evita loop por re-render do pai)
 *  - Reset de loading não trava se onAiInsightChange muda referência
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { WizardAiInsight } from '@/modules/okrs/hooks';

// ---------- Mocks ----------
const invokeVicMock = vi.fn();
vi.mock('@/modules/okrs/hooks', () => ({
  useWizardAI: () => ({ invokeVic: invokeVicMock }),
}));

vi.mock('@/modules/vic', () => ({
  VicGeneratingCard: () => <div data-testid="vic-generating">Gerando...</div>,
}));

vi.mock('../shared/VicInsightCard', () => ({
  VicInsightCard: ({ content }: { content: string }) => (
    <div data-testid="vic-insight">{content}</div>
  ),
}));

vi.mock('../shared/WizardTooltips', () => ({
  WizardTooltipInline: () => null,
  WizardTooltip: () => null,
}));

vi.mock('@/modules/vic/components/AskToVic', () => ({
  AskToVicInline: () => null,
  AskToVicStepHelper: () => null,
}));

vi.mock('../shared', () => ({
  WizardStepFooter: () => <div data-testid="footer" />,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { TeamOkrContextStep } from '../TeamOkrContextStep';

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
    render(<TeamOkrContextStep {...baseProps} aiInsight={persisted} />);

    expect(invokeVicMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('vic-insight')).toHaveTextContent('Insight previamente salvo');
  });

  it('invoca IA UMA única vez por mount mesmo com re-render do pai', async () => {
    invokeVicMock.mockResolvedValue({ response: 'Insight gerado' });
    const onAiInsightChange = vi.fn();

    const { rerender } = render(
      <TeamOkrContextStep {...baseProps} onAiInsightChange={onAiInsightChange} />
    );

    // Re-render com nova referência de função (simula re-render do pai)
    rerender(
      <TeamOkrContextStep {...baseProps} onAiInsightChange={vi.fn()} />
    );
    rerender(
      <TeamOkrContextStep {...baseProps} onAiInsightChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(invokeVicMock).toHaveBeenCalledTimes(1);
    });
  });

  it('NÃO invoca IA quando não há orgObjectives', () => {
    render(<TeamOkrContextStep {...baseProps} orgObjectives={[]} />);
    expect(invokeVicMock).not.toHaveBeenCalled();
  });

  it('persiste insight via onAiInsightChange após geração bem-sucedida', async () => {
    invokeVicMock.mockResolvedValue({ response: 'Foco em receita recorrente' });
    const onAiInsightChange = vi.fn();

    render(<TeamOkrContextStep {...baseProps} onAiInsightChange={onAiInsightChange} />);

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

    render(<TeamOkrContextStep {...baseProps} />);

    await waitFor(() => {
      // VicGeneratingCard não deve persistir indefinidamente
      expect(screen.queryByTestId('vic-generating')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
