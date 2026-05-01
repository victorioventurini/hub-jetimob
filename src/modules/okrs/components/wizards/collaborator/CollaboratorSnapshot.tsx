/**
 * CollaboratorSnapshot — "Seu retrato da semana"
 *
 * Visualização compacta e SEM AÇÃO do estado do colaborador no Step 1
 * do Check-in Individual. Três linhas (KRs / KPIs / Projetos) com
 * bolinhas proporcionais + linha condicional de sinais (bloqueios,
 * confiança média).
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface SnapshotInputs {
  krsTotal: number;
  krsOnTrack: number;
  kpisTotal: number;
  kpisUpdated: number;
  projectsTotal: number;
  projectsHealthy: number;
  /** Bloqueios abertos vindos de check-ins anteriores (não resolvidos). */
  openBlocksCount?: number;
  /** Confiança média nos KRs (alta=3, média=2, baixa=1). */
  avgConfidence?: 'high' | 'medium' | 'low' | null;
}

export interface CollaboratorSnapshotProps extends SnapshotInputs {
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

const MAX_DOTS = 8;
const MIN_DOTS = 5;

function dotCount(total: number): number {
  if (total <= 0) return MIN_DOTS;
  if (total <= MIN_DOTS) return MIN_DOTS;
  return Math.min(total, MAX_DOTS);
}

function filledCount(filled: number, total: number, dots: number): number {
  if (total <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, filled / total));
  return Math.round(ratio * dots);
}

const CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

// ============================================================
// SUBCOMPONENT
// ============================================================

interface DotMeterRowProps {
  label: string;
  filled: number;
  total: number;
  summary: string;
}

const DotMeterRow = memo(function DotMeterRow({ label, filled, total, summary }: DotMeterRowProps) {
  const dots = dotCount(total);
  const f = filledCount(filled, total, dots);
  return (
    <div className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-1.5" aria-label={`${filled} de ${total}`}>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              i < f ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">{summary}</span>
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

function CollaboratorSnapshotImpl({
  krsTotal, krsOnTrack,
  kpisTotal, kpisUpdated,
  projectsTotal, projectsHealthy,
  openBlocksCount = 0,
  avgConfidence = null,
  className,
}: CollaboratorSnapshotProps) {
  const signals = useMemo(() => {
    const items: string[] = [];
    if (openBlocksCount > 0) {
      items.push(
        `${openBlocksCount} ${openBlocksCount === 1 ? 'bloqueio aberto' : 'bloqueios abertos'}`,
      );
    }
    if (avgConfidence && avgConfidence !== 'high') {
      items.push(`Confiança média nos KRs: ${CONFIDENCE_LABEL[avgConfidence]}`);
    }
    return items;
  }, [openBlocksCount, avgConfidence]);

  return (
    <section className={cn('rounded-lg border bg-card p-5', className)} aria-label="Seu retrato da semana">
      <h3 className="text-sm font-semibold text-foreground mb-4">Seu retrato da semana</h3>
      <div className="space-y-3">
        <DotMeterRow
          label="KRs"
          filled={krsOnTrack}
          total={krsTotal}
          summary={krsTotal > 0 ? `${krsOnTrack} de ${krsTotal} em dia` : 'Sem KRs'}
        />
        <DotMeterRow
          label="KPIs"
          filled={kpisUpdated}
          total={kpisTotal}
          summary={kpisTotal > 0 ? `${kpisUpdated} de ${kpisTotal} atualizados` : 'Sem KPIs'}
        />
        <DotMeterRow
          label="Projetos"
          filled={projectsHealthy}
          total={projectsTotal}
          summary={projectsTotal > 0 ? `${projectsHealthy} de ${projectsTotal} saudáveis` : 'Sem projetos'}
        />
      </div>

      {signals.length > 0 && (
        <div className="mt-4 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-status-amber" />
          <span>{signals.join(' · ')}</span>
        </div>
      )}
    </section>
  );
}

export const CollaboratorSnapshot = memo(CollaboratorSnapshotImpl);
