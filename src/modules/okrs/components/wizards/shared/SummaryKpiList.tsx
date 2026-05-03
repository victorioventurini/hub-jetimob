/**
 * SummaryKpiList - Lista compacta de KPIs para summary de pré-ritos.
 *
 * Mostra cada KPI com ícone RAG, nome, valor atual + unidade e badge do
 * tipo de input (consolidado/parcial). Cap visível com expand/collapse.
 *
 * Substitui o card "KPIs" vazio que existia em MbrPreSummary/QbrPreSummary.
 */

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ChevronDown, ChevronUp, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

export interface SummaryKpiListProps {
  kpis: MbrKpiSnapshot[];
  initialVisible?: number;
  /** Justificativas/plano de ação por kpiId — renderizadas inline abaixo de cada item. */
  justifications?: Record<string, string>;
}

const RAG_TONE: Record<string, string> = {
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  red: 'bg-status-red',
  yellow: 'bg-status-amber',
  unknown: 'bg-muted',
};

function formatValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (!unit) return formatted;
  if (unit === '%') return `${formatted}%`;
  if (unit === 'R$' || unit === 'BRL') return `R$ ${formatted}`;
  return `${formatted} ${unit}`;
}

export const SummaryKpiList = memo(function SummaryKpiList({
  kpis,
  initialVisible = 5,
  justifications,
}: SummaryKpiListProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? kpis : kpis.slice(0, initialVisible);
  const hidden = kpis.length - visible.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          KPIs ({kpis.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {kpis.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum KPI registrado neste rito.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {visible.map((kpi) => {
                const dotTone = RAG_TONE[kpi.ragStatus] ?? RAG_TONE.unknown;
                const justification = justifications?.[kpi.kpiId]?.trim();
                return (
                  <div key={kpi.kpiId} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={cn('h-2 w-2 rounded-full shrink-0', dotTone)}
                        aria-hidden
                      />
                      <span className="truncate flex-1" title={kpi.name}>
                        {kpi.name}
                      </span>
                      {kpi.latestInputType === 'partial' && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                          parcial
                        </Badge>
                      )}
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {formatValue(kpi.currentValue, kpi.unit)}
                      </span>
                    </div>
                    {justification && (
                      <div className="ml-4 rounded-md border bg-muted/30 px-2.5 py-1.5 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          <MessageSquareQuote className="h-3 w-3" />
                          Plano de ação do líder
                        </div>
                        <p className="text-xs text-foreground whitespace-pre-wrap">
                          {justification}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {kpis.length > initialVisible && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" /> Ver todos os {kpis.length} KPIs
                    {hidden > 0 ? ` (+${hidden})` : ''}
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
