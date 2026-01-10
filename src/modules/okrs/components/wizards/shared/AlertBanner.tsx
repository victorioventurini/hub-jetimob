/**
 * AlertBanner - Banners de alerta para os wizards
 * 
 * Exibe alertas visuais como:
 * - Atualização fora do prazo
 * - KR sem atualização
 * - Iniciativa bloqueada
 * - Riscos detectados
 */

import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle,
  Ban,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export type AlertBannerType = 
  | 'overdue'           // Atualizado fora do prazo
  | 'no_update'         // Sem atualização
  | 'blocked'           // Bloqueado
  | 'at_risk'           // Em risco
  | 'stagnant'          // Estagnado
  | 'info'              // Informativo
  | 'warning'           // Aviso genérico
  | 'success';          // Sucesso

export interface AlertBannerProps {
  type: AlertBannerType;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

// ============================================================
// CONFIG
// ============================================================

interface AlertConfig {
  icon: typeof AlertTriangle;
  defaultTitle: string;
  defaultDescription: string;
  variant: 'default' | 'destructive';
  bgClass: string;
  iconClass: string;
}

const ALERT_CONFIG: Record<AlertBannerType, AlertConfig> = {
  overdue: {
    icon: Clock,
    defaultTitle: 'Atualizado fora do prazo',
    defaultDescription: 'Este KR foi atualizado após o horário recomendado. Sem problema — mas sinalizamos para manter previsibilidade no check-in.',
    variant: 'default',
    bgClass: 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20',
    iconClass: 'text-orange-500',
  },
  no_update: {
    icon: AlertCircle,
    defaultTitle: 'Sem atualização',
    defaultDescription: 'Este KR não foi atualizado nesta semana. Ele será destacado para seu líder.',
    variant: 'destructive',
    bgClass: 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10',
    iconClass: 'text-destructive',
  },
  blocked: {
    icon: Ban,
    defaultTitle: 'Bloqueado',
    defaultDescription: 'Esta iniciativa está bloqueada e pode impactar o progresso.',
    variant: 'destructive',
    bgClass: 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10',
    iconClass: 'text-destructive',
  },
  at_risk: {
    icon: AlertTriangle,
    defaultTitle: 'Em risco',
    defaultDescription: 'Este KR está em risco e precisa de atenção.',
    variant: 'default',
    bgClass: 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
  },
  stagnant: {
    icon: TrendingDown,
    defaultTitle: 'Progresso estagnado',
    defaultDescription: 'Este KR não apresentou avanço nas últimas 2+ semanas.',
    variant: 'default',
    bgClass: 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20',
    iconClass: 'text-orange-500',
  },
  info: {
    icon: Calendar,
    defaultTitle: 'Informação',
    defaultDescription: '',
    variant: 'default',
    bgClass: 'border-primary/30 bg-primary/5 dark:bg-primary/10',
    iconClass: 'text-primary',
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Atenção',
    defaultDescription: '',
    variant: 'default',
    bgClass: 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
  },
  success: {
    icon: Calendar,
    defaultTitle: 'Sucesso',
    defaultDescription: '',
    variant: 'default',
    bgClass: 'border-green-300 bg-green-50/50 dark:bg-green-950/20',
    iconClass: 'text-green-600 dark:text-green-400',
  },
};

// ============================================================
// COMPONENT
// ============================================================

export function AlertBanner({
  type,
  title,
  description,
  children,
  className,
  compact = false,
}: AlertBannerProps) {
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
          config.bgClass,
          className
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconClass)} />
        <span className="font-medium">{displayTitle}</span>
        {displayDescription && (
          <span className="text-muted-foreground">— {displayDescription}</span>
        )}
      </div>
    );
  }

  return (
    <Alert 
      variant={config.variant}
      className={cn(config.bgClass, className)}
    >
      <Icon className={cn("h-4 w-4", config.iconClass)} />
      <AlertTitle>{displayTitle}</AlertTitle>
      {(displayDescription || children) && (
        <AlertDescription>
          {displayDescription}
          {children}
        </AlertDescription>
      )}
    </Alert>
  );
}

// ============================================================
// PRE-BUILT ALERT COMPONENTS
// ============================================================

export function OverdueAlert({ 
  daysLate, 
  className 
}: { 
  daysLate?: number; 
  className?: string;
}) {
  return (
    <AlertBanner
      type="overdue"
      description={
        daysLate 
          ? `Check-in atrasado em ${daysLate} dia${daysLate > 1 ? 's' : ''}.`
          : undefined
      }
      compact
      className={className}
    />
  );
}

export function NoUpdateAlert({ 
  daysSinceUpdate, 
  className 
}: { 
  daysSinceUpdate?: number; 
  className?: string;
}) {
  return (
    <AlertBanner
      type="no_update"
      description={
        daysSinceUpdate 
          ? `Sem atualização há ${daysSinceUpdate} dias.`
          : undefined
      }
      compact
      className={className}
    />
  );
}

export function StagnantAlert({ 
  weeks = 2, 
  className 
}: { 
  weeks?: number; 
  className?: string;
}) {
  return (
    <AlertBanner
      type="stagnant"
      description={`Sem avanço há ${weeks}+ semanas.`}
      compact
      className={className}
    />
  );
}
