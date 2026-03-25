/**
 * @file ManagersAdjustmentsStep.test.tsx
 * @description Tests for Managers Adjustments step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ManagersAdjustmentsStep } from '../ManagersAdjustmentsStep';

vi.mock('@/components/ui/textarea-auto-submit', () => ({
  TextareaAutoSubmit: (props: any) => (
    <textarea
      data-testid="textarea"
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) props.onSubmit?.();
      }}
    />
  ),
}));

describe('ManagersAdjustmentsStep', () => {
  it('renders header', () => {
    render(
      <ManagersAdjustmentsStep
        adjustments={[]}
        onAdjustmentsChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Ajustes de Foco')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <ManagersAdjustmentsStep
        adjustments={[]}
        onAdjustmentsChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Nenhum ajuste registrado ainda')).toBeInTheDocument();
  });

  it('renders existing adjustments', () => {
    render(
      <ManagersAdjustmentsStep
        adjustments={['Priorizar entrega X']}
        onAdjustmentsChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Priorizar entrega X')).toBeInTheDocument();
  });

  it('adds new adjustment', () => {
    const onChange = vi.fn();
    render(
      <ManagersAdjustmentsStep
        adjustments={[]}
        onAdjustmentsChange={onChange}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'Novo ajuste' } });
    // Submit via Enter
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders suggestions section', () => {
    render(
      <ManagersAdjustmentsStep
        adjustments={[]}
        onAdjustmentsChange={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText('Sugestões de ajustes')).toBeInTheDocument();
  });

  it('calls onComplete and onBack', () => {
    const onComplete = vi.fn();
    const onBack = vi.fn();
    render(
      <ManagersAdjustmentsStep
        adjustments={[]}
        onAdjustmentsChange={vi.fn()}
        onComplete={onComplete}
        onBack={onBack}
      />
    );
    fireEvent.click(screen.getByText('Concluir Check-in'));
    expect(onComplete).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
