import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

interface NewJetimober {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  startDate: string;
  daysAgo: number;
}

const newJetimobers: NewJetimober[] = [
  {
    id: "1",
    name: "Ana Carolina",
    jobTitle: "Product Designer",
    team: "Design",
    startDate: "2024-01-15",
    daysAgo: 5,
  },
  {
    id: "2",
    name: "Pedro Henrique",
    jobTitle: "Software Engineer",
    team: "Engenharia",
    startDate: "2024-01-10",
    daysAgo: 10,
  },
  {
    id: "3",
    name: "Maria Fernanda",
    jobTitle: "Customer Success",
    team: "CS",
    startDate: "2024-01-08",
    daysAgo: 12,
  },
];

export function NewJetimobersBlock() {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (newJetimobers.length === 0) {
    return null;
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <UserPlus className="h-5 w-5 text-accent" />
        </div>
        <CardTitle className="text-base">Novos Jetimobers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
