/**
 * WeeklyExecutiveOpeningStep — Step 1 da Weekly v2
 *
 * Abertura Executiva curada pelo agente `curador-orquestrador`.
 * Hoje (Onda 4 — entrega de containers): renderiza o `PreparationStatusCard`
 * mostrando cobertura dos Pré-Weekly da BU + esqueleto editável da abertura
 * (resumo, temas, alertas, ordem). A invocação do agente ficará disponível
 * via botão "Gerar rascunho" assim que a edge function `weekly-curate-opening`
 * estiver entregue na próxima passada — por enquanto o modo manual cobre
 * 100% do fluxo (origin='manual', state inicia em 'draft').
 */

import { useCallback, type ReactNode } from 'react';
import { Sparkles, ListChecks, AlertTriangle, Clock4, CheckCircle2, Wand2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  RitualPreparationStatus,
  CarryOverDecisionsSection,
} from '../shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useIdentity } from '@/hooks/useIdentity';
import type {
  WeeklyExecutiveOpening,
  WeeklyOpeningState,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const STATE_BADGE: Record<WeeklyOpeningState, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  reviewed: { label: 'Revisado', className: 'bg-status-amber-muted text-status-amber' },
  approved: { label: 'Aprovado', className: 'bg-status-green-muted text-status-green' },
};

// ============================================================
// TYPES
// ============================================================

export interface WeeklyExecutiveOpeningStepProps {
  opening: WeeklyExecutiveOpening;
  onOpeningChange: (next: WeeklyExecutiveOpening) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  /** Acionado pelo botão "Gerar rascunho" — invoca o curador-orquestrador */
  onGenerateDraft?: () => void | Promise<void>;
  /** Indica geração em curso (desabilita botão e mostra spinner) */
  isGenerating?: boolean;
  /** Desabilita o botão de gerar (ex.: agregação de Pré-Weeklies ainda carregando) */
  disableGenerate?: boolean;
  /** Slot opcional renderizado abaixo do PreparationStatusCard (ex.: RitualAttendance) */
  topSlot?: ReactNode;
  /** Decisões pendentes da Weekly anterior (carry-over). */
  carryOverDecisions?: TeamCheckinDecision[];
}

// ============================================================
// COMPONENT
// ============================================================

export function WeeklyExecutiveOpeningStep({
  opening,
  onOpeningChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onGenerateDraft,
  isGenerating = false,
  topSlot,
  carryOverDecisions,
}: WeeklyExecutiveOpeningStepProps) {
  const { isWildcard } = usePermissions();
  const { realProfileId } = useIdentity();

  const stateBadge = STATE_BADGE[opening.state];

  const transitionTo = useCallback(
    (state: WeeklyOpeningState) => {
      onOpeningChange({
        ...opening,
        state,
        transitions: [
          ...opening.transitions,
          { state, at: new Date().toISOString(), by: realProfileId },
        ],
      });
    },
    [opening, onOpeningChange, realProfileId],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title="Abertura Executiva"
          description="Curadoria da pauta consolidada da BU"
          variant="primary"
          rightContent={
            <Badge className={cn('text-xs border-0', stateBadge.className)}>
              {stateBadge.label}
            </Badge>
          }
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="weekly-executive-opening"
          placeholder="Registrar decisão da abertura…"
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar para Prioridades"
        />
      }
    >
      <div className="p-6 space-y-4">
        <RitualPreparationStatus ritualType="weekly" />
        {topSlot}
        <CarryOverDecisionsSection
          items={carryOverDecisions}
          contextLabel="da Weekly anterior"
          showSeparator={false}
        />

        {opening.origin === 'manual' && (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Modo manual</CardTitle>
              <CardDescription>
                Edite as seções abaixo manualmente, ou peça ao curador para
                gerar um rascunho a partir dos Pré-Weekly da semana.
              </CardDescription>
            </CardHeader>
            {onGenerateDraft && (
              <CardContent>
                <Button
                  onClick={() => void onGenerateDraft()}
                  disabled={isGenerating}
                  size="sm"
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Gerando rascunho…' : 'Gerar rascunho com IA'}
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {opening.origin === 'ai-curated' && onGenerateDraft && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onGenerateDraft()}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Regenerar rascunho
            </Button>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Resumo da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={opening.summary}
              onChange={(e) => onOpeningChange({ ...opening, summary: e.target.value })}
              placeholder="2-3 frases sobre o que importa nesta Weekly…"
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Temas curados ({opening.themes.length})
            </CardTitle>
            <CardDescription>
              Lista populada pelo agente curador. No modo manual, edite via Step 2.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {opening.themes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum tema curado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {opening.themes.map((theme, idx) => (
                  <li key={theme.id} className="rounded-md border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                      <span className="text-sm font-medium">{theme.title}</span>
                      <Badge variant="outline" className="text-xs">{theme.block}</Badge>
                      <Badge variant="secondary" className="text-xs">{theme.type}</Badge>
                    </div>
                    {theme.motivation && (
                      <p className="text-xs text-muted-foreground mt-1">{theme.motivation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas por bloco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['performance', 'projetos', 'pessoas'] as const).map((block) => (
              <div key={block} className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">{block}</Label>
                <Textarea
                  value={(opening.alertsByBlock?.[block] ?? []).join('\n')}
                  onChange={(e) =>
                    onOpeningChange({
                      ...opening,
                      alertsByBlock: {
                        ...opening.alertsByBlock,
                        [block]: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  placeholder="Um alerta por linha…"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock4 className="h-4 w-4" />
              Ordem sugerida & fora de pauta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Fora de pauta (um por linha)</Label>
              <Textarea
                value={(opening.offAgenda ?? []).join('\n')}
                onChange={(e) =>
                  onOpeningChange({
                    ...opening,
                    offAgenda: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Temas conscientemente excluídos…"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          {opening.state === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => transitionTo('reviewed')} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Marcar como revisado
            </Button>
          )}
          {opening.state === 'reviewed' && isWildcard && (
            <Button size="sm" onClick={() => transitionTo('approved')} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Aprovar abertura
            </Button>
          )}
          {opening.state === 'approved' && (
            <Badge className="bg-status-green-muted text-status-green border-0">
              Abertura aprovada
            </Badge>
          )}
        </div>
      </div>
    </WizardStepScaffold>
  );
}
