import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusItem {
  type: "warning" | "info" | "action";
  label: string;
}

interface FocusCardProps {
  items: FocusItem[];
  title?: string;
}

export function FocusCard({ items, title = "Seu Foco" }: FocusCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      case "action":
        return <Zap className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "info":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
      case "action":
        return "bg-primary/10 text-primary";
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
            ✨ Tudo em dia! Nenhuma pendência.
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
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-2.5"
            >
              <div className={cn("rounded-full p-1.5", getItemColor(item.type))}>
                {getIcon(item.type)}
              </div>
              <p className="text-sm text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
