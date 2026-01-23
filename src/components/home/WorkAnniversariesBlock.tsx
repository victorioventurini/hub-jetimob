import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";
import { useWorkAnniversaries } from "@/hooks/useHomeData";
import { EmptyState } from "@/components/ui/empty-state";
import { UserLink } from "@/components/links/UserLink";

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Hoje!";
  if (daysUntil === 1) return "Amanhã";
  return `em ${daysUntil} dias`;
}

export function WorkAnniversariesBlock() {
  const { data: workAnniversaries, isLoading } = useWorkAnniversaries();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-warning/10">
          <Award className="h-5 w-5 text-warning" />
        </div>
        <CardTitle className="text-base">
          Próximos Jet Aniversários
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!workAnniversaries || workAnniversaries.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Nenhum aniversário de empresa"
            description="Não há Jet Aniversários nos próximos 15 dias."
            iconClassName="text-warning"
            compact
          />
        ) : (
          <div className="space-y-4">
            {workAnniversaries.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-warning/30">
                  <AvatarImage src={person.photoUrl} />
                  <AvatarFallback className="bg-warning-muted text-warning text-sm font-semibold">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <UserLink
                    profileId={person.id}
                    displayName={person.name}
                    className="text-sm font-medium truncate block"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {person.jobTitle} • {person.team}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-warning">
                    {person.yearsAtCompany} {person.yearsAtCompany === 1 ? "ano" : "anos"} de Jet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDaysUntil(person.daysUntil)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
