/**
 * MbrPanoramaCurationCard — Bloco "Curadoria do mês" no Step 1 do MBR.
 *
 * Espelho visual de `WeeklyExecutiveOpeningStep` (Abertura Executiva),
 * adaptado ao contexto mensal: resumo executivo, KPIs críticos,
 * alertas por bloco e decisões sugeridas (com ação de adicionar ao
 * `decisions` do draft).
 *
 * Reutiliza vocabulário e tokens semânticos do design system.
 */

import { memo, useCallback } from 'react';
import {
  Sparkles,
  Wand2,
  Loader2,
  AlertTriangle,
  TrendingDown,
  ListChecks,
  Plus,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  MbrPanoramaAgendaItem,
  MbrPanoramaCuration,
  MbrPanoramaCurationState,
} from '@/modules/okrs/types/wizard';
import { MbrAgendaCuration } from './MbrAgendaCuration';

// ============================================================
// CONSTANTS
// ============================================================

const STATE_BADGE: Record<MbrPanoramaCurationState, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  reviewed: { label: 'Revisado', className: 'bg-status-amber-muted text-status-amber' },
  approved: { label: 'Aprovado', className: 'bg-status-green-muted text-status-green' },
};

// ============================================================
// PROPS
// ============================================================

export interface MbrPanoramaCurationCardProps {
  curation: MbrPanoramaCuration;
  onCurationChange: (next: MbrPanoramaCuration) => void;
  /** Acionado pelo botão "Gerar rascunho com IA" */
  onGenerateDraft?: () => void | Promise<void>;
  /** Indica geração em curso (desabilita botão e mostra spinner) */
  isGenerating?: boolean;
  /**
   * Adiciona uma decisão sugerida ao `decisions` do draft.
   * Recebe o título e categoria; retorna `true` se foi adicionada.
   */
  onAddSuggestedDecision?: (title: string, category?: string) => void;
  /** Mapa teamId → nome (para badges em itens vindos de Pré-MBR). */
  teamNamesById?: Record<string, string>;
}

// ============================================================
// COMPONENT
// ============================================================

function MbrPanoramaCurationCardImpl({
  curation,
  onCurationChange,
  onGenerateDraft,
  isGenerating = false,
  onAddSuggestedDecision,
  teamNamesById,
}: MbrPanoramaCurationCardProps) {
  const stateBadge = STATE_BADGE[curation.state];
  const hasContent =
    curation.summary.trim().length > 0 ||
    curation.criticalKpiHighlights.length > 0 ||
    curation.alertsByBlock.performance.length > 0 ||
    curation.alertsByBlock.projetos.length > 0 ||
    curation.alertsByBlock.pessoas.length > 0 ||
    curation.suggestedDecisions.length > 0;

  const handleSummaryChange = useCallback(
    (value: string) => {
      onCurationChange({ ...curation, summary: value });
    },
    [curation, onCurationChange],
  );

  const handleAlertChange = useCallback(
    (block: 'performance' | 'projetos' | 'pessoas', value: string) => {
      const next = value
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      onCurationChange({
        ...curation,
        alertsByBlock: { ...curation.alertsByBlock, [block]: next },
      });
    },
    [curation, onCurationChange],
  );

  const handleAddDecision = useCallback(
    (idx: number) => {
      const target = curation.suggestedDecisions[idx];
      if (!target) return;
      onAddSuggestedDecision?.(target.title, target.category);
      const updated = curation.suggestedDecisions.map((d, i) =>
        i === idx ? { ...d, added: true } : d,
      );
      onCurationChange({ ...curation, suggestedDecisions: updated });
    },
    [curation, onCurationChange, onAddSuggestedDecision],
  );

  const handleResetDecision = useCallback(
    (idx: number) => {
      const updated = curation.suggestedDecisions.map((d, i) =>
        i === idx ? { ...d, added: false } : d,
      );
      onCurationChange({ ...curation, suggestedDecisions: updated });
    },
    [curation, onCurationChange],
  );

  const handleAgendaChange = useCallback(
    (next: MbrPanoramaAgendaItem[]) => {
      onCurationChange({ ...curation, agenda: next });
    },
    [curation, onCurationChange],
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Curadoria do mês
            </CardTitle>
            <CardDescription>
              {curation.origin === 'manual' && !hasContent
                ? 'Modo manual — peça ao curador para gerar um rascunho a partir dos pré-MBRs do mês.'
                : 'Resumo executivo do MBR — edite à vontade antes de conduzir a reunião.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs border-0', stateBadge.className)}>
              {stateBadge.label}
            </Badge>
            {onGenerateDraft && (
              <Button
                onClick={() => void onGenerateDraft()}
                disabled={isGenerating}
                size="sm"
                variant={hasContent ? 'outline' : 'default'}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGenerating
                  ? 'Gerando…'
                  : hasContent
                    ? 'Regenerar'
                    : 'Gerar rascunho com IA'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumo executivo */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Resumo do mês
          </Label>
          <Textarea
            value={curation.summary}
            onChange={(e) => handleSummaryChange(e.target.value)}
            placeholder="2-3 parágrafos sobre saúde do mês e o que muda…"
            rows={4}
          />
        </div>

        {/* KPIs críticos */}
        {curation.criticalKpiHighlights.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" /> KPIs críticos ({curation.criticalKpiHighlights.length})
            </Label>
            <ul className="space-y-2">
              {curation.criticalKpiHighlights.map((h, idx) => (
                <li
                  key={`${h.kpiId || 'kpi'}-${idx}`}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <p className="text-sm font-medium">{h.headline}</p>
                  {h.impact && (
                    <p className="text-xs text-muted-foreground mt-1">{h.impact}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alertas por bloco */}
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Alertas por bloco
          </Label>
          <div className="space-y-3">
            {(['performance', 'projetos', 'pessoas'] as const).map((block) => (
              <div key={block} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {block}
                </Label>
                <Textarea
                  value={curation.alertsByBlock[block].join('\n')}
                  onChange={(e) => handleAlertChange(block, e.target.value)}
                  placeholder={`Um alerta por linha…`}
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pauta do MBR — drag-and-drop, incluir/excluir, adicionar manual */}
        <MbrAgendaCuration
          agenda={curation.agenda ?? []}
          onChange={handleAgendaChange}
          teamNamesById={teamNamesById}
        />

        {/* Decisões sugeridas */}
        {curation.suggestedDecisions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="h-3 w-3" /> Decisões sugeridas ({curation.suggestedDecisions.length})
            </Label>
            <ul className="space-y-2">
              {curation.suggestedDecisions.map((d, idx) => (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{d.title}</p>
                    {d.category && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {d.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant={d.added ? 'ghost' : 'outline'}
                      disabled={!onAddSuggestedDecision}
                      onClick={() => handleAddDecision(idx)}
                      className="gap-1.5"
                      title={d.added ? 'Adicionar novamente ao plano' : 'Adicionar ao plano'}
                    >
                      {d.added ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-status-green" /> Adicionada
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </>
                      )}
                    </Button>
                    {d.added && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResetDecision(idx)}
                        className="h-8 w-8 p-0"
                        title="Marcar como não adicionada (permitir readicionar)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {curation.generatedAt && (
          <p className="text-[11px] text-muted-foreground italic">
            Rascunho gerado em {new Date(curation.generatedAt).toLocaleString('pt-BR')}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export const MbrPanoramaCurationCard = memo(MbrPanoramaCurationCardImpl);
