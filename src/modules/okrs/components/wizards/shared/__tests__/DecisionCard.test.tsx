/**
 * @file DecisionCard.test.tsx
 * @description Tests for the shared DecisionCard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { DecisionCard } from '../DecisionCard';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// Mock heavy dependencies
vi.mock('@/components/selects', () => ({
  BuUserSelect: ({ value, onValueChange, placeholder }: any) => (
    <select
      data-testid="bu-user-select"
      value={value || ''}
      onChange={(e) => onValueChange(e.target.value || null)}
    >
      <option value="">{placeholder}</option>
      <option value="user-1">User 1</option>
    </select>
  ),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <div data-testid="calendar">
      <button data-testid="select-date" onClick={() => onSelect(new Date('2025-06-15'))}>
        Select Date
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/textarea-auto-submit', () => ({
  TextareaAutoSubmit: (props: any) => (
    <textarea
      data-testid="edit-textarea"
      value={props.value}
      onChange={props.onChange}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) props.onSubmit?.();
      }}
    />
  ),
}));

const baseDecision: TeamCheckinDecision = {
  id: 'dec-1',
  text: 'Test decision text',
  category: 'decision',
  sourceStep: 'decisions',
};

describe('DecisionCard', () => {
  const defaultProps = () => ({
    decision: { ...baseDecision },
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
  });

  it('renders decision text', () => {
    render(<DecisionCard {...defaultProps()} />);
    expect(screen.getByText('Test decision text')).toBeInTheDocument();
  });

  it('shows category badge when showReclassify is false', () => {
    render(<DecisionCard {...defaultProps()} />);
    expect(screen.getByText('Decisão')).toBeInTheDocument();
  });

  it('shows reclassification badges when showReclassify is true', () => {
    render(<DecisionCard {...defaultProps()} showReclassify />);
    expect(screen.getByText('Decisão')).toBeInTheDocument();
    expect(screen.getByText('Ajuste de Foco')).toBeInTheDocument();
    expect(screen.getByText('Próximo Passo')).toBeInTheDocument();
  });

  it('reclassifies via onUpdate preserving other fields', () => {
    const props = defaultProps();
    props.decision = { ...baseDecision, owner: { id: 'u1', name: 'John' }, deadline: '2025-12-31' };
    render(<DecisionCard {...props} showReclassify />);
    
    fireEvent.click(screen.getByText('Próximo Passo'));
    expect(props.onUpdate).toHaveBeenCalledWith('dec-1', { category: 'next_step' });
  });

  it('shows owner select and deadline picker when showOwnerDeadline is true', () => {
    render(<DecisionCard {...defaultProps()} showOwnerDeadline />);
    expect(screen.getByTestId('bu-user-select')).toBeInTheDocument();
    expect(screen.getByText('Prazo')).toBeInTheDocument();
  });

  it('hides owner/deadline when showOwnerDeadline is false', () => {
    render(<DecisionCard {...defaultProps()} showOwnerDeadline={false} />);
    expect(screen.queryByTestId('bu-user-select')).not.toBeInTheDocument();
    expect(screen.queryByText('Prazo')).not.toBeInTheDocument();
  });

  it('shows "Pendente" when no owner and no deadline', () => {
    render(<DecisionCard {...defaultProps()} showOwnerDeadline />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('does not show "Pendente" when owner is set', () => {
    const props = defaultProps();
    props.decision = { ...baseDecision, owner: { id: 'u1', name: 'John' } };
    render(<DecisionCard {...props} showOwnerDeadline />);
    expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('calls onRemove when X clicked', () => {
    const props = defaultProps();
    render(<DecisionCard {...props} />);
    
    // Find the X button (second ghost button)
    const buttons = screen.getAllByRole('button');
    const removeBtn = buttons.find(b => b.querySelector('.lucide-x'));
    if (removeBtn) fireEvent.click(removeBtn);
    
    expect(props.onRemove).toHaveBeenCalledWith('dec-1');
  });

  it('enters edit mode and saves', () => {
    const props = defaultProps();
    render(<DecisionCard {...props} />);
    
    // Click edit button
    const buttons = screen.getAllByRole('button');
    const editBtn = buttons.find(b => b.querySelector('.lucide-pencil'));
    if (editBtn) fireEvent.click(editBtn);
    
    const textarea = screen.getByTestId('edit-textarea');
    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    
    // Click save
    const saveBtn = screen.getAllByRole('button').find(b => b.querySelector('.lucide-check'));
    if (saveBtn) fireEvent.click(saveBtn);
    
    expect(props.onUpdate).toHaveBeenCalledWith('dec-1', { text: 'Updated text' });
  });

  it('updates owner via BuUserSelect', () => {
    const props = defaultProps();
    render(<DecisionCard {...props} showOwnerDeadline />);
    
    fireEvent.change(screen.getByTestId('bu-user-select'), { target: { value: 'user-1' } });
    expect(props.onUpdate).toHaveBeenCalledWith('dec-1', { owner: { id: 'user-1', name: '' } });
  });

  it('formats deadline date when set', () => {
    const props = defaultProps();
    props.decision = { ...baseDecision, deadline: '2025-06-15T00:00:00.000Z' };
    render(<DecisionCard {...props} showOwnerDeadline />);
    expect(screen.getByText('15/06')).toBeInTheDocument();
  });
});
