/**
 * RecommendationScopeBadge
 * 
 * Visual badge showing scope type: global, team, job_title.
 */

import { Badge } from "@/components/ui/badge";
import { Globe, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationScopeType } from "../../types";
import { RECOMMENDATION_SCOPE_TYPE_LABELS } from "../../types";

interface RecommendationScopeBadgeProps {
  scopeType: RecommendationScopeType;
  showLabel?: boolean;
  className?: string;
}

const scopeConfig: Record<RecommendationScopeType, {
  icon: typeof Globe;
  className: string;
}> = {
  global: {
    icon: Globe,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  team: {
    icon: Users,
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
  job_title: {
    icon: Briefcase,
    className: "bg-purple-50 text-purple-600 border-purple-200",
  },
};

export function RecommendationScopeBadge({
  scopeType,
  showLabel = true,
  className,
}: RecommendationScopeBadgeProps) {
  const config = scopeConfig[scopeType];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && RECOMMENDATION_SCOPE_TYPE_LABELS[scopeType]}
    </Badge>
  );
}
