/**
 * CollaboratorCheckinStep - Etapa 2 do Wizard Colaborador
 * 
 * Atualização sequencial de cada KR:
 * - Valor atual (bloqueado se KR tem KPI primária)
 * - Confiança
 * - Comentário (opcional)
 * - Bloqueadores (opcional)
 * 
 * Com perguntas orientadoras e microcopy dinâmico.
 * 
 * REGRA: Quando KR tem KPI primária vinculada, o valor é read-only
 * e o colaborador deve atualizar a KPI correspondente.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  ArrowLeft,
  SkipForward,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Loader2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KrContextCard } from '../shared/KrContextCard';
import { MicrocopyQuestion } from '../shared/ReflectionQuestions';
import { AlertBanner } from '../shared/AlertBanner';
import { VicInsightCard } from '../shared/VicInsightCard';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { useWizardAI } from '@/modules/okrs/hooks/useWizardAI';
import { useCreateCheckin } from '@/modules/okrs/hooks/useCreateCheckin';
import { usePrimaryKpiForKr } from '@/modules/okrs/hooks/usePrimaryKpiForKr';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { CollaboratorCheckinResult } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorCheckinStepProps {
  kr: WizardKr;
  currentIndex: number;
  totalCount: number;
  onComplete: (result: CollaboratorCheckinResult) => void;
  onSkip: () => void;
  onBack: () => void;
}

type Confidence = 'high' | 'medium' | 'low';

interface ConfidenceOption {
  value: Confidence;
  label: string;
  description: string;
  icon: typeof ThumbsUp;
  colorClass: string;
}

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  {
    value: 'high',
    label: 'Alta',
    description: 'Confiante que vamos atingir',
    icon: ThumbsUp,
    colorClass: 'border-status-green bg-status-green-muted text-status-green-muted-foreground',
  },
  {
    value: 'medium',
    label: 'Média',
    description: 'Precisamos de atenção',
    icon: Minus,
    colorClass: 'border-status-yellow bg-status-yellow-muted text-status-yellow-muted-foreground',
  },
  {
    value: 'low',
    label: 'Baixa',
    description: 'Em risco de não atingir',
    icon: ThumbsDown,
    colorClass: 'border-status-red bg-status-red-muted text-status-red-muted-foreground',
  },
];

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
  // Form state
  const [currentValue, setCurrentValue] = useState<string>(String(kr.current_value));
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [comment, setComment] = useState('');
  const [blocker, setBlocker] = useState('');
  const [showBlockerField, setShowBlockerField] = useState(false);

  // Check for primary KPI (fonte única de verdade)
  const { hasPrimaryKpi, primaryKpi } = usePrimaryKpiForKr(kr.id, 'team');
  const isValueLocked = hasPrimaryKpi;

  // AI state
  const { getMicrocopy, insights, generateInsights, dismissInsight } = useWizardAI();
  const microcopy = getMicrocopy(kr);

  // Mutation
  const createCheckin = useCreateCheckin({ skipToast: true });

  // Reset form when KR changes
  useEffect(() => {
    setCurrentValue(String(kr.current_value));
    setConfidence(null);
    setComment('');
    setBlocker('');
    setShowBlockerField(false);
  }, [kr.id, kr.current_value]);

  // Generate insights for at-risk KRs
  useEffect(() => {
    if (kr.is_at_risk || kr.is_pending) {
      generateInsights({
        persona: 'collaborator',
        step: 'checkin',
        krContext: { kr },
      });
    }
  }, [kr.id]);

  // Calculate change
  const numericValue = parseFloat(currentValue) || 0;
  const change = numericValue - kr.current_value;
  const changePercent = kr.current_value !== 0 
    ? ((change / kr.current_value) * 100).toFixed(1)
    : '0';

  // New progress calculation
  const newProgress = useMemo(() => {
    const range = kr.target - kr.baseline;
    if (range === 0) return 0;
    return Math.min(100, Math.max(0, ((numericValue - kr.baseline) / range) * 100));
  }, [numericValue, kr.baseline, kr.target]);

  // Can submit
  const canSubmit = confidence !== null;
  const isLast = currentIndex === totalCount - 1;

  // Handle save
  const handleSave = useCallback(async () => {
    if (!confidence) return;

    try {
      await createCheckin.mutateAsync({
        krId: kr.id,
        currentValue: numericValue,
        previousValue: kr.current_value,
        confidence,
        comments: comment || undefined,
        blockers: blocker || undefined,
      });

      const result: CollaboratorCheckinResult = {
        krId: kr.id,
        krTitle: kr.title,
        objectiveTitle: kr.objective_title,
        previousValue: kr.current_value,
        newValue: numericValue,
        confidence,
        comment: comment || undefined,
        skipped: false,
        blocker: blocker || undefined,
      };

      onComplete(result);
    } catch (error) {
      // Error is handled by the mutation
    }
  }, [kr, numericValue, confidence, comment, blocker, createCheckin, onComplete]);

  // Handle skip
  const handleSkip = useCallback(() => {
    const result: CollaboratorCheckinResult = {
      krId: kr.id,
      krTitle: kr.title,
      objectiveTitle: kr.objective_title,
      previousValue: kr.current_value,
      newValue: kr.current_value,
      confidence: 'medium',
      skipped: true,
    };
    onComplete(result);
  }, [kr, onComplete]);

  // Keyboard shortcut
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
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="px-6 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            KR {currentIndex + 1} de {totalCount}
          </span>
          <Badge variant="outline">
            {Math.round((currentIndex / totalCount) * 100)}% concluído
          </Badge>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

        {/* KR Context */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <KrContextCard
              title={kr.title}
              objectiveTitle={kr.objective_title}
              baseline={kr.baseline}
              currentValue={kr.current_value}
              target={kr.target}
              unit={kr.unit}
              direction={kr.direction}
              status={kr.status}
              progress={kr.progress}
              lastCheckinAt={kr.last_checkin_at}
              ownerName={kr.owner_name}
              ownerPhoto={kr.owner_photo}
              teamName={kr.team_name}
            />
          </div>
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

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.filter(i => !i.dismissed).slice(0, 1).map(insight => (
              <VicInsightCard
                key={insight.id}
                insight={insight}
                onDismiss={dismissInsight}
              />
            ))}
          </div>
        )}

        <Separator />

        {/* Microcopy question */}
        <MicrocopyQuestion question={microcopy} variant="highlight" />

        {/* Value input - locked if KR has primary KPI */}
        {isValueLocked && primaryKpi ? (
          <div className="rounded-lg border bg-info-muted/50 border-info/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Lock className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">
                  Esta KR é medida pela KPI "{primaryKpi.kpiName}"
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  O valor é atualizado automaticamente. Para alterar, atualize a KPI.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
              <div>
                <p className="text-xs text-muted-foreground">Valor atual</p>
                <p className="font-semibold">{primaryKpi.currentValue ?? '—'} {primaryKpi.kpiUnit}</p>
              </div>
              <Badge className={cn("shrink-0", 
                primaryKpi.ragStatus === 'green' ? RAG_STATUS_COLORS.green.badge :
                primaryKpi.ragStatus === 'yellow' ? RAG_STATUS_COLORS.yellow.badge :
                primaryKpi.ragStatus === 'red' ? RAG_STATUS_COLORS.red.badge : 'bg-muted'
              )}>
                {primaryKpi.ragStatus === 'green' ? 'Na meta' :
                 primaryKpi.ragStatus === 'yellow' ? 'Em atenção' :
                 primaryKpi.ragStatus === 'red' ? 'Fora da meta' : 'Sem dados'}
              </Badge>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to={`/kpis?kpi=${primaryKpi.kpiId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Atualizar KPI
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Label htmlFor="current-value">Valor atual</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  id="current-value"
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="text-lg font-semibold pr-16"
                  step="any"
                />
                {kr.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {kr.unit}
                  </span>
                )}
              </div>
              
              {/* Change indicator */}
              {change !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium",
                  change > 0 && kr.direction === 'up' && "bg-success-muted text-success-muted-foreground",
                  change < 0 && kr.direction === 'down' && "bg-success-muted text-success-muted-foreground",
                  change > 0 && kr.direction === 'down' && "bg-danger-muted text-danger-muted-foreground",
                  change < 0 && kr.direction === 'up' && "bg-danger-muted text-danger-muted-foreground",
                )}>
                  {change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{change > 0 ? '+' : ''}{change}</span>
                  <span className="text-xs">({changePercent}%)</span>
                </div>
              )}
            </div>
            
            {/* New progress preview */}
            {change !== 0 && (
              <p className="text-xs text-muted-foreground">
                Novo progresso: <span className="font-medium">{Math.round(newProgress)}%</span> (atual: {Math.round(kr.progress)}%)
              </p>
            )}
          </div>
        )}

        {/* Confidence selection */}
        <div className="space-y-3">
          <Label>Confiança de atingir a meta</Label>
          <RadioGroup
            value={confidence || ''}
            onValueChange={(v) => setConfidence(v as Confidence)}
            className="grid grid-cols-3 gap-3"
          >
            {CONFIDENCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Label
                  key={option.value}
                  htmlFor={option.value}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    confidence === option.value 
                      ? option.colorClass
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-center opacity-80">
                    {option.description}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Comentário (opcional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que contribuiu para este resultado? Alguma observação?"
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            💡 Use @ para mencionar pessoas
          </p>
        </div>

        {/* Blocker toggle */}
        {!showBlockerField ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockerField(true)}
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2 text-status-orange" />
            Registrar bloqueador
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="blocker" className="text-status-orange">
                Bloqueador
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBlocker('');
                  setShowBlockerField(false);
                }}
              >
                Remover
              </Button>
            </div>
            <Textarea
              id="blocker"
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              placeholder="Descreva o que está impedindo o progresso..."
              className="min-h-[80px] resize-none border-warning/50 focus:border-warning"
            />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={currentIndex === 0}
          >
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
            disabled={!canSubmit || createCheckin.isPending}
            className="flex-1"
          >
            {createCheckin.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {isLast ? 'Salvar e concluir' : 'Salvar e próximo'}
            {!isLast && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {canSubmit && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Atalho: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> para salvar
          </p>
        )}
      </div>
    </div>
  );
}
