import { Users, Building2, Target, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickStats } from "@/hooks/useHomeData";

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}

export function QuickStats() {
  const { data, isLoading } = useQuickStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats: Stat[] = [
    {
      label: "Jetimobers",
      value: data?.totalProfiles || 0,
      change: data?.newProfilesThisMonth
        ? `+${data.newProfilesThisMonth} este mês`
        : undefined,
      changeType: data?.newProfilesThisMonth ? "positive" : undefined,
      icon: Users,
    },
    {
      label: "Times",
      value: data?.totalTeams || 0,
      icon: Building2,
    },
    {
      label: "OKRs Ativos",
      value: data?.activeOkrs || 0,
      icon: Target,
    },
    {
      label: "KRs Concluídos",
      value: data?.completedKrsPercentage ? `${data.completedKrsPercentage}%` : "—",
      icon: CheckCircle2,
    },
  ];

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
