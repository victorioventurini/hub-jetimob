/**
 * @file TeamDecisionsStep.test.tsx
 * @description Tests for Team Check-in Decisions step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamDecisionsStep } from '../TeamDecisionsStep';
import type { TeamCheckinDecision, TeamCheckinChecklist } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, description }: { title: string; description?: string }) => <div><h3>{title}</h3>{description && <p>{description}</p>}</div>,
  WizardLastStepFooter: ({ onPrimary, onBack, primaryDisabled }: any) => (
    <div>
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="complete-btn" onClick={onPrimary} disabled={primaryDisabled}>Concluir</button>
    </div>
  ),
  DecisionCard: ({ decision, onUpdate, onRemove }: any) => (
    <div data-testid={`decision-card-${decision.id}`}>
      <span>{decision.text}</span>
      <button data-testid={`remove-${decision.id}`} onClick={() => onRemove(decision.id)}>X</button>
    </div>
  ),
}));

vi.mock('@/components/ui/textarea-auto-submit', () => ({
  TextareaAutoSubmit: (props: any) => (
    <textarea
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  ),
}));

const emptyChecklist: TeamCheckinChecklist = {
  knowWhatToFocus: false,
  knowWhatNotToDo: false,
  knowWhoIsResponsible: false,
};

const fullChecklist: TeamCheckinChecklist = {
  knowWhatToFocus: true,
  knowWhatNotToDo: true,
  knowWhoIsResponsible: true,
};

const defaultProps = () => ({
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  checklist: { ...emptyChecklist },
  onChecklistChange: vi.fn(),
  onComplete: vi.fn(),
  onBack: vi.fn(),
});

describe('TeamDecisionsStep', () => {
  it('renders header', () => {
    render(<TeamDecisionsStep {...defaultProps()} />);
    expect(screen.getByText('Decisões e Próximos Passos')).toBeInTheDocument();
  });

  it('shows empty state when no decisions', () => {
    render(<TeamDecisionsStep {...defaultProps()} />);
    expect(screen.getByText(/nenhum registro ainda/i)).toBeInTheDocument();
  });

  it('renders decisions grouped by sourceStep', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'From opening', category: 'decision', sourceStep: 'opening' },
      { id: '2', text: 'From review', category: 'next_step', sourceStep: 'kr-review' },
    ];
    render(<TeamDecisionsStep {...props} />);
    expect(screen.getByText('From opening')).toBeInTheDocument();
    expect(screen.getByText('From review')).toBeInTheDocument();
    expect(screen.getByText('Da Abertura')).toBeInTheDocument();
    expect(screen.getByText('Da Revisão de KRs')).toBeInTheDocument();
  });

  it('renders checklist items', () => {
    render(<TeamDecisionsStep {...defaultProps()} />);
    expect(screen.getByText(/sei no que focar/i)).toBeInTheDocument();
    expect(screen.getByText(/não devo priorizar/i)).toBeInTheDocument();
    expect(screen.getByText(/quem é responsável/i)).toBeInTheDocument();
  });

  it('GATE: disables complete when checklist incomplete', () => {
    render(<TeamDecisionsStep {...defaultProps()} />);
    expect(screen.getByTestId('complete-btn')).toBeDisabled();
  });

  it('GATE: enables complete when all checked', () => {
    const props = defaultProps();
    props.checklist = { ...fullChecklist };
    render(<TeamDecisionsStep {...props} />);
    expect(screen.getByTestId('complete-btn')).not.toBeDisabled();
  });

  it('calls onComplete when complete clicked', () => {
    const props = defaultProps();
    props.checklist = { ...fullChecklist };
    render(<TeamDecisionsStep {...props} />);
    screen.getByTestId('complete-btn').click();
    expect(props.onComplete).toHaveBeenCalledOnce();
  });

  it('calls onChecklistChange when checkbox toggled', () => {
    const props = defaultProps();
    render(<TeamDecisionsStep {...props} />);
    
    fireEvent.click(screen.getByText(/sei no que focar/i));
    expect(props.onChecklistChange).toHaveBeenCalledWith(
      expect.objectContaining({ knowWhatToFocus: true })
    );
  });

  it('displays decision count', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'D1', category: 'decision', sourceStep: 'opening' },
      { id: '2', text: 'D2', category: 'next_step', sourceStep: 'decisions' },
    ];
    render(<TeamDecisionsStep {...props} />);
    expect(screen.getByText(/2 registro/)).toBeInTheDocument();
  });
});
