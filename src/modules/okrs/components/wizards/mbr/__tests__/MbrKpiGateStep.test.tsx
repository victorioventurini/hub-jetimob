/**
 * @file MbrKpiGateStep.test.tsx
 * @description Tests for MBR KPI Gate Estratégico step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { MbrKpiGateStep } from '../MbrKpiGateStep';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// Mock shared
vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title }: { title: string }) => <div data-testid="wizard-step-header"><h3>{title}</h3></div>,
  WizardStepFooter: ({ primaryLabel, onPrimary, onBack, primaryDisabled }: any) => (
    <div data-testid="wizard-step-footer">
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="primary-btn" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</button>
    </div>
  ),
  InlineDecisionInput: ({ sourceStep }: { sourceStep: string }) => (
    <div data-testid={`inline-decision-${sourceStep}`} />
  ),
}));

const createKpi = (overrides: Partial<MbrKpiSnapshot> = {}): MbrKpiSnapshot => ({
  kpiId: 'kpi-1',
  name: 'KPI Test',
  currentValue: 10,
  previousValue: 8,
  target: 15,
  ragStatus: 'red',
  variationVsLastMonth: 25,
  variationVsTarget: -33,
  requiresStrategicDecision: false,
  ...overrides,
});

const defaultProps = () => ({
  kpiSnapshots: [] as MbrKpiSnapshot[],
  onKpiSnapshotsChange: vi.fn(),
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  onContinue: vi.fn(),
  onBack: vi.fn(),
});

describe('MbrKpiGateStep', () => {
  it('renders header', () => {
    render(<MbrKpiGateStep {...defaultProps()} />);
    expect(screen.getByText('KPI Gate Estratégico')).toBeInTheDocument();
  });

  it('shows celebration when no critical KPIs', () => {
    const props = defaultProps();
    // No KPIs with red/yellow → all green or empty
    props.kpiSnapshots = [createKpi({ ragStatus: 'green' })];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByText(/nenhum kpi em risco/i)).toBeInTheDocument();
  });

  it('filters and shows only red/yellow KPIs', () => {
    const props = defaultProps();
    props.kpiSnapshots = [
      createKpi({ kpiId: '1', name: 'Red KPI', ragStatus: 'red' }),
      createKpi({ kpiId: '2', name: 'Green KPI', ragStatus: 'green' }),
      createKpi({ kpiId: '3', name: 'Yellow KPI', ragStatus: 'yellow' }),
    ];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByText('Red KPI')).toBeInTheDocument();
    expect(screen.getByText('Yellow KPI')).toBeInTheDocument();
    expect(screen.queryByText('Green KPI')).not.toBeInTheDocument();
  });

  it('renders impact assessment textarea for each critical KPI', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ ragStatus: 'red' })];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByText(/se ignorarmos por 30 dias/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/impacto potencial/i)).toBeInTheDocument();
  });

  it('renders strategic decision toggle', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ ragStatus: 'yellow' })];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByText(/exige decisão estratégica/i)).toBeInTheDocument();
  });

  it('calls onKpiSnapshotsChange when toggle is switched', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ kpiId: 'k1', ragStatus: 'red', requiresStrategicDecision: false })];
    render(<MbrKpiGateStep {...props} />);
    
    // Find and click the switch
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(props.onKpiSnapshotsChange).toHaveBeenCalledWith([
      expect.objectContaining({ kpiId: 'k1', requiresStrategicDecision: true }),
    ]);
  });

  it('shows InlineDecisionInput when requiresStrategicDecision is true', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ ragStatus: 'red', requiresStrategicDecision: true })];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByTestId('inline-decision-kpi-gate')).toBeInTheDocument();
  });

  it('GATE: disables continue when KPI requires decision but none registered', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ kpiId: 'k1', name: 'Critical', ragStatus: 'red', requiresStrategicDecision: true })];
    props.decisions = []; // No decisions
    render(<MbrKpiGateStep {...props} />);
    
    expect(screen.getByTestId('primary-btn')).toBeDisabled();
    expect(screen.getByText(/registre decisões/i)).toBeInTheDocument();
  });

  it('GATE: enables continue when all required decisions are registered', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ kpiId: 'k1', name: 'Critical', ragStatus: 'red', requiresStrategicDecision: true })];
    props.decisions = [{
      id: 'd1',
      text: 'Decisão sobre Critical KPI',
      category: 'decision',
      sourceStep: 'kpi-gate',
    }];
    render(<MbrKpiGateStep {...props} />);
    
    expect(screen.getByTestId('primary-btn')).not.toBeDisabled();
  });

  it('enables continue when no KPIs require decisions', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ ragStatus: 'red', requiresStrategicDecision: false })];
    render(<MbrKpiGateStep {...props} />);
    expect(screen.getByTestId('primary-btn')).not.toBeDisabled();
  });

  it('calls onBack when back clicked', () => {
    const props = defaultProps();
    render(<MbrKpiGateStep {...props} />);
    screen.getByTestId('back-btn').click();
    expect(props.onBack).toHaveBeenCalledOnce();
  });

  it('updates impact assessment text', () => {
    const props = defaultProps();
    props.kpiSnapshots = [createKpi({ kpiId: 'k1', ragStatus: 'red' })];
    render(<MbrKpiGateStep {...props} />);
    
    const textarea = screen.getByPlaceholderText(/impacto potencial/i);
    fireEvent.change(textarea, { target: { value: 'Alto impacto financeiro' } });
    
    expect(props.onKpiSnapshotsChange).toHaveBeenCalledWith([
      expect.objectContaining({ kpiId: 'k1', impactAssessment: 'Alto impacto financeiro' }),
    ]);
  });
});
