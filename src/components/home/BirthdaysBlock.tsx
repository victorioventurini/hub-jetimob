import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";

interface Birthday {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  birthDay: number;
  birthMonth: number;
}

const birthdays: Birthday[] = [
  {
    id: "1",
    name: "Lucas Oliveira",
    jobTitle: "Tech Lead",
    team: "Engenharia",
    birthDay: 20,
    birthMonth: 1,
  },
  {
    id: "2",
    name: "Juliana Santos",
    jobTitle: "Product Manager",
    team: "Produto",
    birthDay: 23,
    birthMonth: 1,
  },
  {
    id: "3",
    name: "Rafael Costa",
    jobTitle: "Sales Rep",
    team: "Vendas",
    birthDay: 28,
    birthMonth: 1,
  },
];

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function BirthdaysBlock() {
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (birthdays.length === 0) {
    return null;
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
      <CardContent className="space-y-4">
        {birthdays.map((person) => (
          <div key={person.id} className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-rose-200">
              <AvatarImage src={person.photoUrl} />
              <AvatarFallback className="bg-rose-50 text-rose-500 text-sm font-semibold">
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
            <span className="text-sm font-semibold text-rose-500 shrink-0">
              {person.birthDay}/{person.birthMonth.toString().padStart(2, "0")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
