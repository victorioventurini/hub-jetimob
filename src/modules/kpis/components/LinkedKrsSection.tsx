/**
 * LinkedKrsSection
 * 
 * Seção reutilizável para exibir KRs vinculadas a uma KPI/Métrica.
 * Mostra papel do vínculo (Primária/Guardrail), status RAG e link para abrir KR.
 * 
 * @see DEVELOPMENT_STANDARDS.md - Semantic colors, Link components
 * @since v2.84.0
 */

import { Link } from 'react-router-dom';
import { ExternalLink, Target, Shield, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LinkedKrData } from '../hooks/useKpiLinkedKrs';

interface LinkedKrsSectionProps {
  primaryKrs: LinkedKrData[];
  guardrailKrs: LinkedKrData[];
  isLoading?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof AlertCircle; colorClass: string; label: string }> = {
  off_track: { icon: AlertCircle, colorClass: 'text-status-red', label: 'Fora da meta' },
  at_risk: { icon: AlertCircle, colorClass: 'text-status-yellow', label: 'Em risco' },
  on_track: { icon: CheckCircle2, colorClass: 'text-status-green', label: 'No caminho' },
  no_data: { icon: Target, colorClass: 'text-muted-foreground', label: 'Sem dados' },
  completed: { icon: CheckCircle2, colorClass: 'text-status-green', label: 'Concluída' },
  cancelled: { icon: AlertCircle, colorClass: 'text-muted-foreground', label: 'Cancelada' },
};

function KrItem({ kr, role }: { kr: LinkedKrData; role: 'primary' | 'guardrail' }) {
  const statusKey = kr.kr.status || 'no_data';
  const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.no_data;
  const StatusIcon = config.icon;
  
  // Determine the route based on kr_type
  const krRoute = kr.kr_type === 'org' 
    ? `/okrs/org-view/${kr.objective?.id}` // Navigate to org objective view
    : `/okrs?kr=${kr.kr_id}`; // Navigate to team KR

  return (
    <Link
      to={krRoute}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border border-border",
        "hover:bg-muted/50 hover:border-accent/30 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {/* Role Icon */}
      <div className={cn(
        "flex-shrink-0 p-1.5 rounded-md",
        role === 'primary' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
      )}>
        {role === 'primary' ? (
          <Target className="h-4 w-4" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
            {kr.kr.title}
          </p>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Badge */}
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[10px] px-1.5 py-0",
              role === 'primary' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
            )}
          >
            {role === 'primary' ? 'Primária' : 'Guardrail'}
          </Badge>

          {/* Status Badge */}
          <Badge variant="outline" className={cn("text-[10px] gap-1", config.colorClass)}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>

          {/* Team Badge (if team KR) */}
          {kr.team && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0"
            >
              {kr.team.name}
            </Badge>
          )}

          {/* Org Badge (if org KR) */}
          {kr.kr_type === 'org' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent">
              Organizacional
            </Badge>
          )}
        </div>

        {/* Progress */}
        {kr.kr.progress !== null && (
          <div className="flex items-center gap-2">
            <Progress value={kr.kr.progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground font-medium">
              {kr.kr.progress.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function LinkedKrsSection({ 
  primaryKrs, 
  guardrailKrs, 
  isLoading = false,
  className 
}: LinkedKrsSectionProps) {
  const hasAnyKrs = primaryKrs.length > 0 || guardrailKrs.length > 0;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="font-medium text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          KRs Vinculadas
        </h3>
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-medium text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        KRs Vinculadas
      </h3>

      {!hasAnyKrs ? (
        <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border rounded-lg">
          <Target className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma KR vinculada a este indicador.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Primary KRs Section */}
          {primaryKrs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                Primária ({primaryKrs.length})
              </p>
              <div className="space-y-2">
                {primaryKrs.map((kr) => (
                  <KrItem key={kr.id} kr={kr} role="primary" />
                ))}
              </div>
            </div>
          )}

          {/* Guardrail KRs Section */}
          {guardrailKrs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Guardrails ({guardrailKrs.length})
              </p>
              <div className="space-y-2">
                {guardrailKrs.map((kr) => (
                  <KrItem key={kr.id} kr={kr} role="guardrail" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
