/**
 * WizardStepHeader - Header reutilizável para steps de wizard
 * 
 * Elimina duplicação do padrão:
 * - Ícone + título + descrição
 * - Gradient background
 * - Badges de status
 */

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type WizardHeaderVariant = 
  | 'default' 
  | 'primary' 
  | 'amber' 
  | 'green' 
  | 'red' 
  | 'purple';

export interface WizardStepHeaderProps {
  /** Step icon */
  icon: LucideIcon;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Color variant */
  variant?: WizardHeaderVariant;
  /** Optional badge text */
  badge?: string;
  /** Badge variant */
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Right content (e.g., counter, actions) */
  rightContent?: ReactNode;
  /** Additional class */
  className?: string;
}

// ============================================================
// VARIANT STYLES
// ============================================================

const VARIANT_STYLES: Record<WizardHeaderVariant, {
  gradient: string;
  iconBg: string;
  iconColor: string;
}> = {
  default: {
    gradient: 'from-muted/50 to-transparent',
    iconBg: 'bg-muted',
    iconColor: 'text-foreground',
  },
  primary: {
    gradient: 'from-primary/5 to-transparent',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  amber: {
    gradient: 'from-status-amber/10 to-transparent',
    iconBg: 'bg-status-amber-muted',
    iconColor: 'text-status-amber',
  },
  green: {
    gradient: 'from-status-green/10 to-transparent',
    iconBg: 'bg-status-green-muted',
    iconColor: 'text-status-green',
  },
  red: {
    gradient: 'from-status-red/10 to-transparent',
    iconBg: 'bg-status-red-muted',
    iconColor: 'text-status-red',
  },
  purple: {
    gradient: 'from-status-purple/10 to-transparent',
    iconBg: 'bg-status-purple-muted',
    iconColor: 'text-status-purple',
  },
};

// ============================================================
// COMPONENT
// ============================================================

export function WizardStepHeader({
  icon: Icon,
  title,
  description,
  variant = 'default',
  badge,
  badgeVariant = 'secondary',
  rightContent,
  className,
}: WizardStepHeaderProps) {
  const styles = VARIANT_STYLES[variant];
  
  return (
    <div className={cn(
      'px-6 py-4 border-b',
      `bg-gradient-to-r ${styles.gradient}`,
      className
    )}>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn('p-2 rounded-lg shrink-0', styles.iconBg)}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-lg truncate">{title}</h3>
              {badge && (
                <Badge variant={badgeVariant} className="shrink-0">{badge}</Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        
        {rightContent && (
          <div className="flex items-center gap-2 shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}
