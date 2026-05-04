/**
 * @file WizardStepFooter.test.tsx
 * @description Tests for shared WizardStepFooter and preset variants
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { WizardStepFooter, WizardFirstStepFooter, WizardLastStepFooter, WizardOptionalStepFooter } from '../WizardStepFooter';

describe('WizardStepFooter', () => {
  it('renders back and primary buttons by default', () => {
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={vi.fn()} />);
    expect(screen.getByText('Voltar')).toBeInTheDocument();
    expect(screen.getByText('Continuar')).toBeInTheDocument();
  });

  it('calls onBack when back clicked', () => {
    const onBack = vi.fn();
    render(<WizardStepFooter onBack={onBack} onPrimary={vi.fn()} />);
    fireEvent.click(screen.getByText('Voltar'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('calls onPrimary when primary clicked', () => {
    const onPrimary = vi.fn();
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={onPrimary} />);
    fireEvent.click(screen.getByText('Continuar'));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it('disables primary when primaryDisabled', () => {
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={vi.fn()} primaryDisabled />);
    const btn = screen.getByText('Continuar').closest('button');
    expect(btn).toBeDisabled();
  });

  it('disables back when backDisabled', () => {
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={vi.fn()} backDisabled />);
    const btn = screen.getByText('Voltar').closest('button');
    expect(btn).toBeDisabled();
  });

  it('uses custom labels', () => {
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={vi.fn()} backLabel="Anterior" primaryLabel="Avançar" />);
    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Avançar')).toBeInTheDocument();
  });

  it('hides back when showBack=false', () => {
    render(<WizardStepFooter showBack={false} onPrimary={vi.fn()} />);
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
  });

  it('hides primary when hidePrimary', () => {
    render(<WizardStepFooter onBack={vi.fn()} hidePrimary />);
    expect(screen.queryByText('Continuar')).not.toBeInTheDocument();
  });

  it('shows skip button when showSkip', () => {
    render(<WizardStepFooter onBack={vi.fn()} onPrimary={vi.fn()} showSkip onSkip={vi.fn()} />);
    expect(screen.getByText('Pular')).toBeInTheDocument();
  });

  it('renders leftContent in place of back', () => {
    render(<WizardStepFooter leftContent={<span>Custom Left</span>} onPrimary={vi.fn()} />);
    expect(screen.getByText('Custom Left')).toBeInTheDocument();
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
  });

  it('renders rightContent in place of primary', () => {
    render(<WizardStepFooter onBack={vi.fn()} rightContent={<span>Custom Right</span>} />);
    expect(screen.getByText('Custom Right')).toBeInTheDocument();
    expect(screen.queryByText('Continuar')).not.toBeInTheDocument();
  });
});

describe('WizardFirstStepFooter', () => {
  it('hides back button and shows "Começar"', () => {
    render(<WizardFirstStepFooter onPrimary={vi.fn()} />);
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
    expect(screen.getByText('Começar')).toBeInTheDocument();
  });
});

describe('WizardLastStepFooter', () => {
  it('shows "Finalizar e enviar" label by default', () => {
    render(<WizardLastStepFooter onBack={vi.fn()} onPrimary={vi.fn()} />);
    expect(screen.getByText('Finalizar e enviar')).toBeInTheDocument();
  });

  it('shows loading label when primaryLoading', () => {
    render(<WizardLastStepFooter onBack={vi.fn()} onPrimary={vi.fn()} primaryLoading />);
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
  });

  it('opens canonical ConfirmDialog when primary clicked (default copy)', () => {
    render(<WizardLastStepFooter onBack={vi.fn()} onPrimary={vi.fn()} />);
    fireEvent.click(screen.getByText('Finalizar e enviar'));
    expect(screen.getByText('Concluir ritual')).toBeInTheDocument();
    expect(screen.getByText('Confirmar conclusão')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('uses custom confirm copy', () => {
    render(
      <WizardLastStepFooter
        onBack={vi.fn()}
        onPrimary={vi.fn()}
        confirmTitle="Enviar Pré-MBR"
        confirmDescription="Revisão final antes do envio."
        confirmLabel="Enviar agora"
      />
    );
    fireEvent.click(screen.getByText('Finalizar e enviar'));
    expect(screen.getByText('Enviar Pré-MBR')).toBeInTheDocument();
    expect(screen.getByText('Revisão final antes do envio.')).toBeInTheDocument();
    expect(screen.getByText('Enviar agora')).toBeInTheDocument();
  });

  it('does not call onPrimary until user confirms inside the dialog', () => {
    const onPrimary = vi.fn();
    render(<WizardLastStepFooter onBack={vi.fn()} onPrimary={onPrimary} />);
    fireEvent.click(screen.getByText('Finalizar e enviar'));
    expect(onPrimary).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirmar conclusão'));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it('skips confirmation when disableConfirmation', () => {
    const onPrimary = vi.fn();
    render(
      <WizardLastStepFooter onBack={vi.fn()} onPrimary={onPrimary} disableConfirmation />
    );
    fireEvent.click(screen.getByText('Finalizar e enviar'));
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(screen.queryByText('Concluir ritual')).not.toBeInTheDocument();
  });
});

describe('WizardOptionalStepFooter', () => {
  it('shows skip button', () => {
    render(<WizardOptionalStepFooter onBack={vi.fn()} onPrimary={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Pular')).toBeInTheDocument();
  });
});
