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
    gradient: 'from-amber-500/10 to-transparent',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600',
  },
  green: {
    gradient: 'from-green-500/10 to-transparent',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600',
  },
  red: {
    gradient: 'from-red-500/10 to-transparent',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600',
  },
  purple: {
    gradient: 'from-purple-500/10 to-transparent',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600',
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', styles.iconBg)}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{title}</h3>
              {badge && (
                <Badge variant={badgeVariant}>{badge}</Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}
