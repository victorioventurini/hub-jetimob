/**
 * RecommendationCard
 * 
 * Summary card for recommendation selection in inventory form.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecommendationScopeBadge } from "./RecommendationScopeBadge";
import { RecommendationReviewBadge } from "./RecommendationReviewBadge";
import type { AssetRecommendation } from "../../types";
import { useLastPurchaseValue } from "../../hooks";

interface RecommendationCardProps {
  recommendation: AssetRecommendation;
  onSelect: (recommendation: AssetRecommendation) => void;
  isSelected?: boolean;
  showSelectButton?: boolean;
}

export function RecommendationCard({
  recommendation,
  onSelect,
  isSelected = false,
  showSelectButton = true,
}: RecommendationCardProps) {
  const { data: lastPurchase } = useLastPurchaseValue(recommendation.id);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const categoryDisplay = recommendation.category?.parent_name
    ? `${recommendation.category.parent_name} › ${recommendation.category.name}`
    : recommendation.category?.name;

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 ${
        isSelected ? "border-primary bg-primary/5" : ""
      }`}
      onClick={() => onSelect(recommendation)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Name and badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-medium text-sm truncate">{recommendation.name}</h4>
              {recommendation.scope_type && (
                <RecommendationScopeBadge scopeType={recommendation.scope_type} />
              )}
            </div>

            {/* Brand, model, category */}
            <p className="text-sm text-muted-foreground">
              {recommendation.brand}
              {recommendation.model && ` • ${recommendation.model}`}
              {categoryDisplay && ` • ${categoryDisplay}`}
            </p>

            {/* Reference value */}
            {lastPurchase && (
              <p className="text-xs text-muted-foreground mt-1">
                Ref: {formatCurrency(lastPurchase.value)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {recommendation.review_status && (
              <RecommendationReviewBadge 
                status={recommendation.review_status} 
                showLabel={false}
              />
            )}
            
            {showSelectButton && (
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(recommendation);
                }}
              >
                {isSelected ? "Selecionado" : "Selecionar"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
