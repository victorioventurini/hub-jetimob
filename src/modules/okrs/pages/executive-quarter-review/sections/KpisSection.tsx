import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statusToKpiBadge, trendArrow } from '../helpers';

interface Props {
  kpisByCategory: Array<{ category: string; items: any[] }>;
}

export function KpisSection({ kpisByCategory }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Indicadores da empresa</h2>
      <div className="space-y-4">
        {kpisByCategory.map((group) => (
          <Card key={group.category}>
            <CardHeader className="pb-3">
              <CardTitle className="capitalize text-base">{group.category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map((kpi) => {
                const rag = statusToKpiBadge(kpi.rag_status);
                const ragValue = String(kpi.rag_status ?? '');
                return (
                  <div
                    key={kpi.id}
                    className={`rounded-md border p-3 flex items-center justify-between gap-3 ${
                      ragValue === 'red'
                        ? 'border-status-red/50'
                        : ragValue === 'yellow'
                          ? 'border-status-yellow/50'
                          : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{kpi.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {kpi.current_value ?? '—'} {kpi.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={rag.cls}>{rag.label}</Badge>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        {trendArrow(kpi.variation, kpi.direction)}
                        {kpi.variation === null ? '—' : `${kpi.variation.toFixed(1)}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
