import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Building2, Users, Grid3X3, User, Layers } from 'lucide-react';

export type OkrScope = 'org' | 'team' | 'squad' | 'individual';

interface OkrScopeBadgeProps {
  scope: OkrScope;
  teamName?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const scopeConfig: Record<OkrScope, { label: string; icon: typeof Building2; color: string }> = {
  org: {
    label: 'Organizacional',
    icon: Building2,
    color: 'bg-primary/10 text-primary border-primary/20',
  },
  team: {
    label: 'Time',
    icon: Users,
    color: 'bg-info-muted text-info-muted-foreground border-info/20',
  },
  squad: {
    label: 'Squad',
    icon: Grid3X3,
    color: 'bg-surface-administer-muted text-surface-administer-muted-foreground border-surface-administer/20',
  },
  individual: {
    label: 'Individual',
    icon: User,
    color: 'bg-status-green-muted text-status-green-muted-foreground border-status-green/20',
  },
};

export function OkrScopeBadge({ scope, teamName, className, size = 'sm' }: OkrScopeBadgeProps) {
  const config = scopeConfig[scope];
  const Icon = config.icon;
  
  const displayLabel = scope === 'team' && teamName ? teamName : config.label;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium',
        config.color,
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5',
        className
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      {displayLabel}
    </Badge>
  );
}

interface OkrTeamHierarchyProps {
  teams: string[];
  className?: string;
}

/**
 * Shows team hierarchy breadcrumb
 * Example: Tecnologia → Produto → Squad CMS
 */
export function OkrTeamHierarchy({ teams, className }: OkrTeamHierarchyProps) {
  if (teams.length === 0) return null;
  
  return (
    <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Layers className="w-3 h-3 shrink-0" />
      {teams.map((team, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && <span className="mx-1 text-muted-foreground/50">→</span>}
          <span className={cn(index === teams.length - 1 && 'font-medium text-foreground')}>
            {team}
          </span>
        </span>
      ))}
    </div>
  );
}
