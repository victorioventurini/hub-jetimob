/**
 * QbrWizardCard - Entry card for QBR ritual wizards
 * 
 * Shows the appropriate QBR wizard action based on the cycle's qbr_status.
 * Visible on Executive Dashboard (all 4 phases) and Leader Dashboard (Pre only).
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Presentation, 
  Play, 
  Calendar, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useActiveCycles } from '@/modules/okrs/hooks';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type QbrStatus = 'closed' | 'open' | 'collecting' | 'reviewing' | 'ready' | 'done';

interface QbrPhase {
  status: QbrStatus[];
  label: string;
  description: string;
  route: string;
  duration: string;
  /** Who can access this phase */
  audience: 'leader' | 'clevel' | 'bu_admin';
}

const QBR_PHASES: QbrPhase[] = [
  {
    status: ['open', 'collecting'],
    label: 'QBR Pre — Líder',
    description: 'Balanço do ciclo, KPIs e proposta de novos OKRs',
    route: '/okrs/qbr-pre',
    duration: '~30 min',
    audience: 'leader',
  },
  {
    status: ['collecting', 'reviewing'],
    label: 'QBR Pre — C-Level',
    description: 'Análise estratégica consolidada e direcionamentos',
    route: '/okrs/qbr-pre-clevel',
    duration: '~20 min',
    audience: 'clevel',
  },
  {
    status: ['reviewing'],
    label: 'Reunião QBR',
    description: 'Apresentação, aprovação de OKRs e decisões',
    route: '/okrs/qbr',
    duration: '~90 min',
    audience: 'bu_admin',
  },
  {
    status: ['ready'],
    label: 'QBR Post',
    description: 'Promoção de OKRs, ata e follow-up',
    route: '/okrs/qbr-post',
    duration: '~15 min',
    audience: 'bu_admin',
  },
];

// ============================================================
// Props
// ============================================================

export interface QbrWizardCardProps {
  /** 'executive' shows all phases, 'leader' shows only QBR Pre */
  variant?: 'executive' | 'leader';
  teamId?: string | null;
  isLoading?: boolean;
  className?: string;
}

// ============================================================
// Component
// ============================================================

export function QbrWizardCard({
  variant = 'executive',
  teamId,
  isLoading: externalLoading = false,
  className,
}: QbrWizardCardProps) {
  const supabase = useBuScopedSupabase();
  const { data: activeCycles } = useActiveCycles();

  const quarterlyCycle = useMemo(
    () => activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );

  const { data: cycleData, isLoading: statusLoading } = useQuery({
    queryKey: ['qbr', 'cycle-status-card', quarterlyCycle?.id],
    enabled: !!supabase && !!quarterlyCycle?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, qbr_status')
        .eq('id', quarterlyCycle!.id)
        .single();
      if (error) throw error;
      return data as { id: string; qbr_status: QbrStatus };
    },
  });

  const qbrStatus: QbrStatus = (cycleData?.qbr_status as QbrStatus) || 'closed';
  const isLoading = externalLoading || statusLoading;

  // Don't show card if QBR is closed
  if (!isLoading && qbrStatus === 'closed') return null;
  // Don't show if done
  if (!isLoading && qbrStatus === 'done') return null;

  // Determine which phases to show
  const phases = variant === 'leader'
    ? QBR_PHASES.filter(p => p.audience === 'leader')
    : QBR_PHASES;

  // Find the active phase
  const activePhase = phases.find(p => p.status.includes(qbrStatus));

  if (isLoading) {
    return (
      <Card className={cn("border-l-4 border-l-accent", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'leader') {
    // Simple card for leaders - just QBR Pre access
    const canAccess = qbrStatus === 'open' || qbrStatus === 'collecting';
    if (!canAccess) return null;

    return (
      <Link 
        to={teamId ? `/okrs/qbr-pre?team=${teamId}` : '/okrs/qbr-pre'} 
        className="block"
      >
        <Card
          className={cn(
            "animate-fade-in overflow-hidden transition-all hover:shadow-md cursor-pointer group",
            "border-accent/30 bg-gradient-to-r from-accent/10 to-transparent",
            className
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10 transition-transform group-hover:scale-105">
                <Presentation className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">QBR — Preparação</h3>
                  <Badge variant="secondary" className="text-xs">Trimestral</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  Balanço do ciclo e proposta de novos OKRs para o próximo trimestre
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1"
                tabIndex={-1}
              >
                Iniciar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Executive variant - full card with all phases
  return (
    <Card className={cn("border-l-4 border-l-accent", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-accent-foreground" />
            <CardTitle className="text-lg">Quarterly Business Review</CardTitle>
          </div>
          <Badge variant="secondary">Trimestral</Badge>
        </div>
        <CardDescription>
          Rito decisório trimestral — planejamento e alinhamento estratégico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase indicators */}
        <div className="space-y-2">
          {phases.map((phase, idx) => {
            const isActive = phase === activePhase;
            const isPast = phases.indexOf(phase) < (activePhase ? phases.indexOf(activePhase) : 999);

            return (
              <div
                key={phase.route}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                  isActive && "bg-accent/10 border border-accent/20",
                  isPast && "text-muted-foreground",
                  !isActive && !isPast && "text-muted-foreground/60",
                )}
              >
                {isPast ? (
                  <CheckCircle2 className="h-4 w-4 text-status-green shrink-0" />
                ) : isActive ? (
                  <Play className="h-4 w-4 text-accent-foreground shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0" />
                )}
                <span className={cn("flex-1", isActive && "font-medium text-foreground")}>
                  {phase.label}
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{phase.duration}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button for active phase */}
        {activePhase && (
          <Button asChild className="w-full gap-2">
            <Link to={activePhase.route}>
              <Play className="h-4 w-4" />
              {activePhase.label}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
