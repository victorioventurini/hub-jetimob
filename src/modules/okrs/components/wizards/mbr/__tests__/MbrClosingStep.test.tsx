/**
 * @file MbrClosingStep.test.tsx
 * @description Tests for MBR Encerramento & Governança step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MbrClosingStep } from '../MbrClosingStep';
import type { MbrGovernanceChecklist, RitualImprovementFeedback, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <div><h3>{title}</h3></div>,
  WizardLastStepFooter: ({ onPrimary, onBack, primaryDisabled }: any) => (
    <div>
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="complete-btn" onClick={onPrimary} disabled={primaryDisabled}>Concluir</button>
    </div>
  ),
}));

const emptyChecklist: MbrGovernanceChecklist = {
  strategicFocusClear: false,
  nextStepsHaveOwners: false,
  nonPrioritiesClear: false,
  communicateInAllHands: false,
};

const fullChecklist: MbrGovernanceChecklist = {
  strategicFocusClear: true,
  nextStepsHaveOwners: true,
  nonPrioritiesClear: true,
  communicateInAllHands: true,
};

const defaultProps = () => ({
  decisions: [] as TeamCheckinDecision[],
  checklist: { ...emptyChecklist },
  onChecklistChange: vi.fn(),
  ritualFeedback: [] as RitualImprovementFeedback[],
  onRitualFeedbackChange: vi.fn(),
  onComplete: vi.fn(),
  onBack: vi.fn(),
});

describe('MbrClosingStep', () => {
  it('renders header', () => {
    render(<MbrClosingStep {...defaultProps()} />);
    expect(screen.getByText('Encerramento & Governança')).toBeInTheDocument();
  });

  it('renders all 4 checklist items', () => {
    render(<MbrClosingStep {...defaultProps()} />);
    expect(screen.getByText(/foco estratégico do próximo mês/i)).toBeInTheDocument();
    expect(screen.getByText(/próximos passos têm responsável/i)).toBeInTheDocument();
    expect(screen.getByText(/não será prioridade/i)).toBeInTheDocument();
    expect(screen.getByText(/comunicado no all hands/i)).toBeInTheDocument();
  });

  it('renders feedback section with star rating', () => {
    render(<MbrClosingStep {...defaultProps()} />);
    expect(screen.getByText(/como podemos melhorar essa reunião/i)).toBeInTheDocument();
    expect(screen.getByText(/feedback anônimo/i)).toBeInTheDocument();
    // 5 star buttons for input
    expect(screen.getAllByLabelText(/estrela/i)).toHaveLength(5);
  });

  it('calls onChecklistChange when checkbox toggled', () => {
    const props = defaultProps();
    render(<MbrClosingStep {...props} />);
    
    const checkbox = screen.getByText(/foco estratégico/i);
    fireEvent.click(checkbox);
    
    expect(props.onChecklistChange).toHaveBeenCalledWith(
      expect.objectContaining({ strategicFocusClear: true })
    );
  });

  it('add button disabled without star rating', () => {
    render(<MbrClosingStep {...defaultProps()} />);
    expect(screen.getByTestId('add-feedback-btn')).toBeDisabled();
  });

  it('adds feedback with rating when submitted', () => {
    const props = defaultProps();
    render(<MbrClosingStep {...props} />);
    
    // Click 3rd star
    const stars = screen.getAllByLabelText(/estrela/i);
    fireEvent.click(stars[2]); // 3rd star = rating 3

    // Optionally add text
    const textarea = screen.getByPlaceholderText(/comentário opcional/i);
    fireEvent.change(textarea, { target: { value: 'Reunião muito longa' } });
    
    // Submit
    fireEvent.click(screen.getByTestId('add-feedback-btn'));
    
    expect(props.onRitualFeedbackChange).toHaveBeenCalledWith([
      expect.objectContaining({ rating: 3, text: 'Reunião muito longa', status: 'pending' }),
    ]);
  });

  it('adds feedback with rating only (no text)', () => {
    const props = defaultProps();
    render(<MbrClosingStep {...props} />);
    
    const stars = screen.getAllByLabelText(/estrela/i);
    fireEvent.click(stars[4]); // 5th star = rating 5
    fireEvent.click(screen.getByTestId('add-feedback-btn'));
    
    expect(props.onRitualFeedbackChange).toHaveBeenCalledWith([
      expect.objectContaining({ rating: 5, text: '' }),
    ]);
  });

  it('renders existing feedback items with stars', () => {
    const props = defaultProps();
    props.ritualFeedback = [
      { id: 'fb-1', rating: 4, text: 'Melhorar agenda', status: 'pending', createdAt: new Date().toISOString() },
    ];
    render(<MbrClosingStep {...props} />);
    expect(screen.getByText('Melhorar agenda')).toBeInTheDocument();
  });

  it('removes feedback when X clicked', () => {
    const props = defaultProps();
    props.ritualFeedback = [
      { id: 'fb-1', rating: 3, text: 'Remove this', status: 'pending', createdAt: new Date().toISOString() },
    ];
    render(<MbrClosingStep {...props} />);
    
    const removeButtons = screen.getAllByRole('button');
    const removeBtn = removeButtons.find(b => b.querySelector('.lucide-x'));
    if (removeBtn) fireEvent.click(removeBtn);
    
    expect(props.onRitualFeedbackChange).toHaveBeenCalledWith([]);
  });

  it('GATE: disables complete when checklist incomplete', () => {
    const props = defaultProps();
    props.ritualFeedback = [{ id: 'fb-1', rating: 4, text: 'Some feedback', status: 'pending', createdAt: '' }];
    render(<MbrClosingStep {...props} />);
    
    expect(screen.getByTestId('complete-btn')).toBeDisabled();
    expect(screen.getByText(/complete o checklist/i)).toBeInTheDocument();
  });

  it('GATE: disables complete when no feedback', () => {
    const props = defaultProps();
    props.checklist = { ...fullChecklist };
    props.ritualFeedback = [];
    render(<MbrClosingStep {...props} />);
    
    expect(screen.getByTestId('complete-btn')).toBeDisabled();
    expect(screen.getByText(/adicione pelo menos um feedback/i)).toBeInTheDocument();
  });

  it('GATE: enables complete when checklist full + feedback present', () => {
    const props = defaultProps();
    props.checklist = { ...fullChecklist };
    props.ritualFeedback = [{ id: 'fb-1', rating: 5, text: 'Good meeting', status: 'pending', createdAt: '' }];
    render(<MbrClosingStep {...props} />);
    
    expect(screen.getByTestId('complete-btn')).not.toBeDisabled();
  });

  it('calls onComplete when complete clicked', () => {
    const props = defaultProps();
    props.checklist = { ...fullChecklist };
    props.ritualFeedback = [{ id: 'fb-1', rating: 4, text: 'OK', status: 'pending', createdAt: '' }];
    render(<MbrClosingStep {...props} />);
    
    screen.getByTestId('complete-btn').click();
    expect(props.onComplete).toHaveBeenCalledOnce();
  });

  it('shows decision summary badges', () => {
    const props = defaultProps();
    props.decisions = [
      { id: '1', text: 'D', category: 'decision', sourceStep: 'panorama' },
      { id: '2', text: 'F', category: 'focus_adjustment', sourceStep: 'panorama' },
      { id: '3', text: 'N', category: 'next_step', sourceStep: 'panorama' },
    ];
    render(<MbrClosingStep {...props} />);
    
    expect(screen.getByText(/1 decisões/)).toBeInTheDocument();
    expect(screen.getByText(/1 ajustes de foco/)).toBeInTheDocument();
    expect(screen.getByText(/1 próximos passos/)).toBeInTheDocument();
  });
});
