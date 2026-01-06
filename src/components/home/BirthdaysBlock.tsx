import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake } from "lucide-react";
import { useBirthdays } from "@/hooks/useHomeData";
import { EmptyState } from "@/components/ui/empty-state";
import { UserLink } from "@/components/links/UserLink";

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function BirthdaysBlock() {
  const { data: birthdays, isLoading } = useBirthdays();
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];

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
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-rose-500/10">
          <Cake className="h-5 w-5 text-rose-500" />
        </div>
        <CardTitle className="text-base">
          Aniversários de {currentMonthName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!birthdays || birthdays.length === 0 ? (
          <EmptyState
            icon={Cake}
            title="Nenhum aniversário"
            description={`Não há aniversários em ${currentMonthName}.`}
            iconClassName="text-rose-500"
            compact
          />
        ) : (
          <div className="space-y-4">
            {birthdays.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-rose-200">
                  <AvatarImage src={person.photoUrl} />
                  <AvatarFallback className="bg-rose-50 text-rose-500 text-sm font-semibold">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <UserLink
                    userId={person.id}
                    displayName={person.name}
                    className="text-sm font-medium truncate block"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {person.jobTitle} • {person.team}
                  </p>
                </div>
                <span className="text-sm font-semibold text-rose-500 shrink-0">
                  {person.birthDay}/{person.birthMonth.toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
