/**
 * QbrPreSummary tests
 * Validates summary rendering, normalization of proposedOkrs, and sections display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { QbrPreSummary, type QbrPreSummaryProps } from '../QbrPreSummary';
import type { QbrPreDraftData, ProposedObjectiveEntry } from '@/modules/okrs/types/wizard';

// ============================================================
// MOCKS
// ============================================================

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => (
    <div data-testid="wizard-step-header"><h3>{title}</h3></div>
  ),
  WizardLastStepFooter: ({ onBack, onPrimary, primaryLoading }: any) => (
    <div data-testid="wizard-last-step-footer">
      <button data-testid="btn-back" onClick={onBack}>Voltar</button>
      <button data-testid="btn-primary" onClick={onPrimary} disabled={primaryLoading}>Enviar</button>
    </div>
  ),
  WizardStepScaffold: ({ header, footer, children }: any) => (
    <div>{header}{children}{footer}</div>
  ),
}));

vi.mock('@/modules/okrs/hooks/useKrStateInsights', () => ({
  KR_STATE_CONFIG: {
    not_started: { label: 'Não iniciado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    healthy: { label: 'Saudável', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    stagnant: { label: 'Estagnado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    at_risk: { label: 'Em risco', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    off_track: { label: 'Fora da meta', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    achieved: { label: 'Alcançado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    exceeded: { label: 'Superado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
    not_achieved: { label: 'Não alcançado', icon: () => <span>●</span>, bgClass: '', colorClass: '' },
  },
}));

// ============================================================
// FACTORIES
// ============================================================

function createBaseDraftData(overrides: Partial<QbrPreDraftData> = {}): QbrPreDraftData {
  return {
    cycleId: 'cycle-1',
    teamId: 'team-1',
    krFinalStates: [],
    kpiSnapshots: [],
    zombieCandidates: [],
    kpisToCreate: [],
    learnings: { whatWorked: '', whatDidntWork: '', debts: '' },
    proposedOkrs: [],
    dependencies: [],
    decisions: [],
    ...overrides,
  };
}

function createProposedEntry(title: string, krCount = 1): ProposedObjectiveEntry {
  return {
    id: `obj-${title}`,
    objective: { title, description: '', org_objective_id: null, cycle_id: null },
    krPlan: { foundational: krCount, contribution: 0, enabler: 0 },
    draftKrs: Array.from({ length: krCount }, (_, i) => ({
      id: `kr-${title}-${i}`,
      type: 'foundational' as const,
      title: `KR ${i + 1} do ${title}`,
      unit: '%',
      baseline: 0,
      target: 100,
      direction: 'up' as const,
      owner_user_id: null,
      linked_org_kr_id: null,
    })),
  };
}

// ============================================================
// HELPERS
// ============================================================

function renderSummary(overrides: Partial<QbrPreSummaryProps> = {}) {
  const defaultProps: QbrPreSummaryProps = {
    draftData: createBaseDraftData(),
    decisions: [],
    isCompleting: false,
    onComplete: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { ...render(<QbrPreSummary {...defaultProps} />), props: defaultProps };
}

// ============================================================
// TESTS
// ============================================================

describe('QbrPreSummary', () => {
  describe('rendering', () => {
    it('renders header with correct title', () => {
      renderSummary();
      expect(screen.getByText('Resumo e Envio')).toBeInTheDocument();
    });

    it('renders balance section with KR counts', () => {
      const draftData = createBaseDraftData({
        krFinalStates: [
          { krId: 'kr-1', krTitle: 'KR achieved', state: 'achieved', finalProgress: 100, paceStatus: 'on_pace' },
          { krId: 'kr-2', krTitle: 'KR healthy', state: 'healthy', finalProgress: 60, paceStatus: 'on_pace' },
        ],
      });
      renderSummary({ draftData });
      expect(screen.getByText('2 KRs total')).toBeInTheDocument();
      expect(screen.getByText('1 alcançados')).toBeInTheDocument();
    });
  });

  describe('learnings section', () => {
    it('shows learnings when filled', () => {
      const draftData = createBaseDraftData({
        learnings: { whatWorked: 'Daily standups', whatDidntWork: 'Long meetings', debts: 'Tech debt' },
      });
      renderSummary({ draftData });
      expect(screen.getByText('Aprendizados')).toBeInTheDocument();
      expect(screen.getByText('Daily standups')).toBeInTheDocument();
      expect(screen.getByText('Long meetings')).toBeInTheDocument();
      expect(screen.getByText('Tech debt')).toBeInTheDocument();
    });

    it('hides learnings section when empty', () => {
      renderSummary();
      expect(screen.queryByText('Aprendizados')).not.toBeInTheDocument();
    });
  });

  describe('proposed OKRs section', () => {
    it('displays proposed objectives', () => {
      const entries = [
        createProposedEntry('Aumentar receita', 2),
        createProposedEntry('Melhorar NPS', 1),
      ];
      const draftData = createBaseDraftData({ proposedOkrs: entries });
      renderSummary({ draftData });
      expect(screen.getByText(/Proposta de OKRs \(2\)/)).toBeInTheDocument();
      expect(screen.getByText('Aumentar receita')).toBeInTheDocument();
      expect(screen.getByText('Melhorar NPS')).toBeInTheDocument();
    });

    it('shows KR count per objective', () => {
      const entries = [createProposedEntry('Obj com 3 KRs', 3)];
      const draftData = createBaseDraftData({ proposedOkrs: entries });
      renderSummary({ draftData });
      expect(screen.getByText('3 KRs definidos')).toBeInTheDocument();
    });

    it('hides OKR section when no proposals', () => {
      renderSummary();
      expect(screen.queryByText(/Proposta de OKRs/)).not.toBeInTheDocument();
    });
  });

  describe('normalizeProposedOkrs handling', () => {
    it('handles legacy single-object format without crashing', () => {
      const legacyData = createBaseDraftData();
      // Simulate legacy format: object instead of array
      (legacyData as any).proposedOkrs = {
        objective: { title: 'Legacy Obj', description: '' },
        krPlan: { foundational: 1, contribution: 0, enabler: 0 },
        draftKrs: [{ id: 'kr-1', type: 'foundational', title: 'Legacy KR', unit: '%', baseline: 0, target: 100, direction: 'up', owner_user_id: null, linked_org_kr_id: null }],
      };
      // Should not throw
      expect(() => renderSummary({ draftData: legacyData })).not.toThrow();
    });

    it('handles null proposedOkrs without crashing', () => {
      const draftData = createBaseDraftData();
      (draftData as any).proposedOkrs = null;
      expect(() => renderSummary({ draftData })).not.toThrow();
    });

    it('handles undefined proposedOkrs without crashing', () => {
      const draftData = createBaseDraftData();
      (draftData as any).proposedOkrs = undefined;
      expect(() => renderSummary({ draftData })).not.toThrow();
    });
  });

  describe('decisions section', () => {
    it('displays decisions when present', () => {
      const decisions = [
        { id: 'd-1', text: 'Priorizar feature X', createdAt: new Date().toISOString() },
        { id: 'd-2', text: 'Cancelar projeto Y', createdAt: new Date().toISOString() },
      ];
      renderSummary({ decisions });
      expect(screen.getByText('Notas e decisões (2)')).toBeInTheDocument();
      expect(screen.getByText('• Priorizar feature X')).toBeInTheDocument();
      expect(screen.getByText('• Cancelar projeto Y')).toBeInTheDocument();
    });

    it('hides decisions when empty', () => {
      renderSummary();
      expect(screen.queryByText(/Notas e decisões/)).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onComplete when clicking primary', async () => {
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      const { props } = renderSummary();
      await user.click(screen.getByTestId('btn-primary'));
      expect(props.onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onBack when clicking back', async () => {
      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      const { props } = renderSummary();
      await user.click(screen.getByTestId('btn-back'));
      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('disables primary button when completing', () => {
      renderSummary({ isCompleting: true });
      expect(screen.getByTestId('btn-primary')).toBeDisabled();
    });
  });
});
