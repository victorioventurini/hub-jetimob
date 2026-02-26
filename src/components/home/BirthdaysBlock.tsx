import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake } from "lucide-react";
import { useBirthdays } from "@/hooks/useHomeData";
import { EmptyState } from "@/components/ui/empty-state";
import { UserLink } from "@/components/links/UserLink";

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Hoje!";
  if (daysUntil === 1) return "Amanhã";
  return `em ${daysUntil} dias`;
}

export function BirthdaysBlock() {
  const { data: birthdays, isLoading } = useBirthdays();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-status-pink-muted">
          <Cake className="h-5 w-5 text-status-pink" />
        </div>
        <CardTitle className="text-base">
          Próximos Aniversários
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!birthdays || birthdays.length === 0 ? (
          <EmptyState
            icon={Cake}
            title="Nenhum aniversário"
            description="Não há aniversários nos próximos 15 dias."
            iconClassName="text-status-pink"
            compact
          />
        ) : (
          <div className="space-y-4">
            {birthdays.map((person) => {
              const isToday = person.daysUntil === 0;
              return (
                <div
                  key={person.id}
                  className={`flex items-center gap-3 rounded-lg p-2 -mx-2 ${isToday ? "bg-status-pink-muted/50" : ""}`}
                >
                  <Avatar className={`h-10 w-10 border-2 ${isToday ? "border-status-pink" : "border-status-pink/30"}`}>
                    <AvatarImage src={person.photoUrl} />
                    <AvatarFallback className="bg-status-pink-muted text-status-pink text-sm font-semibold">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <UserLink
                        profileId={person.id}
                        displayName={person.name}
                        className="text-sm font-medium truncate"
                      />
                      {isToday && (
                        <Badge className="bg-status-pink text-white text-[10px] px-1.5 py-0 shrink-0">
                          Hoje! 🎉
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {person.jobTitle} • {person.team}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-status-pink">
                      {person.birthDay}/{person.birthMonth.toString().padStart(2, "0")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {formatDaysUntil(person.daysUntil)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
