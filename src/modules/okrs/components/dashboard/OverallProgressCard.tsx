import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverallProgressCardProps {
  progress: number;
  trend?: 'up' | 'down' | 'stable';
  delta?: number;
  lastUpdateDate?: string;
  isLoading?: boolean;
}

export function OverallProgressCard({
  progress,
  trend = 'stable',
  delta = 0,
  lastUpdateDate,
  isLoading,
}: OverallProgressCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' 
    ? 'text-emerald-600' 
    : trend === 'down' 
    ? 'text-red-600' 
    : 'text-muted-foreground';

  const getProgressColor = () => {
    if (progress >= 70) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={cn(
        "absolute inset-0 opacity-5",
        getProgressColor()
      )} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>Progresso Geral</span>
          <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {delta !== 0 && (
              <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{progress.toFixed(0)}</span>
              <span className="text-xl text-muted-foreground">%</span>
            </div>
            <div className="mt-3 relative">
              <Progress 
                value={progress} 
                className="h-2.5" 
              />
              {/* Marker for expected progress based on time */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-foreground/30"
                style={{ left: `${getExpectedProgress()}%` }}
                title="Expected progress"
              />
            </div>
            {lastUpdateDate && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Updated {formatRelativeDate(lastUpdateDate)}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getExpectedProgress(): number {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  return (elapsedDays / totalDays) * 100;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}
