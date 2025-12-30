import { Users, Building2, Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

const stats: Stat[] = [
  {
    label: "Jetimobers",
    value: 127,
    change: "+5 este mês",
    changeType: "positive",
    icon: Users,
  },
  {
    label: "Times",
    value: 12,
    icon: Building2,
  },
  {
    label: "OKRs Ativos",
    value: 34,
    icon: Target,
  },
  {
    label: "KRs Concluídos",
    value: "68%",
    change: "+12% vs Q3",
    changeType: "positive",
    icon: CheckCircle2,
  },
];

export function QuickStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
              {stat.change && (
                <p
                  className={`text-xs mt-2 ${
                    stat.changeType === "positive"
                      ? "text-success"
                      : stat.changeType === "negative"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {stat.change}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
