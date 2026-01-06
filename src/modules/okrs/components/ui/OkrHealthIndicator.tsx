import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Heart, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type HealthStatus = 'healthy' | 'at_risk' | 'critical';

interface OkrHealthIndicatorProps {
  score: number; // 0-100
  status?: HealthStatus;
  summary?: string;
  className?: string;
  variant?: 'badge' | 'pill' | 'score';
  showScore?: boolean;
}

const statusConfig: Record<HealthStatus, { 
  label: string; 
  emoji: string;
  color: string; 
  bgColor: string;
  icon: typeof Heart;
}> = {
  healthy: {
    label: 'Saudável',
    emoji: '🟢',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: CheckCircle,
  },
  at_risk: {
    label: 'Em Risco',
    emoji: '🟡',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Crítico',
    emoji: '🔴',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: XCircle,
  },
};

function getStatusFromScore(score: number): HealthStatus {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'at_risk';
  return 'critical';
}

export function OkrHealthIndicator({ 
  score, 
  status: providedStatus,
  summary,
  className,
  variant = 'badge',
  showScore = true,
}: OkrHealthIndicatorProps) {
  const status = providedStatus || getStatusFromScore(score);
  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === 'score') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md cursor-help',
            config.bgColor,
            className
          )}>
            <div className={cn('text-lg font-bold', config.color)}>
              {score}%
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-1">
              <span>{config.emoji}</span>
              {config.label}
            </p>
            {summary && (
              <p className="text-xs text-muted-foreground">{summary}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'pill') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help',
            config.bgColor,
            config.color,
            className
          )}>
            <Icon className="w-3 h-3" />
            {showScore && <span>{score}%</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-sm">{config.label}</p>
          {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Badge variant (default)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            'cursor-help',
            config.bgColor,
            config.color,
            className
          )}
        >
          <Heart className="w-3 h-3 mr-1" />
          {config.label}
          {showScore && <span className="ml-1 font-mono text-[10px]">{score}%</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <span>{config.emoji}</span>
            Health Score: {score}%
          </p>
          {summary && (
            <p className="text-xs text-muted-foreground">{summary}</p>
          )}
          <Progress value={score} className="h-1.5" />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface RagStatusProps {
  status: 'green' | 'yellow' | 'red' | 'not_started';
  label?: string;
  className?: string;
  showLabel?: boolean;
}

const ragConfig = {
  green: { label: 'On Track', color: 'bg-green-500', textColor: 'text-green-600' },
  yellow: { label: 'Em Risco', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  red: { label: 'Off Track', color: 'bg-red-500', textColor: 'text-red-600' },
  not_started: { label: 'Não Iniciado', color: 'bg-gray-400', textColor: 'text-muted-foreground' },
};

export function RagStatusDot({ status, label, className, showLabel = false }: RagStatusProps) {
  const config = ragConfig[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full', config.color)} />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.textColor)}>
          {label || config.label}
        </span>
      )}
    </div>
  );
}

interface RagSummaryProps {
  green: number;
  yellow: number;
  red: number;
  notStarted?: number;
  className?: string;
}

export function RagSummary({ green, yellow, red, notStarted = 0, className }: RagSummaryProps) {
  const total = green + yellow + red + notStarted;
  if (total === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {green > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {green}
        </span>
      )}
      {yellow > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {yellow}
        </span>
      )}
      {red > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {red}
        </span>
      )}
      <span className="text-muted-foreground">
        {total} KR{total !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
