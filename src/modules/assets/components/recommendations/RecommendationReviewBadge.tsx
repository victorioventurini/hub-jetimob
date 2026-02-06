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
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20",
  },
  due_soon: {
    variant: "outline",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20",
  },
  overdue: {
    variant: "destructive",
    icon: AlertCircle,
    className: "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20",
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
