/**
 * CollaboratorCheckinTrail — "Seu check-in hoje"
 *
 * Trilha visual com as etapas do Check-in Individual: nome, resumo e
 * tempo estimado. Único CTA da página é "Começar →".
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface TrailStepInput {
  label: string;
  /** Quantidade de itens que precisam atenção. 0 ⇒ "Tudo em dia". */
  pendingCount: number;
  /** Total de itens (para etapas que mostram "X de Y saudáveis"). */
  total?: number;
  /** Substitui o resumo automático (caso a etapa não tenha contagem). */
  summaryOverride?: string;
  etaMinutes: number;
}

export interface CollaboratorCheckinTrailProps {
  steps: TrailStepInput[];
  /**
   * Quando informado, renderiza o CTA "Começar" no rodapé interno da trilha.
   * Se omitido, o consumidor assume o CTA via WizardStepFooter (padrão atual).
   */
  onStart?: () => void;
  startLabel?: string;
  className?: string;
}

// ============================================================
// ETA HELPER (puro, exportado para testes)
// ============================================================

export interface ComputeEtaArgs {
  pendingKpis: number;
  attentionKrs: number;
  pendingProjectMilestones: number;
  attentionInitiatives?: number;
}

/**
 * Regras do prompt:
 * - Indicadores: 1 min base + 0.5 min por KPI pendente
 * - Projetos: 1 min base + 0.5 min por projeto com milestone pendente
 * - Iniciativas: 1 min base + 0.5 min por iniciativa em atenção
 * - KRs: 2 min base + 1 min por KR em atenção
 * - Reflexão: 2 min fixo
 */
export function computeTrailEta({
  pendingKpis,
  attentionKrs,
  pendingProjectMilestones,
  attentionInitiatives = 0,
}: ComputeEtaArgs): {
  kpis: number;
  krs: number;
  projects: number;
  initiatives: number;
  reflection: number;
  total: number;
} {
  const kpis = Math.ceil(1 + 0.5 * Math.max(0, pendingKpis));
  const krs = Math.ceil(2 + 1 * Math.max(0, attentionKrs));
  const projects = Math.ceil(1 + 0.5 * Math.max(0, pendingProjectMilestones));
  const initiatives = Math.ceil(1 + 0.5 * Math.max(0, attentionInitiatives));
  const reflection = 2;
  return {
    kpis,
    krs,
    projects,
    initiatives,
    reflection,
    total: kpis + krs + projects + initiatives + reflection,
  };
}

// ============================================================
// COMPONENT
// ============================================================

const NUMBER_GLYPHS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

function rowSummary(step: TrailStepInput): string {
  if (step.summaryOverride) return step.summaryOverride;
  if (step.total !== undefined && step.total > 0) {
    const healthy = step.total - step.pendingCount;
    return `${Math.max(0, healthy)} de ${step.total} saudáveis`;
  }
  if (step.pendingCount === 0) return 'Tudo em dia';
  return `${step.pendingCount} ${step.label.toLowerCase()} para atenção`;
}

function CollaboratorCheckinTrailImpl({
  steps,
  onStart,
  startLabel = 'Começar',
  className,
}: CollaboratorCheckinTrailProps) {
  const total = steps.reduce((sum, s) => sum + s.etaMinutes, 0);

  return (
    <section
      className={cn('rounded-lg border bg-card p-5', className)}
      aria-label="Seu check-in hoje"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Seu check-in hoje</h3>

      <ol className="space-y-2">
        {steps.map((step, idx) => (
          <li
            key={`${step.label}-${idx}`}
            className="grid grid-cols-[28px_140px_1fr_auto] items-center gap-3 py-2 border-b last:border-b-0"
          >
            <span className="text-base text-muted-foreground" aria-hidden>
              {NUMBER_GLYPHS[idx] ?? `${idx + 1}.`}
            </span>
            <span className="text-sm font-medium">{step.label}</span>
            <span className="text-sm text-muted-foreground">{rowSummary(step)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">~{step.etaMinutes} min</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tempo estimado: <span className="font-medium text-foreground">~{total} minutos</span>
        </p>
        {onStart ? (
          <Button onClick={onStart} size="lg">
            {startLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export const CollaboratorCheckinTrail = memo(CollaboratorCheckinTrailImpl);
