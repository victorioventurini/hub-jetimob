/**
 * SummaryKrBalance - Card de balanço de KRs para summary de pré-ritos.
 *
 * SSOT extraído de MbrPreSummary/QbrPreSummary. Usa `useEntityLookup` para
 * resolver nomes canônicos dos KRs (substitui campo deprecated `krTitle`),
 * mostra contadores por estado e lista expansível.
 */

import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KR_STATE_CONFIG, type KrState } from '@/modules/okrs/hooks';
import { useEntityLookup, resolveName } from '@/modules/okrs/hooks/useEntityLookup';

export interface SummaryKrBalanceItem {
  krId: string;
  krTitle?: string;
  state: string;
  finalProgress: number;
}

export interface SummaryKrBalanceProps {
  title: string;
  items: SummaryKrBalanceItem[];
  /** Quantos KRs mostrar antes de exigir expansão. Default 5. */
  initialVisible?: number;
}

const STATE_BUCKETS: Array<{ key: KrState; label: string; tone: string }> = [
  { key: 'exceeded', label: 'Superado', tone: 'text-status-green' },
  { key: 'achieved', label: 'Alcançado', tone: 'text-status-green' },
  { key: 'healthy', label: 'No caminho', tone: 'text-status-blue' },
  { key: 'at_risk', label: 'Em risco', tone: 'text-status-amber' },
  { key: 'off_track', label: 'Atrasado', tone: 'text-status-red' },
  { key: 'not_achieved', label: 'Não alcançado', tone: 'text-status-red' },
  { key: 'stagnant', label: 'Parado', tone: 'text-muted-foreground' },
  { key: 'not_started', label: 'Não iniciado', tone: 'text-muted-foreground' },
];

export const SummaryKrBalance = memo(function SummaryKrBalance({
  title,
  items,
  initialVisible = 5,
}: SummaryKrBalanceProps) {
  const [expanded, setExpanded] = useState(false);

  const teamKrIds = items.map((i) => i.krId).filter(Boolean);
  const lookup = useEntityLookup({ teamKrIds });

  const counts = STATE_BUCKETS.map((bucket) => ({
    ...bucket,
    count: items.filter((i) => i.state === bucket.key).length,
  })).filter((b) => b.count > 0);

  const visible = expanded ? items : items.slice(0, initialVisible);
  const hidden = items.length - visible.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum KR neste rito.</p>
        ) : (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              {counts.map((b) => (
                <Badge key={b.key} variant="outline" className={cn('text-xs', b.tone)}>
                  {b.count} {b.label.toLowerCase()}
                </Badge>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              {visible.map((kr) => {
                const config = KR_STATE_CONFIG[(kr.state as KrState) || 'not_started'];
                const name = resolveName(lookup.teamKrs, kr.krId, kr.krTitle, '(KR removido)');
                return (
                  <div key={kr.krId} className="flex items-center gap-2 text-xs">
                    <config.icon className={cn('h-3 w-3 shrink-0', config.colorClass)} />
                    <span className="truncate flex-1" title={name}>{name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {Math.round(kr.finalProgress)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {items.length > initialVisible && (
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
                    <ChevronDown className="h-3 w-3 mr-1" /> Ver todos os {items.length} KRs
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
