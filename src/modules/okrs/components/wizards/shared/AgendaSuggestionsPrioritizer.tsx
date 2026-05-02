/**
 * AgendaSuggestionsPrioritizer - Card unificado de sugestões de pauta para
 * o rito-mãe, renderizado no step de Resumo (MbrPreSummary, QbrPreSummary).
 *
 * Responsabilidades:
 * - Listar sugestões coletadas ao longo do wizard agrupadas por `RitualBlock`.
 * - Permitir priorização de até 3 (banner amarelo se nenhuma priorizada).
 * - Permitir adicionar novas sugestões direto na summary, reutilizando o
 *   componente compartilhado `InlineAgendaSuggestionInput` (mesmo padrão do
 *   `InlineDecisionInput` usado para notas/decisões).
 * - Permitir remover qualquer sugestão (botão X), independentemente do
 *   `sourceStep` em que foi criada.
 * - Sempre renderiza — mesmo sem sugestões prévias — para que o usuário
 *   possa propor pautas na etapa final.
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ListTodo, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENDA_CATEGORY_CONFIG } from './InlineAgendaSuggestionInput';
import { InlineAgendaSuggestionInput } from './InlineAgendaSuggestionInput';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';
import type { RitualBlock } from '@/modules/okrs/types/wizard/vocabulary';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_PRIORITIZED = 3;

const BLOCK_ORDER: RitualBlock[] = ['performance', 'projetos', 'pessoas'];

/** sourceStep usado para sugestões adicionadas direto na summary. */
const SUMMARY_SOURCE_STEP = 'summary';

// ============================================================
// TYPES
// ============================================================

export interface AgendaSuggestionsPrioritizerProps {
  /** Sugestões coletadas no wizard (todas as etapas). */
  suggestions: RitualAgendaSuggestion[];
  onSuggestionsChange: (next: RitualAgendaSuggestion[]) => void;
  /** Nome do rito-mãe para exibição (ex: "MBR", "QBR", "Check-in do Time"). */
  ritualLabel: string;
  /**
   * Quando `true`, oculta agrupamento por bloco e badges de categoria.
   * Sugestões são gravadas com `category: null` e listadas em uma lista única.
   * Usado pelo Check-in Individual → Pré-Check-in do Time.
   */
  categoryless?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export const AgendaSuggestionsPrioritizer = memo(function AgendaSuggestionsPrioritizer({
  suggestions,
  onSuggestionsChange,
  ritualLabel,
}: AgendaSuggestionsPrioritizerProps) {
  const grouped = useMemo(() => {
    const map: {
      performance: RitualAgendaSuggestion[];
      projetos: RitualAgendaSuggestion[];
      pessoas: RitualAgendaSuggestion[];
      none: RitualAgendaSuggestion[];
    } = {
      performance: [],
      projetos: [],
      pessoas: [],
      none: [],
    };
    for (const s of suggestions) {
      if (s.category === 'performance' || s.category === 'projetos' || s.category === 'pessoas') {
        map[s.category].push(s);
      } else {
        map.none.push(s);
      }
    }
    return map;
  }, [suggestions]);

  const prioritizedCount = useMemo(
    () => suggestions.filter((s) => s.prioritized).length,
    [suggestions],
  );

  const limitReached = prioritizedCount >= MAX_PRIORITIZED;
  const hasSuggestions = suggestions.length > 0;

  const handleToggle = (id: string, nextChecked: boolean) => {
    if (nextChecked && limitReached) return; // safety net

    if (!nextChecked) {
      // Desmarcar — também recompacta os priorityRank dos demais.
      const removed = suggestions.find((s) => s.id === id);
      const removedRank = removed?.priorityRank;
      const next = suggestions.map((s) => {
        if (s.id === id) {
          const { prioritized, priorityRank, ...rest } = s;
          return { ...rest } as RitualAgendaSuggestion;
        }
        if (removedRank && s.priorityRank && s.priorityRank > removedRank) {
          return { ...s, priorityRank: (s.priorityRank - 1) as 1 | 2 | 3 };
        }
        return s;
      });
      onSuggestionsChange(next);
      return;
    }

    // Marcar — atribui o próximo rank disponível.
    const nextRank = (prioritizedCount + 1) as 1 | 2 | 3;
    const next = suggestions.map((s) =>
      s.id === id ? { ...s, prioritized: true, priorityRank: nextRank } : s,
    );
    onSuggestionsChange(next);
  };

  const handleRemove = (id: string) => {
    const removed = suggestions.find((s) => s.id === id);
    const removedRank = removed?.priorityRank;
    const next = suggestions
      .filter((s) => s.id !== id)
      .map((s) => {
        if (removedRank && s.priorityRank && s.priorityRank > removedRank) {
          return { ...s, priorityRank: (s.priorityRank - 1) as 1 | 2 | 3 };
        }
        return s;
      });
    onSuggestionsChange(next);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Sugestões de pauta para o {ritualLabel}
          {hasSuggestions && ` (${suggestions.length})`}
        </CardTitle>
        {hasSuggestions ? (
          <p className="text-xs text-muted-foreground">
            Priorize até {MAX_PRIORITIZED} sugestões para o rito ({prioritizedCount}/
            {MAX_PRIORITIZED} marcadas)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma sugestão registrada nas etapas anteriores. Adicione abaixo se quiser propor
            pontos para o {ritualLabel}.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input inline — sempre disponível, mesmo padrão do InlineDecisionInput */}
        <InlineAgendaSuggestionInput
          suggestions={suggestions}
          onSuggestionsChange={onSuggestionsChange}
          sourceStep={SUMMARY_SOURCE_STEP}
          triggerLabel={`Adicionar sugestão de pauta para o ${ritualLabel}`}
          placeholder={`Descreva o ponto a ser discutido no ${ritualLabel}...`}
        />

        {hasSuggestions && prioritizedCount === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-status-amber/30 bg-status-amber-muted/40 px-3 py-2 text-xs text-status-amber-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Recomendamos priorizar até {MAX_PRIORITIZED} sugestões para o {ritualLabel}. Sem
              priorização, todas as sugestões são enviadas como pauta candidata.
            </p>
          </div>
        )}

        {(() => {
          const renderItems = (items: RitualAgendaSuggestion[]) => (
            <ul className="space-y-1.5">
              {items.map((item) => {
                const checked = !!item.prioritized;
                const disabled = !checked && limitReached;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-start gap-2 rounded-md border bg-card px-2.5 py-2 text-xs',
                      checked && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(next) => handleToggle(item.id, next === true)}
                      aria-label={
                        disabled
                          ? `Limite de ${MAX_PRIORITIZED} sugestões prioritárias atingido`
                          : checked
                            ? 'Remover priorização'
                            : 'Priorizar'
                      }
                      className="mt-0.5"
                    />
                    <p className="flex-1 text-foreground/90 break-words leading-snug">
                      {item.text}
                    </p>
                    {checked && item.priorityRank && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] px-1.5"
                        title="Ordem de priorização"
                      >
                        #{item.priorityRank}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remover sugestão"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          );

          return (
            <>
              {BLOCK_ORDER.map((block) => {
                const items = grouped[block];
                if (items.length === 0) return null;
                const cfg = AGENDA_CATEGORY_CONFIG[block];
                return (
                  <div key={block} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5', cfg.badgeClassName)}>
                        {cfg.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{items.length}</span>
                    </div>
                    {renderItems(items)}
                  </div>
                );
              })}

              {grouped.none.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
                      Sem categoria
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{grouped.none.length}</span>
                  </div>
                  {renderItems(grouped.none)}
                </div>
              )}
            </>
          );
        })()}
      </CardContent>
    </Card>
  );
});
