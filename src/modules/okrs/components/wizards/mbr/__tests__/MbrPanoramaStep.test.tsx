/**
 * @file MbrPanoramaStep.test.tsx
 * @description Tests for MBR Panorama Executivo step (grouped by scope)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { MbrPanoramaStep } from '../MbrPanoramaStep';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// Mock shared wizard components
vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="wizard-step-header">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
  WizardFirstStepFooter: ({ primaryLabel, onPrimary }: { primaryLabel: string; onPrimary: () => void }) => (
    <button data-testid="wizard-footer-primary" onClick={onPrimary}>{primaryLabel}</button>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
  LastCheckinBadge: () => <span data-testid="last-checkin-badge" />,
}));

// ============================================================
// Factories
// ============================================================

const createKpiSnapshot = (overrides: Partial<MbrKpiSnapshot> = {}): MbrKpiSnapshot => ({
  kpiId: 'kpi-1',
  name: 'Taxa de Conversão',
  currentValue: 12,
  previousValue: 10,
  target: 15,
  ragStatus: 'green',
  variationVsLastMonth: 20,
  variationVsTarget: -20,
  requiresStrategicDecision: false,
  scope: 'org',
  ...overrides,
});

const defaultProps = () => ({
  kpiSnapshots: [] as MbrKpiSnapshot[],
  onKpiSnapshotsChange: vi.fn(),
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  lastCompletedAt: null,
  onContinue: vi.fn(),
});

// ============================================================
// Tests
// ============================================================

describe('MbrPanoramaStep', () => {
  it('renders header with correct title', () => {
    render(<MbrPanoramaStep {...defaultProps()} />);
    expect(screen.getByText('Panorama Executivo')).toBeInTheDocument();
  });

  it('renders empty state when no KPIs', () => {
    render(<MbrPanoramaStep {...defaultProps()} />);
    expect(screen.getByText(/nenhum kpi organizacional/i)).toBeInTheDocument();
  });

  it('renders KPI cards when snapshots provided', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', name: 'KPI Alpha', ragStatus: 'green' }),
      createKpiSnapshot({ kpiId: '2', name: 'KPI Beta', ragStatus: 'red' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('KPI Alpha')).toBeInTheDocument();
    expect(screen.getByText('KPI Beta')).toBeInTheDocument();
  });

  it('shows attention banner when at-risk KPIs exist', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', ragStatus: 'red' }),
      createKpiSnapshot({ kpiId: '2', ragStatus: 'yellow' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText(/2 KPIs em atenção/)).toBeInTheDocument();
  });

  it('does not show attention banner when all KPIs are green', () => {
    const kpis = [createKpiSnapshot({ ragStatus: 'green' })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.queryByText(/em atenção/)).not.toBeInTheDocument();
  });

  it('renders InlineDecisionInput with panorama sourceStep', () => {
    render(<MbrPanoramaStep {...defaultProps()} />);
    expect(screen.getByTestId('inline-decision-panorama')).toBeInTheDocument();
  });

  it('renders continue button with correct label', () => {
    render(<MbrPanoramaStep {...defaultProps()} />);
    expect(screen.getByText('Analisar KPIs Críticos')).toBeInTheDocument();
  });

  it('calls onContinue when continue clicked', async () => {
    const props = defaultProps();
    render(<MbrPanoramaStep {...props} />);
    screen.getByTestId('wizard-footer-primary').click();
    expect(props.onContinue).toHaveBeenCalledOnce();
  });

  it('displays KPI values and variations', () => {
    const kpis = [createKpiSnapshot({ currentValue: 42, target: 50, variationVsLastMonth: 5.5 })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Meta: 50')).toBeInTheDocument();
    expect(screen.getByText('+5.5% vs mês ant.')).toBeInTheDocument();
  });

  it('shows RAG badges correctly', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', ragStatus: 'green' }),
      createKpiSnapshot({ kpiId: '2', ragStatus: 'red' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  // ============================================================
  // Grouping tests
  // ============================================================

  it('renders Global BU section with BU name when provided', () => {
    const kpis = [createKpiSnapshot({ scope: 'org', name: 'Revenue' })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} buName="Jetimob" />);
    expect(screen.getByText('KPIs Globais da Jetimob')).toBeInTheDocument();
  });

  it('renders fallback Global BU section when no buName', () => {
    const kpis = [createKpiSnapshot({ scope: 'org', name: 'Revenue' })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('KPIs Globais da BU')).toBeInTheDocument();
  });

  it('renders Area section with area-scoped KPIs grouped by area', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', scope: 'area', areaId: 'a1', areaName: 'Operações', areaColor: '#10B981' }),
      createKpiSnapshot({ kpiId: '2', scope: 'area', areaId: 'a1', areaName: 'Operações', areaColor: '#10B981' }),
      createKpiSnapshot({ kpiId: '3', scope: 'area', areaId: 'a2', areaName: 'Comercial', areaColor: '#3B82F6' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('KPIs por Área')).toBeInTheDocument();
    expect(screen.getByText('Operações')).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
  });

  it('renders Team section with team-scoped KPIs grouped by team', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', scope: 'team', teamId: 't1', teamName: 'Dev Backend' }),
      createKpiSnapshot({ kpiId: '2', scope: 'team', teamId: 't2', teamName: 'Vendas Inside' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('KPIs por Time')).toBeInTheDocument();
    expect(screen.getByText('Dev Backend')).toBeInTheDocument();
    expect(screen.getByText('Vendas Inside')).toBeInTheDocument();
  });

  it('hides empty scope sections', () => {
    const kpis = [createKpiSnapshot({ scope: 'org' })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} buName="Jetimob" />);
    expect(screen.getByText('KPIs Globais da Jetimob')).toBeInTheDocument();
    expect(screen.queryByText('KPIs por Área')).not.toBeInTheDocument();
    expect(screen.queryByText('KPIs por Time')).not.toBeInTheDocument();
  });

  it('treats KPIs without scope as org', () => {
    const kpis = [createKpiSnapshot({ scope: undefined, name: 'Legacy KPI' })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} buName="Jetimob" />);
    expect(screen.getByText('KPIs Globais da Jetimob')).toBeInTheDocument();
    expect(screen.getByText('Legacy KPI')).toBeInTheDocument();
  });

  it('renders "Sem dados" badge for no_data KPIs', () => {
    const kpis = [createKpiSnapshot({ ragStatus: 'no_data' as any })];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.getByText('Sem dados')).toBeInTheDocument();
  });

  it('does not count no_data KPIs as at-risk', () => {
    const kpis = [
      createKpiSnapshot({ kpiId: '1', ragStatus: 'no_data' as any }),
      createKpiSnapshot({ kpiId: '2', ragStatus: 'green' }),
    ];
    render(<MbrPanoramaStep {...defaultProps()} kpiSnapshots={kpis} />);
    expect(screen.queryByText(/em atenção/)).not.toBeInTheDocument();
  });
});
