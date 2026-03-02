/**
 * @file InlineDecisionInput.test.tsx
 * @description Tests for shared InlineDecisionInput component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineDecisionInput } from '../InlineDecisionInput';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

vi.mock('@/components/ui/textarea-auto-submit', () => ({
  TextareaAutoSubmit: (props: any) => (
    <textarea
      data-testid="textarea-auto-submit"
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) props.onSubmit?.();
      }}
    />
  ),
}));

const defaultProps = () => ({
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  sourceStep: 'opening' as const,
});

describe('InlineDecisionInput', () => {
  it('renders trigger button', () => {
    render(<InlineDecisionInput {...defaultProps()} />);
    expect(screen.getByText(/registrar nota/i)).toBeInTheDocument();
  });

  it('renders category badges', () => {
    render(<InlineDecisionInput {...defaultProps()} />);
    expect(screen.getByText('Decisão')).toBeInTheDocument();
    expect(screen.getByText('Ajuste de Foco')).toBeInTheDocument();
    expect(screen.getByText('Próximo Passo')).toBeInTheDocument();
  });

  it('renders textarea with custom placeholder', () => {
    render(<InlineDecisionInput {...defaultProps()} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('shows count badge when decisions exist for this step', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'D1', category: 'decision', sourceStep: 'opening' },
      { id: '2', text: 'D2', category: 'next_step', sourceStep: 'opening' },
      { id: '3', text: 'D3', category: 'decision', sourceStep: 'kr-review' },
    ];
    render(<InlineDecisionInput {...props} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters and displays only decisions for current sourceStep', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'Mine', category: 'decision', sourceStep: 'opening' },
      { id: '2', text: 'Not mine', category: 'decision', sourceStep: 'kr-review' },
    ];
    render(<InlineDecisionInput {...props} />);
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.queryByText('Not mine')).not.toBeInTheDocument();
  });

  it('adds decision when add button clicked', () => {
    const props = defaultProps();
    render(<InlineDecisionInput {...props} />);
    
    const textarea = screen.getByTestId('textarea-auto-submit');
    fireEvent.change(textarea, { target: { value: 'New note' } });
    
    // Find and click the add button (Plus icon)
    const buttons = screen.getAllByRole('button');
    const addBtn = buttons.find(b => !b.textContent?.includes('Registrar'));
    if (addBtn) fireEvent.click(addBtn);
    
    expect(props.onDecisionsChange).toHaveBeenCalled();
  });

  it('removes decision when X clicked', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'Remove me', category: 'decision', sourceStep: 'opening' },
    ];
    render(<InlineDecisionInput {...props} />);
    
    // Find remove button
    const removeButtons = screen.getAllByRole('button');
    const removeBtn = removeButtons.find(b => b.querySelector('.lucide-x'));
    if (removeBtn) fireEvent.click(removeBtn);
    
    expect(props.onDecisionsChange).toHaveBeenCalledWith([]);
  });
});
