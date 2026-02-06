/**
 * InfoNotice - Componente global para avisos informativos
 * 
 * Uso: frases de atenção em páginas, wizards, formulários.
 * Segue o padrão de cores do Hub (ALERT_BANNER_STYLES).
 */

import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALERT_BANNER_STYLES } from '@/lib/colors';

export type InfoNoticeVariant = 'warning' | 'info' | 'success' | 'error';

export interface InfoNoticeProps {
  children: React.ReactNode;
  variant?: InfoNoticeVariant;
  className?: string;
}

const VARIANT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    styles: ALERT_BANNER_STYLES.warning,
  },
  info: {
    icon: Info,
    styles: ALERT_BANNER_STYLES.info,
  },
  success: {
    icon: CheckCircle,
    styles: ALERT_BANNER_STYLES.success,
  },
  error: {
    icon: AlertCircle,
    styles: ALERT_BANNER_STYLES.no_update,
  },
};

export function InfoNotice({ 
  children, 
  variant = 'info',
  className 
}: InfoNoticeProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div 
      role="alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm",
        config.styles.bg,
        className
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", config.styles.icon)} />
      <span>{children}</span>
    </div>
  );
}
