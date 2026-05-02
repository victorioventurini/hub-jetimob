/**
 * InlineCollapsibleEntryInput - Casca visual genérica para registros inline em wizards.
 *
 * Extraído de `InlineDecisionInput` para permitir reuso entre tipos de
 * registro distintos (decisões, sugestões de pauta, etc.) sem duplicação
 * de UI/UX.
 *
 * É um componente "headless visual": recebe a lista já filtrada para o
 * step atual, render-prop de item, lista de categorias e callbacks de
 * adição/remoção. Não conhece o tipo concreto da entidade.
 */

import { useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// ============================================================
// TYPES
// ============================================================

export interface CategoryConfig<TCategory extends string> {
  value: TCategory;
  label: string;
  /** Classes Tailwind aplicadas quando categoria é a selecionada (estado ativo). */
  activeClassName: string;
}

export interface InlineCollapsibleEntryInputProps<TItem, TCategory extends string> {
  /** Itens já filtrados para o step atual. */
  items: TItem[];
  /** Categorias disponíveis (renderizadas como badges clicáveis acima do input). */
  categories: ReadonlyArray<CategoryConfig<TCategory>>;
  /** Categoria default quando o componente abre. */
  defaultCategory: TCategory;
  /** Disparado quando o usuário confirma (Enter ou botão +). */
  onAdd: (text: string, category: TCategory) => void;
  /** Render-prop de cada item da lista. */
  renderItem: (item: TItem) => ReactNode;
  /** Ícone do trigger collapsible. */
  triggerIcon: ComponentType<{ className?: string }>;
  /** Texto do trigger collapsible. */
  triggerLabel: string;
  /** Placeholder do textarea. */
  placeholder?: string;
  /**
   * Quando `true`, o seletor de categoria não é renderizado. A `defaultCategory`
   * ainda é passada ao `onAdd` (o consumidor decide o que fazer com ela —
   * tipicamente um sentinela convertido para `null`).
   */
  hideCategorySelector?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function InlineCollapsibleEntryInput<TItem, TCategory extends string>({
  items,
  categories,
  defaultCategory,
  onAdd,
  renderItem,
  triggerIcon: TriggerIcon,
  triggerLabel,
  placeholder,
}: InlineCollapsibleEntryInputProps<TItem, TCategory>) {
  const isMobile = useIsMobile();
  // Mobile: collapsed por padrão para liberar viewport.
  // Desktop: aberto por padrão (comportamento original).
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<TCategory>(defaultCategory);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed, category);
    setText('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground min-w-0 px-3 sm:px-4"
        >
          <span className="flex items-center gap-2 text-xs min-w-0 flex-1">
            <TriggerIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {items.length}
              </Badge>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
            />
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2.5 sm:space-y-3">
          {/* Category selector */}
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {categories.map((cat) => (
              <Badge
                key={cat.value}
                variant="outline"
                className={cn(
                  'cursor-pointer transition-colors text-xs shrink-0',
                  category === cat.value && cat.activeClassName,
                )}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <TextareaAutoSubmit
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="text-sm"
              onSubmit={() => handleAdd()}
              minRows={1}
              maxRows={3}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 sm:h-8 sm:w-8 p-0 flex-shrink-0 self-end"
              onClick={handleAdd}
              disabled={!text.trim()}
              aria-label="Adicionar"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Items list — max-h reduzido em mobile para evitar overlap com teclado virtual. */}
          {items.length > 0 && (
            <ScrollArea className="max-h-[28vh] sm:max-h-[40vh]">
              <div className="space-y-2 pr-2">
                {items.map((item) => renderItem(item))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
