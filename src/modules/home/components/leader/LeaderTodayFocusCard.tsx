/**
 * LeaderTodayFocusCard - Shows top 3 actionable items for today
 */
import { Link } from "react-router-dom";
import { Zap, AlertCircle, Info, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FocusItem } from "../../types";

interface LeaderTodayFocusCardProps {
  items: FocusItem[];
  isLoading?: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  warning: AlertCircle,
  action: Zap,
  info: Info,
};

const typeStyles: Record<string, { icon: string; bg: string }> = {
  warning: { icon: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  action: { icon: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  info: { icon: "text-muted-foreground", bg: "bg-muted" },
};

export function LeaderTodayFocusCard({ items, isLoading }: LeaderTodayFocusCardProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Hoje seu foco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state when no focus items
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Hoje seu foco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Tudo em dia!
            </p>
            <p className="text-sm text-muted-foreground">
              Não há pendências para hoje. Continue assim.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Hoje seu foco
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = typeIcons[item.type] || Info;
            const style = typeStyles[item.type] || typeStyles.info;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${style.bg}`}>
                    <Icon className={`h-4 w-4 ${style.icon}`} />
                  </div>
                  <span className="font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
                {item.url && item.cta && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-primary"
                  >
                    <Link to={item.url}>
                      {item.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
