import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiItem {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface KpiSummaryCardProps {
  kpis: KpiItem[];
  title?: string;
}

export function KpiSummaryCard({ kpis, title = "KPIs Principais" }: KpiSummaryCardProps) {
  const getChangeIcon = (type?: string) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="h-3 w-3" />;
      case "negative":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getChangeColor = (type?: string) => {
    switch (type) {
      case "positive":
        return "text-emerald-600 dark:text-emerald-400";
      case "negative":
        return "text-red-500 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
              {kpi.change && (
                <div className={cn("flex items-center gap-1 text-xs", getChangeColor(kpi.changeType))}>
                  {getChangeIcon(kpi.changeType)}
                  <span className="truncate">{kpi.change}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
