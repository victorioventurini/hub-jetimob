import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, PartyPopper } from "lucide-react";
import { useBirthdays } from "@/hooks/useHomeData";
import { UserLink } from "@/components/links/UserLink";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function BirthdayTodayBanner() {
  const { data: birthdays, isLoading } = useBirthdays();

  if (isLoading) return null;

  const todayBirthdays = birthdays?.filter((p) => p.daysUntil === 0) ?? [];
  if (todayBirthdays.length === 0) return null;

  return (
    <Card className="animate-slide-up border-status-pink/30 bg-status-pink-muted/40">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-status-pink/10 shrink-0">
            <PartyPopper className="h-5 w-5 text-status-pink" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Cake className="h-4 w-4 text-status-pink" />
              Hoje é dia de festa! 🎉
            </h3>
            <div className="space-y-2.5">
              {todayBirthdays.map((person) => (
                <div key={person.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border-2 border-status-pink">
                    <AvatarImage src={person.photoUrl} />
                    <AvatarFallback className="bg-status-pink-muted text-status-pink text-xs font-semibold">
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <UserLink
                      profileId={person.id}
                      displayName={person.name}
                      className="text-sm font-medium truncate block"
                    />
                    <p className="text-xs text-muted-foreground truncate">
                      {person.jobTitle} • {person.team}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Deseje parabéns! 🥳
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
