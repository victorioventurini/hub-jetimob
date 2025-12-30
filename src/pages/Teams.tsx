import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Team {
  id: string;
  name: string;
  description: string;
  leader: {
    name: string;
    photoUrl?: string;
  };
  memberCount: number;
  parentTeam?: string;
  childTeams?: string[];
  status: "active" | "inactive";
}

const mockTeams: Team[] = [
  {
    id: "1",
    name: "Engenharia",
    description: "Desenvolvimento de produto e infraestrutura",
    leader: { name: "Lucas Oliveira" },
    memberCount: 24,
    childTeams: ["Backend", "Frontend", "DevOps"],
    status: "active",
  },
  {
    id: "2",
    name: "Design",
    description: "Design de produto e experiência do usuário",
    leader: { name: "Ana Costa" },
    memberCount: 8,
    status: "active",
  },
  {
    id: "3",
    name: "Produto",
    description: "Estratégia e gestão de produto",
    leader: { name: "Ricardo Mendes" },
    memberCount: 6,
    status: "active",
  },
  {
    id: "4",
    name: "Customer Success",
    description: "Sucesso e satisfação do cliente",
    leader: { name: "Fernanda Lima" },
    memberCount: 18,
    childTeams: ["Onboarding", "Suporte", "Relacionamento"],
    status: "active",
  },
  {
    id: "5",
    name: "Vendas",
    description: "Comercial e novas contas",
    leader: { name: "Marcos Almeida" },
    memberCount: 15,
    childTeams: ["SDR", "Executivos"],
    status: "active",
  },
  {
    id: "6",
    name: "Marketing",
    description: "Branding, conteúdo e growth",
    leader: { name: "Carolina Nunes" },
    memberCount: 7,
    status: "active",
  },
];

export default function Teams() {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Times</h1>
            <p className="text-muted-foreground">
              Estrutura organizacional da Jetimob
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">Ver Organograma</Button>
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Time
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{mockTeams.length}</p>
              <p className="text-sm text-muted-foreground">Times ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {mockTeams.reduce((acc, t) => acc + t.memberCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total de pessoas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {mockTeams.filter((t) => t.childTeams).length}
              </p>
              <p className="text-sm text-muted-foreground">Times pai</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {Math.round(
                  mockTeams.reduce((acc, t) => acc + t.memberCount, 0) /
                    mockTeams.length
                )}
              </p>
              <p className="text-sm text-muted-foreground">Média por time</p>
            </CardContent>
          </Card>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTeams.map((team) => (
            <Card
              key={team.id}
              className="group hover:shadow-lg hover:border-accent/30 transition-all duration-200 cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {team.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Leader */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={team.leader.photoUrl} />
                    <AvatarFallback className="bg-accent/10 text-accent text-xs font-semibold">
                      {getInitials(team.leader.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{team.leader.name}</p>
                    <p className="text-xs text-muted-foreground">Líder</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{team.memberCount} pessoas</span>
                  </div>
                  {team.childTeams && (
                    <Badge variant="secondary" className="text-xs">
                      {team.childTeams.length} sub-times
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  );
}
