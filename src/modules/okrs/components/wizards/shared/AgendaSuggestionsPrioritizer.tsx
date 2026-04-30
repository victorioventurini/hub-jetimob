/**
 * AgendaSuggestionsPrioritizer - Listagem agrupada de sugestões de pauta
 * coletadas ao longo de um wizard preparatório, com priorização de até 3.
 *
 * Renderizado no step de Resumo (MbrPreSummary, QbrPreSummary).
 *
 * Regras:
 * - Agrupa por `RitualBlock` (Performance / Projetos / Pessoas) com contagem.
 * - Cada item tem um checkbox "Priorizar" — máximo de 3 marcados por wizard.
 * - 4ª tentativa: checkbox fica disabled (visual de bloqueio).
 * - Marcação atribui `priorityRank` 1/2/3 na ordem em que o usuário marca.
 * - Banner amarelo informativo quando há sugestões e nenhuma priorizada.
 */

import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENDA_CATEGORY_CONFIG } from './InlineAgendaSuggestionInput';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';
import type { RitualBlock } from '@/modules/okrs/types/wizard/vocabulary';

// ============================================================
// CONSTANTS
// ============================================================

const MAX_PRIORITIZED = 3;

const BLOCK_ORDER: RitualBlock[] = ['performance', 'projetos', 'pessoas'];

// ============================================================
// TYPES
// ============================================================

export interface AgendaSuggestionsPrioritizerProps {
  /** Sugestões coletadas no wizard (todas as etapas). */
  suggestions: RitualAgendaSuggestion[];
  onSuggestionsChange: (next: RitualAgendaSuggestion[]) => void;
  /** Nome do rito-mãe para exibição (ex: "MBR", "QBR"). */
  ritualLabel: string;
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
    const map: Record<RitualBlock, RitualAgendaSuggestion[]> = {
      performance: [],
      projetos: [],
      pessoas: [],
    };
    for (const s of suggestions) map[s.category].push(s);
    return map;
  }, [suggestions]);

  const prioritizedCount = useMemo(
    () => suggestions.filter((s) => s.prioritized).length,
    [suggestions],
  );

  const limitReached = prioritizedCount >= MAX_PRIORITIZED;

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

  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Sugestões de pauta para o {ritualLabel} ({suggestions.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Priorize até {MAX_PRIORITIZED} sugestões para o rito ({prioritizedCount}/{MAX_PRIORITIZED}{' '}
          marcadas)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {prioritizedCount === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-status-amber/30 bg-status-amber-muted/40 px-3 py-2 text-xs text-status-amber-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Recomendamos priorizar até {MAX_PRIORITIZED} sugestões para o {ritualLabel}. Sem
              priorização, todas as sugestões são enviadas como pauta candidata.
            </p>
          </div>
        )}

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
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
