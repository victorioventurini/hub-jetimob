/**
 * TextareaAutoSubmit - Textarea canônico para campos de parágrafo
 * 
 * Comportamento:
 * - Enter = executa onSubmit (submit/adicionar)
 * - Shift+Enter = quebra de linha
 * - Auto-resize vertical conforme conteúdo
 * 
 * Usar em: campos de decisões, descrições, notas, comentários, etc.
 * NÃO usar em: nome, título, marca, assunto (usar Input para esses)
 * 
 * @see docs/engineering/DEVELOPMENT_STANDARDS.md
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaAutoSubmitProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onKeyDown' | 'onSubmit'> {
  /** Called when user presses Enter (without Shift). Receives current value. */
  onSubmit?: (value: string) => void;
  /** Minimum number of visible rows (default: 1) */
  minRows?: number;
  /** Maximum number of visible rows before scroll (default: 6) */
  maxRows?: number;
}

const TextareaAutoSubmit = React.forwardRef<HTMLTextAreaElement, TextareaAutoSubmitProps>(
  ({ className, onSubmit, minRows = 1, maxRows = 6, onChange, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    const mergedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref]
    );

    // Auto-resize
    const adjustHeight = React.useCallback(() => {
      const el = internalRef.current;
      if (!el) return;

      // Reset to compute scrollHeight correctly
      el.style.height = 'auto';
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
      const minH = lineHeight * minRows + 16; // 16 for padding
      const maxH = lineHeight * maxRows + 16;
      const newH = Math.min(Math.max(el.scrollHeight, minH), maxH);
      el.style.height = `${newH}px`;
    }, [minRows, maxRows]);

    React.useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed = (e.currentTarget.value || '').trim();
        if (trimmed && onSubmit) {
          onSubmit(trimmed);
        }
      }
      // Shift+Enter falls through naturally → inserts newline
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      // Schedule resize after React processes the change
      requestAnimationFrame(adjustHeight);
    };

    return (
      <textarea
        ref={mergedRef}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto',
          className
        )}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={minRows}
        {...props}
      />
    );
  }
);
TextareaAutoSubmit.displayName = 'TextareaAutoSubmit';

export { TextareaAutoSubmit };
