/**
 * RecommendationReviewBadge
 * 
 * Visual badge showing review status: up_to_date, due_soon, overdue.
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationReviewStatus } from "../../types";
import { RECOMMENDATION_REVIEW_STATUS_LABELS } from "../../types";

interface RecommendationReviewBadgeProps {
  status: RecommendationReviewStatus;
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<RecommendationReviewStatus, {
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: typeof CheckCircle2;
  className: string;
}> = {
  up_to_date: {
    variant: "default",
    icon: CheckCircle2,
    className: "bg-success-muted text-success-muted-foreground border-success/30 hover:bg-success-muted/80",
  },
  due_soon: {
    variant: "outline",
    icon: Clock,
    className: "bg-warning-muted text-warning-muted-foreground border-warning/30 hover:bg-warning-muted/80",
  },
  overdue: {
    variant: "destructive",
    icon: AlertCircle,
    className: "bg-danger-muted text-danger-muted-foreground border-danger/30 hover:bg-danger-muted/80",
  },
};

export function RecommendationReviewBadge({
  status,
  showLabel = true,
  className,
}: RecommendationReviewBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && RECOMMENDATION_REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
