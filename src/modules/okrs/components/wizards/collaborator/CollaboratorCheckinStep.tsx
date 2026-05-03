/**
 * CollaboratorCheckinStep — Etapa de check-in de KRs do Wizard Colaborador
 *
 * Alinhado visualmente ao modal `CheckinDialog` (drawer /okrs):
 * reaproveita os blocos centralizados em `src/modules/okrs/components/checkin/`.
 *
 * Decisão TCR: este fluxo grava `okr_checkins.comments` como TEXTO PURO.
 * Menções (@) NÃO são processadas aqui — apenas no `CheckinDialog`.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft, SkipForward, Sparkles, Target } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  WizardStepScaffold,
  WizardStepHeader,
  WizardStepFooter,
} from '@/modules/okrs/components/wizards/shared';
import { AlertBanner } from '../shared/AlertBanner';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { statusToConfidence } from '@/modules/okrs/hooks/useCreateCheckin';
import { usePrimaryKpiForKr } from '@/modules/okrs/hooks';
import {
  CheckinContextBlock,
  CheckinProgressBlock,
  CheckinStatusSelector,
  CheckinReflectionBlock,
  type CheckinKrData,
  type CheckinStatus,
} from '@/modules/okrs/components/checkin';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { CollaboratorCheckinResult } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorCheckinStepProps {
  kr?: WizardKr;
  currentIndex?: number;
  totalCount?: number;
  onComplete: (result: CollaboratorCheckinResult) => void;
  onSkip: () => void;
  onBack: () => void;
  /**
   * Avança para o próximo step quando o usuário não tem KRs sob sua
   * responsabilidade (modo empty state). Quando há KRs, este callback é
   * ignorado — a navegação acontece via `onComplete`/`onSkip`.
   */
  onContinue?: () => void;
}

// ============================================================
// HELPERS
// ============================================================

/** Adapta `WizardKr` para o formato `CheckinKrData` esperado pelos blocos. */
function toCheckinKrData(kr: WizardKr): CheckinKrData {
  return {
    id: kr.id,
    title: kr.title,
    baseline: kr.baseline,
    current_value: kr.current_value,
    target: kr.target,
    direction: kr.direction,
    unit: kr.unit,
    status: kr.status,
    team_id: kr.team_id,
    team_name: kr.team_name,
    last_checkin_at: kr.last_checkin_at,
    owner: kr.owner_name
      ? { display_name: kr.owner_name, photo_url: kr.owner_photo }
      : undefined,
    team_objective: kr.objective_title
      ? { title: kr.objective_title }
      : undefined,
  };
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorCheckinStep({
  kr,
  currentIndex,
  totalCount,
  onComplete,
  onSkip,
  onBack,
}: CollaboratorCheckinStepProps) {
  // KPI primária — bloqueia input de valor
  const { hasPrimaryKpi, primaryKpi } = usePrimaryKpiForKr(kr.id, 'team');
  const isAutomatic = hasPrimaryKpi;

  // Form state — alinhado ao CheckinDialog
  const [currentValue, setCurrentValue] = useState<string>(String(kr.current_value));
  const [status, setStatus] = useState<CheckinStatus>(
    kr.status === 'not_started' ? 'green' : (kr.status as CheckinStatus),
  );
  const [reflection, setReflection] = useState('');
  const [nextStep, setNextStep] = useState('');

  // Reset ao trocar de KR
  useEffect(() => {
    setCurrentValue(String(kr.current_value));
    setStatus(kr.status === 'not_started' ? 'green' : (kr.status as CheckinStatus));
    setReflection('');
    setNextStep('');
  }, [kr.id, kr.current_value, kr.status]);

  const krData = useMemo(() => toCheckinKrData(kr), [kr]);

  const trimmedReflection = reflection.trim();
  const canSubmit = trimmedReflection.length >= 10;
  const isLast = currentIndex === totalCount - 1;

  // Salvar — apenas bufferiza no draft. Persistência (`okr_checkins.insert`)
  // acontece SOMENTE no Concluir do Summary (handleComplete em CollaboratorCheckinPage).
  // `comments` segue o formato do CheckinDialog para preservar o histórico.
  const handleSave = useCallback(() => {
    if (!canSubmit) return;

    const numericValue = isAutomatic ? kr.current_value : parseFloat(currentValue) || 0;
    const composedComments = nextStep.trim()
      ? `${trimmedReflection}\n\n📌 Próximo passo: ${nextStep.trim()}`
      : trimmedReflection;
    const confidence = statusToConfidence(status);

    const result: CollaboratorCheckinResult = {
      krId: kr.id,
      previousValue: kr.current_value,
      newValue: numericValue,
      confidence,
      comment: composedComments,
      skipped: false,
    };
    onComplete(result);
  }, [
    canSubmit,
    isAutomatic,
    kr,
    currentValue,
    nextStep,
    trimmedReflection,
    status,
    onComplete,
  ]);

  const handleSkip = useCallback(() => {
    onComplete({
      krId: kr.id,
      previousValue: kr.current_value,
      newValue: kr.current_value,
      confidence: 'medium',
      skipped: true,
    });
  }, [kr, onComplete]);

  // Atalho Ctrl/Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, canSubmit]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Progress indicator */}
      <div className="px-6 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Check-in de Progresso — KR {currentIndex + 1} de {totalCount}
          </span>
          <Badge variant="outline">
            {Math.round((currentIndex / totalCount) * 100)}% concluído
          </Badge>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Alerts */}
        {kr.is_pending && kr.days_since_checkin > 14 && (
          <AlertBanner
            type="no_update"
            description={`Este KR está há ${kr.days_since_checkin} dias sem atualização.`}
          />
        )}
        {kr.is_pending && kr.days_since_checkin <= 14 && kr.days_since_checkin > 7 && (
          <AlertBanner
            type="overdue"
            description={`Última atualização há ${kr.days_since_checkin} dias.`}
          />
        )}

        {/* AskToVic helper (mantido) */}
        <div className="flex justify-end">
          <AskToVicStepHelper
            context={{
              module: 'okrs',
              wizard: 'collaborator',
              step: 'kr-review',
              userRole: 'colaborador',
              krTitle: kr.title,
              objectiveTitle: kr.objective_title,
              currentValue: kr.current_value,
              targetValue: kr.target,
              progress: kr.progress,
              teamName: kr.team_name,
            }}
          />
        </div>

        {/* BLOCO 1 — Contexto */}
        <CheckinContextBlock kr={krData} />

        <Separator />

        {/* BLOCO 2 — Progresso */}
        <CheckinProgressBlock
          kr={krData}
          currentValue={currentValue}
          status={status}
          isAutomatic={isAutomatic}
          onValueChange={setCurrentValue}
          primaryKpi={primaryKpi}
        />

        <Separator />

        {/* BLOCO 3 — Status */}
        <CheckinStatusSelector status={status} onStatusChange={setStatus} />

        <Separator />

        {/* BLOCO 4 + 5 — Reflexão + Próximo passo (sem mentions, conforme TCR) */}
        <CheckinReflectionBlock
          reflection={reflection}
          nextStep={nextStep}
          onReflectionChange={(v) => setReflection(v)}
          onNextStepChange={setNextStep}
          enableMentions={false}
        />
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button
            variant="outline"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Pular
          </Button>

          <Button
            onClick={handleSave}
            disabled={!canSubmit}
            className="flex-1"
          >
            {isLast ? 'Revisar' : 'Próximo'}
            {!isLast && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {canSubmit ? (
            <>
              Atalho: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> +{' '}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> para salvar
            </>
          ) : (
            <>Reflexão obrigatória (mín. 10 caracteres) para concluir.</>
          )}
        </p>
      </div>
    </div>
  );
}
