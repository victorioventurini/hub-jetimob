/**
 * JustificationField — Campo padrão de justificativa para itens fora da meta
 *
 * Usado em ritos reflexivos (Pré-MBR, Pré-QBR) para coletar a explicação do
 * líder sobre KPIs em alerta, projetos/milestones atrasados, etc.
 *
 * Convenção:
 * - `required` => sinaliza visualmente (asterisco + borda warning) quando vazio
 * - Não impõe validação aqui; cabe ao step pai bloquear `primaryDisabled`.
 */

import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface JustificationFieldProps {
  /** Identificador estável (passado no `htmlFor`/`id`). */
  id: string;
  /** Texto principal do label (ex.: "Justifique o desvio da meta"). */
  label?: string;
  /** Valor controlado. */
  value: string;
  onChange: (next: string) => void;
  /** Quando true, sinaliza obrigatoriedade visualmente. */
  required?: boolean;
  /** Mensagem de hint exibida acima do textarea. */
  hint?: string;
  placeholder?: string;
  /** Linhas mínimas. */
  rows?: number;
  className?: string;
  disabled?: boolean;
}

function JustificationFieldImpl({
  id,
  label = 'Justifique este desvio',
  value,
  onChange,
  required = false,
  hint,
  placeholder = 'Explique o que está acontecendo e o plano de ação previsto...',
  rows = 3,
  className,
  disabled = false,
}: JustificationFieldProps) {
  const isEmpty = value.trim().length === 0;
  const showWarning = required && isEmpty;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-warning">*</span>}
      </Label>
      {hint && (
        <p
          className={cn(
            'text-xs',
            showWarning ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      )}
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'text-sm',
          rows >= 4 ? 'min-h-[96px]' : 'min-h-[72px]',
          showWarning && 'border-warning focus-visible:ring-warning/40',
        )}
      />
    </div>
  );
}

export const JustificationField = memo(JustificationFieldImpl);
