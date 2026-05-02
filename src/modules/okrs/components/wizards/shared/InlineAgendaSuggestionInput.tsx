/**
 * InlineAgendaSuggestionInput - Registro inline de sugestões de pauta para
 * o rito-mãe, em qualquer step de um wizard preparatório.
 *
 * Modos:
 *  - Padrão (com categoria): wrapper sobre `InlineCollapsibleEntryInput` que
 *    injeta as 3 categorias canônicas de `RitualBlock`
 *    (performance | projetos | pessoas). Usado por MBR-pré, QBR-pré, etc.
 *  - `categoryless` (sem categoria): seletor de categoria oculto e badge de
 *    categoria suprimido no item. Grava `category: null`. Usado pelo
 *    Reflection do Check-in Individual → Pré-Check-in do Time.
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

/**
 * Sentinela interna usada pelo `InlineCollapsibleEntryInput` quando o modo
 * categoryless está ativo. Nunca persiste — convertido para `null` no `onAdd`.
 */
const CATEGORYLESS_SENTINEL = '__none__' as const;
type CategorylessCategory = typeof CATEGORYLESS_SENTINEL;

const CATEGORYLESS_CATEGORIES: ReadonlyArray<
  CategoryConfig<CategorylessCategory>
> = [
  {
    value: CATEGORYLESS_SENTINEL,
    label: '',
    activeClassName: '',
  },
];

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
  /**
   * Quando `true`, oculta o seletor e o badge de categoria. Sugestões são
   * gravadas com `category: null`. Default `false` (mantém comportamento
   * legado dos consumidores existentes — MBR-pré, QBR-pré, etc.).
   */
  categoryless?: boolean;
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
  categoryless = false,
}: InlineAgendaSuggestionInputProps) {
  const stepSuggestions = suggestions.filter((s) => s.sourceStep === sourceStep);

  const handleRemove = (id: string) => {
    onSuggestionsChange(suggestions.filter((s) => s.id !== id));
  };

  if (categoryless) {
    const handleAddCategoryless = (text: string) => {
      const next: RitualAgendaSuggestion = {
        id: `agenda-${Date.now()}`,
        text,
        category: null,
        sourceStep,
        createdAt: new Date().toISOString(),
      };
      onSuggestionsChange([...suggestions, next]);
    };

    return (
      <InlineCollapsibleEntryInput<RitualAgendaSuggestion, CategorylessCategory>
        items={stepSuggestions}
        categories={CATEGORYLESS_CATEGORIES}
        defaultCategory={CATEGORYLESS_SENTINEL}
        onAdd={(text) => handleAddCategoryless(text)}
        triggerIcon={ListTodo}
        triggerLabel={triggerLabel}
        placeholder={placeholder}
        hideCategorySelector
        renderItem={(item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 rounded-md border bg-card px-2.5 py-2 text-xs"
          >
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

  return (
    <InlineCollapsibleEntryInput<RitualAgendaSuggestion, RitualBlock>
      items={stepSuggestions}
      categories={AGENDA_CATEGORIES}
      defaultCategory="performance"
      onAdd={handleAdd}
      triggerIcon={ListTodo}
      triggerLabel={triggerLabel}
      placeholder={placeholder}
      renderItem={(item) => {
        const cfg = item.category ? AGENDA_CATEGORY_CONFIG[item.category] : null;
        return (
          <div
            key={item.id}
            className="flex items-start gap-2 rounded-md border bg-card px-2.5 py-2 text-xs"
          >
            {cfg && (
              <Badge
                variant="outline"
                className={cn('shrink-0 text-[10px] px-1.5', cfg.badgeClassName)}
              >
                {cfg.label}
              </Badge>
            )}
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
        );
      }}
    />
  );
}
