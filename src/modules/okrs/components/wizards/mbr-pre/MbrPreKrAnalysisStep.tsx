/**
 * MbrPreKrAnalysisStep — Step 4 do Pré-MBR (KRs do Time)
 *
 * Rito REFLEXIVO: NÃO atualiza `okr_checkins`, NÃO altera `current_value` nem
 * `status` do KR. Apenas captura justificativas no draft (`krJustifications`).
 *
 * UX: 1 KR por página (mesmo padrão do Check-in Individual /
 * `CollaboratorCheckinStep` e do `QbrKpiAnalysisStep` paginado).
 *
 * Composição (sem duplicação) — reusa blocos canônicos:
 * - `CheckinContextBlock` — Objetivo + KR + RAG + último check-in (read-only nativo)
 * - `CheckinProgressBlock` em `readOnly` — Anterior → Meta + barra (sem input)
 * - `JustificationField` (shared/wizards) — entrada do plano de ação
 * - `WizardStepScaffold/Header/Footer` (shared/wizards)
 * - `KR_STATE_CONFIG` (`useKrStateInsights`) — SSOT de severidade/cores/labels
 * - `useEntityLookup` — Onda 4 Fase 2 (não lê `krTitle` legado de snapshots)
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Target, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepScaffold,
  WizardStepFooter,
  JustificationField,
} from '../shared';
import {
  CheckinContextBlock,
  CheckinProgressBlock,
  type CheckinKrData,
  type CheckinStatus,
} from '@/modules/okrs/components/checkin';
import {
  KR_STATE_CONFIG,
  type KrState,
  type KrStateSeverity,
} from '@/modules/okrs/hooks/useKrStateInsights';
import { useEntityLookup } from '@/modules/okrs/hooks/useEntityLookup';
import type { MbrPreDraftData } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type KrFinalState = MbrPreDraftData['krFinalStates'][number];

/**
 * Subset mínimo de `okr_team_objectives` + `key_results` necessário para
 * compor o `CheckinKrData`. Tipado liberalmente para aceitar o shape vindo
 * do `useQuery` em `MbrPrePage` (com `_isContributed`).
 */
export interface MbrPreKrSourceObjective {
  id: string;
  title: string;
  key_results?: Array<{
    id: string;
    title: string;
    baseline: number | string | null;
    current_value: number | string | null;
    target: number | string | null;
    direction: 'up' | 'down' | 'maintain' | null;
    unit: string | null;
    last_checkin_at?: string | null;
    status?: string | null;
  }>;
  _isContributed?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

function getSeverity(state: string): KrStateSeverity {
  return KR_STATE_CONFIG[state as KrState]?.severity ?? 'info';
}

/**
 * Estados que exigem justificativa no Pré-MBR:
 * - `critical` / `warning` (canônico)
 * - `not_started` — KR sem progresso também precisa ser explicado
 */
function requiresJustification(state: string): boolean {
  if (state === 'not_started') return true;
  const sev = getSeverity(state);
  return sev === 'critical' || sev === 'warning';
}

function ragFromState(state: string): CheckinStatus {
  // Mapeia estado de KR → bucket RAG aceito por CheckinProgressBlock.
  const sev = getSeverity(state);
  if (sev === 'critical') return 'red';
  if (sev === 'warning') return 'yellow';
  return 'green';
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

// ============================================================
// COMPONENT
// ============================================================

export interface MbrPreKrAnalysisStepProps {
  krFinalStates: KrFinalState[];
  /**
   * Lista de objetivos com KRs carregados pela page (não persistido no draft).
   * Usado para preencher Anterior/Meta/Direção/Unidade e compor o
   * `CheckinKrData` reutilizando os blocos canônicos do Check-in Individual.
   */
  sourceObjectives?: MbrPreKrSourceObjective[];
  krJustifications: Record<string, string>;
  onKrJustificationChange: (krId: string, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

function MbrPreKrAnalysisStepImpl({
  krFinalStates,
  sourceObjectives = [],
  krJustifications,
  onKrJustificationChange,
  onContinue,
  onBack,
}: MbrPreKrAnalysisStepProps) {
  // ── Lookups (Onda 4 Fase 2) ──────────────────────────────────
  const krIds = useMemo(
    () => krFinalStates.map((k) => k.krId).filter(Boolean),
    [krFinalStates],
  );
  const objectiveIds = useMemo(
    () => Array.from(new Set(krFinalStates.map((k) => k.objectiveId).filter(Boolean))),
    [krFinalStates],
  );

  const lookups = useEntityLookup({
    teamKrIds: krIds,
    orgKrIds: krIds,
    teamObjectiveIds: objectiveIds,
    orgObjectiveIds: objectiveIds,
  });

  const resolveKrName = useCallback(
    (id: string, legacy?: string) =>
      lookups.teamKrs.get(id)?.name ??
      lookups.orgKrs.get(id)?.name ??
      legacy ??
      '(KR removido)',
    [lookups.teamKrs, lookups.orgKrs],
  );

  const resolveObjectiveName = useCallback(
    (id: string) =>
      lookups.teamObjectives.get(id)?.name ??
      lookups.orgObjectives.get(id)?.name ??
      '(Objetivo)',
    [lookups.teamObjectives, lookups.orgObjectives],
  );

  // ── Index de KRs do source para popular CheckinKrData ─────────
  const krSourceById = useMemo(() => {
    const map = new Map<string, MbrPreKrSourceObjective['key_results'][number] & { objectiveTitle: string }>();
    for (const obj of sourceObjectives) {
      for (const kr of obj.key_results ?? []) {
        map.set(kr.id, { ...kr, objectiveTitle: obj.title });
      }
    }
    return map;
  }, [sourceObjectives]);

  // ── Ordenação: primeiro os que exigem justificativa ──────────
  const orderedKrs = useMemo(() => {
    const needs = krFinalStates.filter((k) => requiresJustification(k.state));
    const rest = krFinalStates.filter((k) => !requiresJustification(k.state));
    return [...needs, ...rest];
  }, [krFinalStates]);

  // ── Pagination state ─────────────────────────────────────────
  const totalCount = orderedKrs.length;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Se a lista mudar (re-seed), clamp do índice.
  useEffect(() => {
    if (currentIndex > totalCount - 1) setCurrentIndex(Math.max(0, totalCount - 1));
  }, [totalCount, currentIndex]);

  const currentKr = orderedKrs[currentIndex];

  // ── Counters ─────────────────────────────────────────────────
  const needsJustifyCount = useMemo(
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

  // ── Empty state ──────────────────────────────────────────────
  if (totalCount === 0) {
    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={Target}
            title="KRs do Time"
            tooltip="mbr-pre-krs"
            description="Reflita sobre KRs fora da meta ou não iniciados — justifique e descreva o plano de ação"
            variant="amber"
          />
        }
        footer={
          <WizardStepFooter
            onBack={onBack}
            primaryLabel="Continuar"
            onPrimary={onContinue}
          />
        }
      >
        <div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
          <EmptyState
            icon={Target}
            title="Nenhum KR vinculado"
            description="Este time não possui KRs ativos no ciclo atual."
          />
        </div>
      </WizardStepScaffold>
    );
  }

  // Em algum momento o currentKr pode estar undefined entre re-renderizações.
  if (!currentKr) return null;

  return (
    <MbrPreKrPage
      kr={currentKr}
      krSource={krSourceById.get(currentKr.krId)}
      krName={resolveKrName(currentKr.krId, currentKr.krTitle)}
      objectiveName={resolveObjectiveName(currentKr.objectiveId)}
      currentIndex={currentIndex}
      totalCount={totalCount}
      needsJustifyCount={needsJustifyCount}
      missingJustifications={missingJustifications}
      justification={krJustifications[currentKr.krId] ?? ''}
      onJustificationChange={(v) => onKrJustificationChange(currentKr.krId, v)}
      onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
      onNext={() => setCurrentIndex((i) => Math.min(totalCount - 1, i + 1))}
      onBack={onBack}
      onContinue={onContinue}
    />
  );
}

export const MbrPreKrAnalysisStep = memo(MbrPreKrAnalysisStepImpl);

// ============================================================
// PAGE — 1 KR por vez (memoizada)
// ============================================================

interface MbrPreKrPageProps {
  kr: KrFinalState;
  krSource?: (MbrPreKrSourceObjective['key_results'][number] & { objectiveTitle: string }) | undefined;
  krName: string;
  objectiveName: string;
  currentIndex: number;
  totalCount: number;
  needsJustifyCount: number;
  missingJustifications: number;
  justification: string;
  onJustificationChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
  onContinue: () => void;
}

const MbrPreKrPage = memo(function MbrPreKrPage({
  kr,
  krSource,
  krName,
  objectiveName,
  currentIndex,
  totalCount,
  needsJustifyCount,
  missingJustifications,
  justification,
  onJustificationChange,
  onPrev,
  onNext,
  onBack,
  onContinue,
}: MbrPreKrPageProps) {
  const config = KR_STATE_CONFIG[kr.state as KrState];
  const needsJustification = requiresJustification(kr.state);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalCount - 1;
  const justOk = !needsJustification || (justification ?? '').trim().length > 0;

  // Compõe CheckinKrData a partir do snapshot + dados da page.
  const krData: CheckinKrData = useMemo(() => ({
    id: kr.krId,
    title: krName,
    baseline: num(krSource?.baseline),
    current_value: num(krSource?.current_value),
    target: num(krSource?.target, num(krSource?.baseline)),
    direction: (krSource?.direction ?? 'up') as 'up' | 'down' | 'maintain',
    unit: krSource?.unit ?? '',
    status: ragFromState(kr.state) as any,
    team_id: '',
    last_checkin_at: krSource?.last_checkin_at ?? null,
    team_objective: { title: objectiveName },
  }), [kr.krId, kr.state, krName, objectiveName, krSource]);

  const ragStatus: CheckinStatus = ragFromState(kr.state);

  const handlePrimary = useCallback(() => {
    if (!justOk) return;
    if (isLast) onContinue();
    else onNext();
  }, [justOk, isLast, onContinue, onNext]);

  // Atalho Ctrl/Cmd+Enter — paridade com CollaboratorCheckinStep
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && justOk) {
        handlePrimary();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrimary, justOk]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="KRs do Time"
          tooltip="mbr-pre-krs"
          description="Reflita sobre KRs fora da meta ou não iniciados — justifique e descreva o plano de ação"
          variant="amber"
          badge={`${needsJustifyCount} a justificar`}
        />
      }
    >
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {/* Progress indicator (igual ao Check-in Individual) */}
        <div className="px-6 py-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Análise de KR — {currentIndex + 1} de {totalCount}
            </span>
            <Badge variant="outline">
              {Math.round(((currentIndex + (justOk ? 1 : 0)) / totalCount) * 100)}% concluído
            </Badge>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Este momento é <strong>reflexivo</strong>. Não atualize check-ins aqui —
            apenas explique o que aconteceu com cada KR fora da meta ou ainda não iniciado.
          </p>

          {missingJustifications > 0 && needsJustification && !justification.trim() && (
            <div
              className={cn(
                'rounded-md border border-warning/40 bg-warning/10 p-3',
                'text-xs text-warning-foreground flex items-start gap-2',
              )}
            >
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p>
                <strong>{missingJustifications}</strong> KR{missingJustifications > 1 ? 's' : ''} sem
                justificativa (fora da meta ou não iniciado). Preencha para avançar.
              </p>
            </div>
          )}

          {!needsJustification && (
            <div
              className={cn(
                'rounded-md border border-status-green/30 bg-status-green/5 p-3',
                'text-sm text-foreground flex items-start gap-2',
              )}
            >
              <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
              KR dentro do esperado — apenas leitura.
            </div>
          )}

          {/* Badge de estado canônico + contribuído */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-[11px]', config?.borderClass, config?.colorClass)}
            >
              {config?.label ?? kr.state}
            </Badge>
            {kr.isContributed && (
              <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">
                Contribuído
              </Badge>
            )}
          </div>

          {/* BLOCO 1 — Contexto (reuso canônico) */}
          <CheckinContextBlock kr={krData} />

          <Separator />

          {/* BLOCO 2 — Progresso (read-only — sem input nem banner de KPI primária) */}
          <CheckinProgressBlock
            kr={krData}
            currentValue={String(krData.current_value)}
            status={ragStatus}
            isAutomatic={false}
            onValueChange={() => { /* noop — readOnly */ }}
            readOnly
          />

          {needsJustification && (
            <>
              <Separator />
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
                onChange={onJustificationChange}
              />
            </>
          )}
        </div>

        {/* Footer actions (igual ao CollaboratorCheckinStep) */}
        <div className="px-6 py-4 border-t bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={isFirst ? onBack : onPrev}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isFirst ? 'Voltar' : 'Anterior'}
            </Button>

            <Button onClick={handlePrimary} disabled={!justOk} className="flex-1">
              {isLast ? 'Concluir' : 'Próximo'}
              {!isLast && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            {justOk ? (
              <>
                Atalho: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> +{' '}
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> para avançar
              </>
            ) : (
              <>Justificativa obrigatória para avançar.</>
            )}
          </p>
        </div>
      </div>
    </WizardStepScaffold>
  );
});
