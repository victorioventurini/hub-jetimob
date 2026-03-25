/**
 * @file MbrDecisionsStep.test.tsx
 * @description Tests for MBR Decisões Estratégicas Consolidadas step
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { MbrDecisionsStep } from '../MbrDecisionsStep';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

vi.mock('../../shared', () => ({
  WizardStepHeader: ({ title, description }: { title: string; description?: string }) => <div><h3>{title}</h3>{description && <p>{description}</p>}</div>,
  WizardStepFooter: ({ primaryLabel, onPrimary, onBack }: any) => (
    <div>
      <button data-testid="back-btn" onClick={onBack}>Voltar</button>
      <button data-testid="primary-btn" onClick={onPrimary}>{primaryLabel}</button>
    </div>
  ),
  DecisionCard: ({ decision, onUpdate, onRemove, showReclassify }: any) => (
    <div data-testid={`decision-card-${decision.id}`}>
      <span>{decision.text}</span>
      {showReclassify && <span data-testid="reclassify-badge">Reclassify</span>}
      <button data-testid={`remove-${decision.id}`} onClick={() => onRemove(decision.id)}>X</button>
      <button data-testid={`update-${decision.id}`} onClick={() => onUpdate(decision.id, { text: 'updated' })}>Edit</button>
    </div>
  ),
}));

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

const createDecision = (overrides: Partial<TeamCheckinDecision> = {}): TeamCheckinDecision => ({
  id: 'dec-1',
  text: 'Test decision',
  category: 'decision',
  sourceStep: 'panorama',
  ...overrides,
});

const defaultProps = () => ({
  decisions: [] as TeamCheckinDecision[],
  onDecisionsChange: vi.fn(),
  previousMbrPendingItems: [] as TeamCheckinDecision[],
  onContinue: vi.fn(),
  onBack: vi.fn(),
});

describe('MbrDecisionsStep', () => {
  it('renders header', () => {
    render(<MbrDecisionsStep {...defaultProps()} />);
    expect(screen.getByText('Decisões Estratégicas')).toBeInTheDocument();
  });

  it('shows empty state when no decisions', () => {
    render(<MbrDecisionsStep {...defaultProps()} />);
    expect(screen.getByText(/nenhum registro ainda/i)).toBeInTheDocument();
  });

  it('renders decisions grouped by source step', () => {
    const props = defaultProps();
    props.decisions = [
      createDecision({ id: '1', text: 'From panorama', sourceStep: 'panorama' }),
      createDecision({ id: '2', text: 'From KPI gate', sourceStep: 'kpi-gate' }),
    ];
    render(<MbrDecisionsStep {...props} />);
    
    expect(screen.getByText('From panorama')).toBeInTheDocument();
    expect(screen.getByText('From KPI gate')).toBeInTheDocument();
    expect(screen.getByText('Do Panorama')).toBeInTheDocument();
    expect(screen.getByText('Do KPI Gate')).toBeInTheDocument();
  });

  it('renders category selector badges', () => {
    render(<MbrDecisionsStep {...defaultProps()} />);
    expect(screen.getByText('Decisão')).toBeInTheDocument();
    expect(screen.getByText('Ajuste de Foco')).toBeInTheDocument();
    expect(screen.getByText('Próximo Passo')).toBeInTheDocument();
  });

  it('adds new decision when text submitted', () => {
    const props = defaultProps();
    render(<MbrDecisionsStep {...props} />);
    
    const textarea = screen.getByPlaceholderText(/realocar orçamento/i);
    fireEvent.change(textarea, { target: { value: 'Nova decisão estratégica' } });
    
    const addBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(addBtn);
    
    expect(props.onDecisionsChange).toHaveBeenCalled();
  });

  it('removes decision when X clicked', () => {
    const props = defaultProps();
    props.decisions = [createDecision({ id: 'd1', text: 'Remove me' })];
    render(<MbrDecisionsStep {...props} />);
    
    expect(screen.getByText('Remove me')).toBeInTheDocument();
  });

  it('renders previous MBR pending items section', () => {
    const props = defaultProps();
    props.previousMbrPendingItems = [
      createDecision({ id: 'prev-1', text: 'Pending from last MBR', category: 'next_step' }),
    ];
    render(<MbrDecisionsStep {...props} />);
    
    expect(screen.getByText(/pendências do mbr anterior/i)).toBeInTheDocument();
    expect(screen.getByText('Pending from last MBR')).toBeInTheDocument();
  });

  it('does not show pending section when empty', () => {
    render(<MbrDecisionsStep {...defaultProps()} />);
    expect(screen.queryByText(/pendências do mbr anterior/i)).not.toBeInTheDocument();
  });

  it('calls onContinue when primary clicked', () => {
    const props = defaultProps();
    render(<MbrDecisionsStep {...props} />);
    screen.getByTestId('primary-btn').click();
    expect(props.onContinue).toHaveBeenCalledOnce();
  });

  it('calls onBack when back clicked', () => {
    const props = defaultProps();
    render(<MbrDecisionsStep {...props} />);
    screen.getByTestId('back-btn').click();
    expect(props.onBack).toHaveBeenCalledOnce();
  });

  it('displays decision count in header', () => {
    const props = defaultProps();
    props.decisions = [createDecision(), createDecision({ id: '2' })];
    render(<MbrDecisionsStep {...props} />);
    expect(screen.getByText(/2 registro/)).toBeInTheDocument();
  });

  it('passes showReclassify to DecisionCard', () => {
    const props = defaultProps();
    props.decisions = [createDecision({ id: 'd1', text: 'Test' })];
    render(<MbrDecisionsStep {...props} />);
    expect(screen.getByTestId('reclassify-badge')).toBeInTheDocument();
  });

  it('preserves owner and deadline on update', () => {
    const props = defaultProps();
    props.decisions = [
      createDecision({ id: 'd1', text: 'With owner', owner: { id: 'u1', name: 'John' }, deadline: '2025-12-31' }),
    ];
    render(<MbrDecisionsStep {...props} />);
    
    fireEvent.click(screen.getByTestId('update-d1'));
    
    const updatedDecisions = props.onDecisionsChange.mock.calls[0][0];
    expect(updatedDecisions[0].owner).toEqual({ id: 'u1', name: 'John' });
    expect(updatedDecisions[0].deadline).toBe('2025-12-31');
  });
});
