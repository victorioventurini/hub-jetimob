/**
 * QbrLearningsStep tests
 * Validates structured reflection fields and navigation gates
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QbrLearningsStep, type QbrLearningsStepProps } from '../QbrLearningsStep';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <div data-testid="wizard-step-header"><h3>{title}</h3></div>,
  WizardStepFooter: ({ onPrimary, onBack, primaryDisabled }: any) => (
    <div>
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryDisabled}>Continuar</button>
    </div>
  ),
  WizardStepScaffold: ({ header, footer, bottomFixed, children }: any) => (
    <div>{header}{bottomFixed}{children}{footer}</div>
  ),
  InlineDecisionInput: () => <div data-testid="inline-decision-input" />,
  ReflectionQuestions: () => <div data-testid="reflection-questions" />,
}));

function renderStep(overrides: Partial<QbrLearningsStepProps> = {}) {
  const defaultProps: QbrLearningsStepProps = {
    learnings: { whatWorked: '', whatDidntWork: '', debts: '' },
    onLearningsChange: vi.fn(),
    decisions: [],
    onDecisionsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return render(<QbrLearningsStep {...defaultProps} />);
}

describe('QbrLearningsStep', () => {
  it('renders header with title', () => {
    renderStep();
    expect(screen.getByText('Aprendizados do Ciclo')).toBeInTheDocument();
  });

  it('renders three structured textareas', () => {
    renderStep();
    expect(screen.getByText('O que funcionou e deve continuar')).toBeInTheDocument();
    expect(screen.getByText('O que não funcionou e deve parar')).toBeInTheDocument();
    expect(screen.getByText(/Dívidas/)).toBeInTheDocument();
  });

  it('disables continue when no content', () => {
    renderStep();
    expect(screen.getByTestId('btn-primary')).toBeDisabled();
  });

  it('enables continue when any field has content', () => {
    renderStep({
      learnings: { whatWorked: 'Boas práticas', whatDidntWork: '', debts: '' },
    });
    expect(screen.getByTestId('btn-primary')).not.toBeDisabled();
  });

  it('calls onLearningsChange when textarea changes', () => {
    const onLearningsChange = vi.fn();
    renderStep({ onLearningsChange });
    
    const textareas = screen.getAllByRole('textbox');
    fireEvent.change(textareas[0], { target: { value: 'Nova reflexão' } });
    expect(onLearningsChange).toHaveBeenCalled();
  });

  it('shows reflection questions component', () => {
    renderStep();
    expect(screen.getByTestId('reflection-questions')).toBeInTheDocument();
  });
});
