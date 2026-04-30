/**
 * InlineAgendaSuggestionInput - Registro inline de sugestões de pauta para
 * o rito-mãe, em qualquer step de um wizard preparatório (MBR-pré, QBR-pré).
 *
 * Wrapper fino sobre `InlineCollapsibleEntryInput` que injeta as 3
 * categorias canônicas de `RitualBlock` (performance | projetos | pessoas).
 *
 * Filtra e exibe somente sugestões com `sourceStep` correspondente.
 */

import { ListTodo, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  InlineCollapsibleEntryInput,
  type CategoryConfig,
} from './InlineCollapsibleEntryInput';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';
import type { RitualBlock } from '@/modules/okrs/types/wizard/vocabulary';

// ============================================================
// CONSTANTS
// ============================================================

export const AGENDA_CATEGORY_CONFIG: Record<
  RitualBlock,
  { label: string; activeClassName: string; badgeClassName: string }
> = {
  performance: {
    label: 'Performance',
    activeClassName: 'bg-status-blue-muted text-status-blue',
    badgeClassName: 'bg-status-blue-muted text-status-blue border-transparent',
  },
  projetos: {
    label: 'Projetos',
    activeClassName: 'bg-status-purple-muted text-status-purple',
    badgeClassName: 'bg-status-purple-muted text-status-purple border-transparent',
  },
  pessoas: {
    label: 'Pessoas',
    activeClassName: 'bg-status-green-muted text-status-green',
    badgeClassName: 'bg-status-green-muted text-status-green border-transparent',
  },
};

const AGENDA_CATEGORIES: ReadonlyArray<CategoryConfig<RitualBlock>> = (
  Object.keys(AGENDA_CATEGORY_CONFIG) as RitualBlock[]
).map((value) => ({
  value,
  label: AGENDA_CATEGORY_CONFIG[value].label,
  activeClassName: AGENDA_CATEGORY_CONFIG[value].activeClassName,
}));

// ============================================================
// TYPES
// ============================================================

export interface InlineAgendaSuggestionInputProps {
  suggestions: RitualAgendaSuggestion[];
  onSuggestionsChange: (next: RitualAgendaSuggestion[]) => void;
  /** Step do wizard onde está sendo renderizado (filtra a lista). */
  sourceStep: string;
  /** Texto do trigger collapsible. Ex: "Registrar sugestão de pauta para o MBR". */
  triggerLabel: string;
  placeholder?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function InlineAgendaSuggestionInput({
  suggestions,
  onSuggestionsChange,
  sourceStep,
  triggerLabel,
  placeholder = 'Descreva o ponto a ser discutido no rito...',
}: InlineAgendaSuggestionInputProps) {
  const stepSuggestions = suggestions.filter((s) => s.sourceStep === sourceStep);

  const handleAdd = (text: string, category: RitualBlock) => {
    const next: RitualAgendaSuggestion = {
      id: `agenda-${Date.now()}`,
      text,
      category,
      sourceStep,
      createdAt: new Date().toISOString(),
    };
    onSuggestionsChange([...suggestions, next]);
  };

  const handleRemove = (id: string) => {
    onSuggestionsChange(suggestions.filter((s) => s.id !== id));
  };

  return (
    <InlineCollapsibleEntryInput<RitualAgendaSuggestion, RitualBlock>
      items={stepSuggestions}
      categories={AGENDA_CATEGORIES}
      defaultCategory="performance"
      onAdd={handleAdd}
      triggerIcon={ListTodo}
      triggerLabel={triggerLabel}
      placeholder={placeholder}
      renderItem={(item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-md border bg-card px-2.5 py-2 text-xs"
        >
          <Badge
            variant="outline"
            className={cn('shrink-0 text-[10px] px-1.5', AGENDA_CATEGORY_CONFIG[item.category].badgeClassName)}
          >
            {AGENDA_CATEGORY_CONFIG[item.category].label}
          </Badge>
          <p className="flex-1 text-foreground/90 break-words leading-snug">{item.text}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(item.id)}
            aria-label="Remover sugestão"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    />
  );
}
