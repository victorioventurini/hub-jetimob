/**
 * CollaboratorWeekActivity — Card "Sua semana até aqui"
 *
 * Read-only. Sem CTA, sem links. Mostra:
 *   - Seção 1: o que o colaborador já fez nesta semana (KPIs, projetos,
 *     iniciativas, KRs, bloqueios registrados).
 *   - Seção 2: o que ainda falta (mesmas fontes que a trilha do Step 1).
 *
 * Os números devem bater 1:1 com `CollaboratorCheckinTrail` — ambos derivam
 * dos mesmos hooks (`useCollaboratorWeekActivity` para este card; trilha
 * deriva de `useCollaboratorOpeningSignals`/`useCollaboratorInitiativesSignal`).
 */

import { memo } from 'react';
import {
  BarChart3,
  FolderKanban,
  Rocket,
  Target,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useCollaboratorWeekActivity,
  type WeekActivityRow,
  type WeekActivityType,
} from './hooks/useCollaboratorWeekActivity';
import type { WizardKr } from '@/modules/okrs/hooks';
import type { KpiForWizard } from '@/modules/kpis/hooks';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// ============================================================
// CONFIG
// ============================================================

interface ActivityVisual {
  icon: LucideIcon;
  iconClass: string;
  buildLabel: (count: number) => string;
}

const ACTIVITY_VISUALS: Record<WeekActivityType, ActivityVisual> = {
  kpis: {
    icon: BarChart3,
    iconClass: 'text-primary',
    buildLabel: (n) => (n === 1 ? 'Atualizou 1 indicador' : `Atualizou ${n} indicadores`),
  },
  projects: {
    icon: FolderKanban,
    iconClass: 'text-status-green',
    buildLabel: (n) =>
      n === 1 ? 'Marcou 1 milestone como concluído' : `Marcou ${n} milestones como concluídos`,
  },
  initiatives: {
    icon: Rocket,
    iconClass: 'text-primary',
    buildLabel: (n) => (n === 1 ? 'Atualizou 1 iniciativa' : `Atualizou ${n} iniciativas`),
  },
  krs: {
    icon: Target,
    iconClass: 'text-primary',
    buildLabel: (n) => `Fez check-in em ${n} ${n === 1 ? 'KR' : 'KRs'}`,
  },
  blockers_registered: {
    icon: AlertTriangle,
    iconClass: 'text-status-orange',
    buildLabel: (n) => (n === 1 ? 'Registrou 1 bloqueio' : `Registrou ${n} bloqueios`),
  },
};

// ============================================================
// COMPONENT
// ============================================================

export interface CollaboratorWeekActivityProps {
  effectiveUserId: string | null;
  cycleId: string | null;
  krs: WizardKr[];
  kpisToUpdate: (KpiForWizard | KpiForWizardV2)[];
  className?: string;
}

function CollaboratorWeekActivityImpl({
  effectiveUserId,
  cycleId,
  krs,
  kpisToUpdate,
  className,
}: CollaboratorWeekActivityProps) {
  const { activities, pending, hasAnyActivity, isAllCaughtUp, isLoading } =
    useCollaboratorWeekActivity({ effectiveUserId, cycleId, krs, kpisToUpdate });

  if (isLoading) {
    return (
      <section className={cn('rounded-lg border bg-card p-5', className)} aria-busy="true">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="border-t border-border/60 my-4" />
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </section>
    );
  }

  return (
    <section
      className={cn('rounded-lg border bg-card p-5', className)}
      aria-label="Sua semana até aqui"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Sua semana até aqui</h3>

      {/* Seção 1 — O que já foi feito */}
      {hasAnyActivity ? (
        <ul className="space-y-3">
          {activities.map((row) => (
            <ActivityLine key={row.type} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ainda não há atividade registrada esta semana.
        </p>
      )}

      {/* Separador */}
      <div className="border-t border-border/60 my-4" aria-hidden />

      {/* Seção 2 — O que ainda falta */}
      {isAllCaughtUp ? (
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-foreground">Tudo em dia esta semana</p>
            <p className="text-muted-foreground">Revise e confirme no check-in.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground mb-2">
            {hasAnyActivity ? 'Ainda falta:' : 'Para revisar:'}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {pending.map((row) => (
              <li key={row.type}>{row.label}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ============================================================
// SUB-COMPONENT
// ============================================================

interface ActivityLineProps {
  row: WeekActivityRow;
}

function ActivityLine({ row }: ActivityLineProps) {
  const visual = ACTIVITY_VISUALS[row.type];
  const Icon = visual.icon;

  return (
    <li className="flex items-start gap-3">
      <Icon className={cn('h-4 w-4 shrink-0 mt-1', visual.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{visual.buildLabel(row.count)}</p>
        {(row.itemNames.length > 0 || row.extraInfo) && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {row.itemNames.join(' · ')}
            {row.remainingCount > 0 && row.itemNames.length > 0 ? (
              <> e mais {row.remainingCount}</>
            ) : null}
            {row.extraInfo ? (
              <>
                {row.itemNames.length > 0 ? ' · ' : ''}
                {row.extraInfo}
              </>
            ) : null}
          </p>
        )}
      </div>
    </li>
  );
}

export const CollaboratorWeekActivity = memo(CollaboratorWeekActivityImpl);
