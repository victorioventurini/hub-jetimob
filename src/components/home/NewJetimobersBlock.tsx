import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import { useNewJetimobers } from "@/hooks/useHomeData";
import { EmptyState } from "@/components/ui/empty-state";

export function NewJetimobersBlock() {
  const { data: newJetimobers, isLoading } = useNewJetimobers(5);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (isLoading) {
    return (
      <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <UserPlus className="h-5 w-5 text-accent" />
        </div>
        <CardTitle className="text-base">Novos Jetimobers</CardTitle>
      </CardHeader>
      <CardContent>
        {!newJetimobers || newJetimobers.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="Nenhum novo Jetimober"
            description="Não há novos colaboradores nos últimos 60 dias."
            compact
          />
        ) : (
          <div className="space-y-4">
            {newJetimobers.map((person) => (
              <div key={person.id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-accent/20">
                  <AvatarImage src={person.photoUrl} />
                  <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {person.jobTitle} • {person.team}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {person.daysAgo}d atrás
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
