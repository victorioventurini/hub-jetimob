/**
 * MbrPreKrAnalysisStep — Step 4 do Pré-MBR (KRs do Time)
 *
 * Rito reflexivo: NÃO atualiza check-in nem `current_value`. O líder olha
 * cada KR fora da meta (severity `warning`/`critical`) e justifica o desvio
 * + plano de ação.
 *
 * Composição (sem duplicação):
 * - WizardStepScaffold/Header/Footer (shared)
 * - JustificationField (shared)
 * - KR_STATE_CONFIG (`useKrStateInsights`) — SSOT de severidade/cores/ícones
 * - useEntityLookup + resolveName — Onda 4 Fase 2 (não lê `krTitle` legado)
 * - Progress (shadcn) — barra simples, sem precisar de baseline/target
 */

import { memo, useMemo } from 'react';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  JustificationField,
} from '../shared';
import {
  KR_STATE_CONFIG,
  type KrState,
  type KrStateSeverity,
} from '@/modules/okrs/hooks/useKrStateInsights';
import {
  useEntityLookup,
  resolveName,
} from '@/modules/okrs/hooks/useEntityLookup';
import type { MbrPreDraftData } from '@/modules/okrs/types/wizard';

// ============================================================
// HELPERS
// ============================================================

type KrFinalState = MbrPreDraftData['krFinalStates'][number];

function getSeverity(state: string): KrStateSeverity {
  return KR_STATE_CONFIG[state as KrState]?.severity ?? 'info';
}

/**
 * Estados que exigem justificativa no Pré-MBR:
 * - severity `critical` / `warning` (canônico)
 * - `not_started` — KR sem progresso também precisa ser explicado
 *   (por que não começou + plano de ação)
 */
function requiresJustification(state: string): boolean {
  if (state === 'not_started') return true;
  const sev = getSeverity(state);
  return sev === 'critical' || sev === 'warning';
}

// ============================================================
// CARD (memoizado)
// ============================================================

interface KrCardProps {
  kr: KrFinalState;
  krName: string;
  justification: string;
  onJustificationChange: (krId: string, value: string) => void;
}

const KrCardImpl = ({ kr, krName, justification, onJustificationChange }: KrCardProps) => {
  const config = KR_STATE_CONFIG[kr.state as KrState];
  const Icon = config?.icon ?? Target;
  const needsJustification = requiresJustification(kr.state);

  const paceTone =
    kr.paceStatus === 'Atrasado'
      ? 'border-status-red/40 text-status-red'
      : kr.paceStatus === 'Atenção'
      ? 'border-status-yellow/40 text-status-yellow'
      : 'border-status-green/40 text-status-green';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 min-w-0',
        config?.borderClass ?? 'border-border',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap min-w-0">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config?.colorClass)} />
        <h3 className="text-sm font-semibold text-foreground flex-1 min-w-0 break-words">
          {krName}
        </h3>
        <Badge
          variant="outline"
          className={cn('text-[10px] gap-1', config?.borderClass, config?.colorClass)}
        >
          {config?.label ?? kr.state}
        </Badge>
        {kr.isContributed && (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
            Contribuído
          </Badge>
        )}
      </div>

      {/* Progresso */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span className="font-medium text-foreground">{kr.finalProgress}%</span>
        </div>
        <Progress value={Math.min(100, Math.max(0, kr.finalProgress))} className="h-2" />
        <div className="flex justify-end">
          <Badge variant="outline" className={cn('text-[10px]', paceTone)}>
            {kr.paceStatus}
          </Badge>
        </div>
      </div>

      {/* Justificativa (apenas para warning/critical) */}
      {needsJustification && (
        <JustificationField
          id={`mbr-pre-kr-just-${kr.krId}`}
          label={
            kr.state === 'not_started'
              ? 'Justifique por que este KR ainda não foi iniciado'
              : 'Justifique o desvio do KR'
          }
          hint={
            kr.state === 'not_started'
              ? 'Obrigatório — explique por que não começou e o plano de ação para destravar.'
              : 'Obrigatório — explique por que está fora da meta e o plano de ação.'
          }
          required
          value={justification}
          onChange={(v) => onJustificationChange(kr.krId, v)}
        />
      )}
    </div>
  );
};

const KrCard = memo(KrCardImpl);

// ============================================================
// COMPONENT
// ============================================================

export interface MbrPreKrAnalysisStepProps {
  krFinalStates: KrFinalState[];
  krJustifications: Record<string, string>;
  onKrJustificationChange: (krId: string, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function MbrPreKrAnalysisStep({
  krFinalStates,
  krJustifications,
  onKrJustificationChange,
  onContinue,
  onBack,
}: MbrPreKrAnalysisStepProps) {
  // Resolve nomes de KRs e Objetivos via lookup canônico (Onda 4)
  const krIds = useMemo(
    () => krFinalStates.map((k) => k.krId).filter(Boolean),
    [krFinalStates],
  );
  const objectiveIds = useMemo(
    () =>
      Array.from(new Set(krFinalStates.map((k) => k.objectiveId).filter(Boolean))),
    [krFinalStates],
  );

  const lookups = useEntityLookup({
    teamKrIds: krIds,
    orgKrIds: krIds,
    teamObjectiveIds: objectiveIds,
    orgObjectiveIds: objectiveIds,
  });

  const resolveKrName = (id: string, legacy?: string) =>
    lookups.teamKrs.get(id)?.name ??
    lookups.orgKrs.get(id)?.name ??
    legacy ??
    '(KR removido)';

  const resolveObjectiveName = (id: string) =>
    lookups.teamObjectives.get(id)?.name ??
    lookups.orgObjectives.get(id)?.name ??
    '(Objetivo)';

  // Agrupa KRs por objetivo (mesma lógica de QbrBalanceStep)
  const groupedByObjective = useMemo(() => {
    const map = new Map<string, KrFinalState[]>();
    for (const kr of krFinalStates) {
      const key = kr.objectiveId || '__no_objective__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(kr);
    }
    return Array.from(map.entries());
  }, [krFinalStates]);

  // Counters
  const offTrackCount = useMemo(
    () => krFinalStates.filter((kr) => requiresJustification(kr.state)).length,
    [krFinalStates],
  );

  const missingJustifications = useMemo(
    () =>
      krFinalStates.filter(
        (kr) =>
          requiresJustification(kr.state) &&
          !(krJustifications[kr.krId] ?? '').trim(),
      ).length,
    [krFinalStates, krJustifications],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="KRs do Time"
          tooltip="mbr-pre-krs"
          description="Reflita sobre KRs fora da meta — justifique o desvio e o plano de ação"
          variant="amber"
          badge={
            krFinalStates.length > 0
              ? `${offTrackCount} fora da meta`
              : undefined
          }
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={missingJustifications > 0}
        />
      }
    >
      <div className="p-4 md:p-6 space-y-4 min-w-0 max-w-full">
        <p className="text-xs text-muted-foreground">
          Este momento é <strong>reflexivo</strong>. Não atualize check-ins aqui —
          apenas explique o que aconteceu com cada KR fora da meta.
        </p>

        {missingJustifications > 0 && (
          <div
            className={cn(
              'rounded-md border border-warning/40 bg-warning/10 p-3',
              'text-xs text-warning-foreground flex items-start gap-2',
            )}
          >
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p>
              <strong>{missingJustifications}</strong> KR
              {missingJustifications > 1 ? 's' : ''} fora da meta sem justificativa.
              Preencha para avançar.
            </p>
          </div>
        )}

        {krFinalStates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
            <EmptyState
              icon={Target}
              title="Nenhum KR vinculado"
              description="Este time não possui KRs ativos no ciclo atual."
            />
          </div>
        ) : offTrackCount === 0 ? (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-md border border-status-green/30 bg-status-green/5 p-3',
                'text-sm text-foreground flex items-start gap-2',
              )}
            >
              <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
              Nenhum KR fora da meta. Você pode avançar.
            </div>
            <div className="space-y-4">
              {groupedByObjective.map(([objectiveId, krs]) => (
                <div key={objectiveId} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {resolveObjectiveName(objectiveId)}
                  </p>
                  {krs.map((kr) => (
                    <KrCard
                      key={kr.krId}
                      kr={kr}
                      krName={resolveName(lookups.teamKrs, kr.krId, kr.krTitle) ||
                        resolveKrName(kr.krId, kr.krTitle)}
                      justification={krJustifications[kr.krId] ?? ''}
                      onJustificationChange={onKrJustificationChange}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByObjective.map(([objectiveId, krs]) => (
              <div key={objectiveId} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {resolveObjectiveName(objectiveId)}
                </p>
                <div className="space-y-3">
                  {krs.map((kr) => (
                    <KrCard
                      key={kr.krId}
                      kr={kr}
                      krName={resolveKrName(kr.krId, kr.krTitle)}
                      justification={krJustifications[kr.krId] ?? ''}
                      onJustificationChange={onKrJustificationChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
