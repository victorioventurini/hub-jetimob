/**
 * InlineDecisionInput - Componente compacto para registrar decisões em qualquer step do wizard.
 *
 * Wrapper fino sobre `InlineCollapsibleEntryInput` que injeta as 4 categorias
 * canônicas de `TeamCheckinDecision` (decision | focus_adjustment | next_step
 * | strategic_proposal). Mantém a API pública existente — todos os 19+
 * consumidores continuam funcionando sem mudanças.
 *
 * Filtra e exibe somente decisions com sourceStep correspondente.
 */

import { Lightbulb } from 'lucide-react';
import { DecisionCard } from './DecisionCard';
import {
  InlineCollapsibleEntryInput,
  type CategoryConfig,
} from './InlineCollapsibleEntryInput';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface InlineDecisionInputProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  sourceStep: string;
  placeholder?: string;
  /**
   * v3.0.0 — Fábrica opcional de metadata. Quando presente, é chamada no
   * momento da criação de cada decisão e o retorno é gravado em
   * `decision.metadata` para auditoria (ex: `{ source: 'kpi_gate', ... }`).
   */
  metadataFactory?: () => Record<string, unknown> | undefined;
}

// ============================================================
// CONSTANTS
// ============================================================

const DECISION_CATEGORIES: ReadonlyArray<CategoryConfig<TeamCheckinDecision['category']>> = [
  { value: 'decision', label: 'Decisão', activeClassName: 'bg-status-blue-muted text-status-blue' },
  { value: 'focus_adjustment', label: 'Ajuste de Foco', activeClassName: 'bg-status-purple-muted text-status-purple' },
  { value: 'next_step', label: 'Próximo Passo', activeClassName: 'bg-status-green-muted text-status-green' },
  { value: 'strategic_proposal', label: 'Proposta Estratégica', activeClassName: 'bg-status-amber-muted text-status-amber' },
];

// ============================================================
// COMPONENT
// ============================================================

export function InlineDecisionInput({
  decisions,
  onDecisionsChange,
  sourceStep,
  placeholder = 'Registrar decisão, ajuste de foco ou próximo passo...',
  metadataFactory,
}: InlineDecisionInputProps) {
  // Filter decisions for this step
  const stepDecisions = decisions.filter((d) => d.sourceStep === sourceStep);

  const handleAdd = (text: string, category: TeamCheckinDecision['category']) => {
    const metadata = metadataFactory?.();
    const newDecision: TeamCheckinDecision = {
      id: `decision-${Date.now()}`,
      text,
      category,
      sourceStep: sourceStep as TeamCheckinDecision['sourceStep'],
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
    };
    onDecisionsChange([...decisions, newDecision]);
  };

  const handleUpdate = (id: string, updates: Partial<TeamCheckinDecision>) => {
    onDecisionsChange(decisions.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const handleRemove = (id: string) => {
    onDecisionsChange(decisions.filter((d) => d.id !== id));
  };

  return (
    <InlineCollapsibleEntryInput<TeamCheckinDecision, TeamCheckinDecision['category']>
      items={stepDecisions}
      categories={DECISION_CATEGORIES}
      defaultCategory="decision"
      onAdd={handleAdd}
      triggerIcon={Lightbulb}
      triggerLabel="Registrar nota / decisão"
      placeholder={placeholder}
      renderItem={(decision) => (
        <DecisionCard
          key={decision.id}
          decision={decision}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          showReclassify
          showOwnerDeadline
        />
      )}
    />
  );
}

// Mantém ícones importados originalmente referenciados (no-op runtime).
// `Target` e `CheckCircle2` eram usados pelo objeto de configuração antes do refactor;
// preservados como import morto controlado para evitar regressão silenciosa em futuras edições.
void Target;
void CheckCircle2;
