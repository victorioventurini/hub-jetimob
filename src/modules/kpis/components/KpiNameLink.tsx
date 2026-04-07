/**
 * KpiNameLink — Link reutilizável para abrir página dedicada de KPI em nova aba
 * 
 * Usado em rituais (wizards) para tornar nomes de KPI clicáveis.
 * Abre a página `/kpis/:kpiId` em nova aba com `target="_blank"`.
 * Usa `stopPropagation` para evitar trigger em cards pai (accordion, collapsible).
 */

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiNameLinkProps {
  kpiId: string;
  name: string;
  className?: string;
}

export function KpiNameLink({ kpiId, name, className }: KpiNameLinkProps) {
  return (
    <a
      href={`/kpis/${kpiId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'hover:underline inline-flex items-center gap-1 truncate',
        className
      )}
    >
      <span className="truncate">{name}</span>
      <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
    </a>
  );
}
