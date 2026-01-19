/**
 * QualityMetricsGrid - Grid de métricas detalhadas de KRs
 */

import { Card, CardContent } from "@/components/ui/card";
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Pause,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KrMetrics {
  totalKrs: number;
  krsUpdatedOnTime: number;
  krsUpdatedLate: number;
  krsNoUpdate: number;
  krsAtRisk: number;
  krsStagnant: number;
  initiativesCritical: number;
}

interface QualityMetricsGridProps {
  metrics: KrMetrics;
  isLoading?: boolean;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  subLabel?: string;
}

function MetricCard({ icon: Icon, label, value, total, variant = 'default', subLabel }: MetricCardProps) {
  const variants = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const bgVariants = {
    default: 'bg-muted/50',
    success: 'bg-success-muted',
    warning: 'bg-warning-muted',
    danger: 'bg-danger-muted',
  };

  return (
    <Card className={cn("border-0 shadow-sm", bgVariants[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", bgVariants[variant])}>
            <Icon className={cn("w-4 h-4", variants[variant])} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={cn("text-xl font-semibold", variants[variant])}>
                {value}
              </span>
              {total !== undefined && (
                <span className="text-sm text-muted-foreground">/ {total}</span>
              )}
            </div>
            {subLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QualityMetricsGrid({ metrics, isLoading }: QualityMetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        icon={Target}
        label="Total de KRs"
        value={metrics.totalKrs}
        variant="default"
      />
      <MetricCard
        icon={CheckCircle}
        label="Atualizados no Prazo"
        value={metrics.krsUpdatedOnTime}
        total={metrics.totalKrs}
        variant="success"
      />
      <MetricCard
        icon={Clock}
        label="Atualizados com Atraso"
        value={metrics.krsUpdatedLate}
        variant="warning"
      />
      <MetricCard
        icon={AlertTriangle}
        label="Em Risco"
        value={metrics.krsAtRisk}
        variant="danger"
        subLabel="Status amarelo ou vermelho"
      />
      <MetricCard
        icon={Pause}
        label="Estagnados"
        value={metrics.krsStagnant}
        variant="warning"
        subLabel="+14 dias sem update"
      />
      <MetricCard
        icon={Ban}
        label="Iniciativas Bloqueadas"
        value={metrics.initiativesCritical}
        variant="danger"
      />
    </div>
  );
}
