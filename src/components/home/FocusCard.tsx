import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusItem {
  type: "kr" | "update" | "alert";
  label: string;
  count?: number;
}

interface FocusCardProps {
  items: FocusItem[];
  title?: string;
}

export function FocusCard({ items, title = "Seu Foco" }: FocusCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "kr":
        return <Target className="h-4 w-4" />;
      case "update":
        return <RefreshCw className="h-4 w-4" />;
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case "kr":
        return "bg-primary/10 text-primary";
      case "update":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "alert":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (items.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ✨ Tudo em dia! Nenhuma pendência no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
            >
              <div className={cn("rounded-full p-2", getItemColor(item.type))}>
                {getIcon(item.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {item.count && <span className="mr-1">{item.count}</span>}
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
