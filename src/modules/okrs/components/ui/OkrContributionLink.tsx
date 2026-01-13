import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link2, ArrowUpRight, Target, Zap } from 'lucide-react';

interface OkrContributionLinkProps {
  type: 'contributes_to' | 'enables' | 'linked_to';
  targetTitle: string;
  targetType: 'org_objective' | 'org_kr' | 'team_objective' | 'team_kr';
  targetId?: string;
  className?: string;
  compact?: boolean;
}

const typeConfig = {
  contributes_to: {
    label: 'Contribui para',
    icon: ArrowUpRight,
    color: 'text-info bg-info-muted border-info/20',
  },
  enables: {
    label: 'Habilita',
    icon: Zap,
    color: 'text-surface-administer bg-surface-administer-muted border-surface-administer/20',
  },
  linked_to: {
    label: 'Vinculado a',
    icon: Link2,
    color: 'text-status-green bg-status-green-muted border-status-green/20',
  },
};

const targetTypeLabels = {
  org_objective: 'Objetivo Org',
  org_kr: 'KR Org',
  team_objective: 'Objetivo Time',
  team_kr: 'KR Time',
};

export function OkrContributionLink({ 
  type, 
  targetTitle, 
  targetType,
  targetId,
  className,
  compact = false,
}: OkrContributionLinkProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const content = (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-xs">
        {compact ? config.label : `${config.label}:`}
      </span>
      {!compact && (
        <span className="text-xs font-medium truncate max-w-[150px]">
          {targetTitle}
        </span>
      )}
    </div>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {targetId ? (
            <Link to={getTargetUrl(targetType, targetId)} className="hover:opacity-80">
              {content}
            </Link>
          ) : (
            content
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">
            <span className="font-medium">{config.label}:</span> {targetTitle}
          </p>
          <p className="text-xs text-muted-foreground">{targetTypeLabels[targetType]}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (targetId) {
    return (
      <Link to={getTargetUrl(targetType, targetId)} className="hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}

function getTargetUrl(targetType: string, targetId: string): string {
  switch (targetType) {
    case 'org_objective':
      return `/okrs/org-view/${targetId}`;
    case 'team_objective':
      return `/okrs/teams/${targetId}`;
    default:
      return `/okrs`;
  }
}

interface OkrKrTypeBadgeProps {
  type: 'contribution' | 'enabler' | 'foundational';
  className?: string;
}

const krTypeConfig = {
  contribution: {
    label: 'Contribuição',
    color: 'bg-info-muted text-info-muted-foreground border-info/20',
    icon: ArrowUpRight,
  },
  enabler: {
    label: 'Habilitador',
    color: 'bg-surface-administer-muted text-surface-administer-muted-foreground border-surface-administer/20',
    icon: Zap,
  },
  foundational: {
    label: 'Fundacional',
    color: 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/20',
    icon: Target,
  },
};

export function OkrKrTypeBadge({ type, className }: OkrKrTypeBadgeProps) {
  const config = krTypeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('text-[10px]', config.color, className)}>
      <Icon className="w-2.5 h-2.5 mr-0.5" />
      {config.label}
    </Badge>
  );
}
