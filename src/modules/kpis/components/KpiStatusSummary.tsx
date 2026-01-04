import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiStatusSummaryProps {
  total: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  improving: number;
}

export function KpiStatusSummary({ total, onTrack, atRisk, offTrack, improving }: KpiStatusSummaryProps) {
  const items = [
    { 
      label: 'Total', 
      value: total, 
      color: 'text-foreground',
      description: 'KPIs ativos' 
    },
    { 
      label: 'On Track', 
      value: onTrack, 
      color: 'text-emerald-600 dark:text-emerald-400',
      percentage: total > 0 ? Math.round((onTrack / total) * 100) : 0,
    },
    { 
      label: 'Em Risco', 
      value: atRisk, 
      color: 'text-amber-600 dark:text-amber-400',
      percentage: total > 0 ? Math.round((atRisk / total) * 100) : 0,
    },
    { 
      label: 'Off Track', 
      value: offTrack, 
      color: 'text-red-600 dark:text-red-400',
      percentage: total > 0 ? Math.round((offTrack / total) * 100) : 0,
    },
    { 
      label: 'Melhorando', 
      value: improving, 
      color: 'text-blue-600 dark:text-blue-400',
      percentage: total > 0 ? Math.round((improving / total) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-baseline justify-between">
              <span className={cn("text-2xl font-bold", item.color)}>
                {item.value}
              </span>
              {item.percentage !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {item.percentage}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
