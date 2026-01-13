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
import { ALERT_BANNER_STYLES } from '@/lib/colors';

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
    bgClass: ALERT_BANNER_STYLES.overdue.bg,
    iconClass: ALERT_BANNER_STYLES.overdue.icon,
  },
  no_update: {
    icon: AlertCircle,
    defaultTitle: 'Sem atualização',
    defaultDescription: 'Este KR não foi atualizado nesta semana. Ele será destacado para seu líder.',
    variant: 'destructive',
    bgClass: ALERT_BANNER_STYLES.no_update.bg,
    iconClass: ALERT_BANNER_STYLES.no_update.icon,
  },
  blocked: {
    icon: Ban,
    defaultTitle: 'Bloqueado',
    defaultDescription: 'Esta iniciativa está bloqueada e pode impactar o progresso.',
    variant: 'destructive',
    bgClass: ALERT_BANNER_STYLES.blocked.bg,
    iconClass: ALERT_BANNER_STYLES.blocked.icon,
  },
  at_risk: {
    icon: AlertTriangle,
    defaultTitle: 'Em risco',
    defaultDescription: 'Este KR está em risco e precisa de atenção.',
    variant: 'default',
    bgClass: ALERT_BANNER_STYLES.at_risk.bg,
    iconClass: ALERT_BANNER_STYLES.at_risk.icon,
  },
  stagnant: {
    icon: TrendingDown,
    defaultTitle: 'Progresso estagnado',
    defaultDescription: 'Este KR não apresentou avanço nas últimas 2+ semanas.',
    variant: 'default',
    bgClass: ALERT_BANNER_STYLES.stagnant.bg,
    iconClass: ALERT_BANNER_STYLES.stagnant.icon,
  },
  info: {
    icon: Calendar,
    defaultTitle: 'Informação',
    defaultDescription: '',
    variant: 'default',
    bgClass: ALERT_BANNER_STYLES.info.bg,
    iconClass: ALERT_BANNER_STYLES.info.icon,
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Atenção',
    defaultDescription: '',
    variant: 'default',
    bgClass: ALERT_BANNER_STYLES.warning.bg,
    iconClass: ALERT_BANNER_STYLES.warning.icon,
  },
  success: {
    icon: Calendar,
    defaultTitle: 'Sucesso',
    defaultDescription: '',
    variant: 'default',
    bgClass: ALERT_BANNER_STYLES.success.bg,
    iconClass: ALERT_BANNER_STYLES.success.icon,
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
