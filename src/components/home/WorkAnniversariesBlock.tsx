import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface WorkAnniversary {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  startDate: string;
  yearsAtCompany: number;
  anniversaryDay: number;
}

const workAnniversaries: WorkAnniversary[] = [
  {
    id: "1",
    name: "Fernanda Lima",
    jobTitle: "Senior Developer",
    team: "Engenharia",
    startDate: "2020-01-18",
    yearsAtCompany: 4,
    anniversaryDay: 18,
  },
  {
    id: "2",
    name: "Carlos Mendes",
    jobTitle: "Account Executive",
    team: "Vendas",
    startDate: "2022-01-25",
    yearsAtCompany: 2,
    anniversaryDay: 25,
  },
];

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function WorkAnniversariesBlock() {
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthName = monthNames[currentMonth - 1];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (workAnniversaries.length === 0) {
    return null;
  }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Award className="h-5 w-5 text-amber-500" />
        </div>
        <CardTitle className="text-base">
          Aniversários de Empresa - {currentMonthName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workAnniversaries.map((person) => (
          <div key={person.id} className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-amber-200">
              <AvatarImage src={person.photoUrl} />
              <AvatarFallback className="bg-amber-50 text-amber-600 text-sm font-semibold">
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
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-amber-600">
                {person.yearsAtCompany} {person.yearsAtCompany === 1 ? "ano" : "anos"}
              </p>
              <p className="text-xs text-muted-foreground">
                dia {person.anniversaryDay}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
