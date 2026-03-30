/**
 * QbrOkrProposalStep tests
 * Validates multi-objective creation flow, list view, edit sub-flow, and removal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { QbrOkrProposalStep, type QbrOkrProposalStepProps } from '../QbrOkrProposalStep';
import type { ProposedObjectiveEntry } from '@/modules/okrs/types/wizard';

// ============================================================
// MOCKS
// ============================================================

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, badge }: { title: string; badge?: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3>{badge && <span data-testid="badge">{badge}</span>}</div>
  ),
  WizardStepFooter: ({ onBack, onPrimary, primaryDisabled, primaryLabel, backLabel }: any) => (
    <div data-testid="wizard-step-footer">
      <button data-testid="btn-back" onClick={onBack}>{backLabel || 'Voltar'}</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel || 'Continuar'}</button>
    </div>
  ),
  WizardStepScaffold: ({ header, children }: any) => (
    <div>{header}{children}</div>
  ),
}));

vi.mock('@/components/selects', () => ({
  BuUserSelect: ({ value, onValueChange, placeholder }: any) => (
    <select data-testid="bu-user-select" value={value} onChange={(e: any) => onValueChange(e.target.value)}>
      <option value="">{placeholder || 'Selecionar...'}</option>
    </select>
  ),
  UnitSelect: ({ value, onChange }: any) => (
    <select data-testid="unit-select" value={value} onChange={(e: any) => onChange(e.target.value)}>
      <option value="%">%</option>
      <option value="R$">R$</option>
    </select>
  ),
}));

vi.mock('@/modules/okrs/hooks/useProposalValidation', () => ({
  useProposalValidation: () => ({
    assessment: null,
    isLoading: false,
    error: null,
    validate: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('./ProposalValidationCard', () => ({
  ProposalValidationCard: () => <div data-testid="proposal-validation-card" />,
}));

// ============================================================
// FACTORIES
// ============================================================

let entryCounter = 0;

function resetCounters() {
  entryCounter = 0;
}

function createEntry(overrides: Partial<ProposedObjectiveEntry> = {}): ProposedObjectiveEntry {
  entryCounter++;
  return {
    id: `obj-${entryCounter}`,
    objective: { title: `Objetivo Teste ${entryCounter} para validação`, description: 'Desc', org_objective_id: null, cycle_id: null },
    krPlan: { foundational: 2, contribution: 0, enabler: 0 },
    draftKrs: [
      { id: `kr-${entryCounter}-1`, type: 'foundational', title: 'Key Result válido A', unit: '%', baseline: 0, target: 100, direction: 'up' as const, owner_user_id: null, linked_org_kr_id: null },
      { id: `kr-${entryCounter}-2`, type: 'foundational', title: 'Key Result válido B', unit: '%', baseline: 0, target: 50, direction: 'up' as const, owner_user_id: null, linked_org_kr_id: null },
    ],
    ...overrides,
  };
}

function createIncompleteEntry(): ProposedObjectiveEntry {
  entryCounter++;
  return {
    id: `obj-${entryCounter}`,
    objective: { title: 'Short', description: '', org_objective_id: null, cycle_id: null },
    krPlan: { foundational: 1, contribution: 0, enabler: 0 },
    draftKrs: [],
  };
}

// ============================================================
// HELPERS
// ============================================================

function renderStep(overrides: Partial<QbrOkrProposalStepProps> = {}) {
  const defaultProps: QbrOkrProposalStepProps = {
    proposedOkrs: [],
    teamId: 'team-1',
    onProposedOkrsChange: vi.fn(),
    onContinue: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { ...render(<QbrOkrProposalStep {...defaultProps} />), props: defaultProps };
}

// ============================================================
// TESTS
// ============================================================

describe('QbrOkrProposalStep', () => {
  beforeEach(() => {
    resetCounters();
  });

  describe('rendering', () => {
    it('renders header with correct title', () => {
      renderStep();
      expect(screen.getByText('Proposta de OKRs')).toBeInTheDocument();
    });

    it('renders "Adicionar Objetivo" button when no entries', () => {
      renderStep();
      expect(screen.getByText('Adicionar Objetivo')).toBeInTheDocument();
    });

    it('shows skip label when no entries exist', () => {
      renderStep();
      expect(screen.getByText('Pular proposta')).toBeInTheDocument();
    });

    it('shows "Avançar para Resumo" when entries exist and complete', () => {
      const entry = createEntry();
      renderStep({ proposedOkrs: [entry] });
      expect(screen.getByText('Avançar para Resumo')).toBeInTheDocument();
    });
  });

  describe('list view', () => {
    it('displays all objective entries', () => {
      const entries = [createEntry(), createEntry()];
      renderStep({ proposedOkrs: entries });
      expect(screen.getByText(entries[0].objective.title)).toBeInTheDocument();
      expect(screen.getByText(entries[1].objective.title)).toBeInTheDocument();
    });

    it('shows KR count badge for each entry', () => {
      const entry = createEntry();
      renderStep({ proposedOkrs: [entry] });
      expect(screen.getByText('2/2 KRs')).toBeInTheDocument();
    });

    it('shows "Incompleto" badge for incomplete entries', () => {
      const entry = createIncompleteEntry();
      renderStep({ proposedOkrs: [entry] });
      expect(screen.getByText('Incompleto')).toBeInTheDocument();
    });

    it('disables continue when entries exist but are incomplete', () => {
      const entry = createIncompleteEntry();
      renderStep({ proposedOkrs: [entry] });
      const primaryBtn = screen.getByTestId('btn-primary');
      expect(primaryBtn).toBeDisabled();
    });

    it('enables continue when all entries are complete', () => {
      const entry = createEntry();
      renderStep({ proposedOkrs: [entry] });
      const primaryBtn = screen.getByTestId('btn-primary');
      expect(primaryBtn).not.toBeDisabled();
    });
  });

  describe('add objective', () => {
    it('calls onProposedOkrsChange with new entry when adding', async () => {
      const user = userEvent.setup();
      const { props } = renderStep();

      await user.click(screen.getByText('Adicionar Objetivo'));
      expect(props.onProposedOkrsChange).toHaveBeenCalledTimes(1);
      const newOkrs = (props.onProposedOkrsChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(newOkrs).toHaveLength(1);
      expect(newOkrs[0].objective.title).toBe('');
    });
  });

  describe('remove objective', () => {
    it('calls onProposedOkrsChange without removed entry', async () => {
      const user = userEvent.setup();
      const entries = [createEntry(), createEntry()];
      const { props } = renderStep({ proposedOkrs: entries });

      const removeButtons = screen.getAllByTitle('Remover');
      await user.click(removeButtons[0]);

      expect(props.onProposedOkrsChange).toHaveBeenCalledTimes(1);
      const updated = (props.onProposedOkrsChange as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe(entries[1].id);
    });
  });

  describe('navigation', () => {
    it('calls onContinue when clicking primary without entries', async () => {
      const user = userEvent.setup();
      const { props } = renderStep();
      await user.click(screen.getByText('Pular proposta'));
      expect(props.onContinue).toHaveBeenCalledTimes(1);
    });

    it('calls onBack when clicking back', async () => {
      const user = userEvent.setup();
      const { props } = renderStep();
      await user.click(screen.getByTestId('btn-back'));
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('badge', () => {
    it('shows objective count in badge', () => {
      const entries = [createEntry(), createEntry()];
      renderStep({ proposedOkrs: entries });
      expect(screen.getByTestId('badge')).toHaveTextContent('2 objetivos');
    });

    it('shows singular when 1 objective', () => {
      renderStep({ proposedOkrs: [createEntry()] });
      expect(screen.getByTestId('badge')).toHaveTextContent('1 objetivo');
    });
  });
});
