import { useState } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Mail,
  Building2,
  MapPin,
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  workEmail: string;
  jobTitle: string;
  team: string;
  manager: string;
  workMode: "presencial" | "híbrido" | "remoto";
  city: string;
  state: string;
  employmentStatus: "ativo" | "férias" | "desligado";
  photoUrl?: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    firstName: "João",
    lastName: "Silva",
    displayName: "João Silva",
    workEmail: "joao.silva@jetimob.com",
    jobTitle: "Software Engineer",
    team: "Engenharia",
    manager: "Lucas Oliveira",
    workMode: "híbrido",
    city: "Porto Alegre",
    state: "RS",
    employmentStatus: "ativo",
  },
  {
    id: "2",
    firstName: "Maria",
    lastName: "Santos",
    displayName: "Maria Santos",
    workEmail: "maria.santos@jetimob.com",
    jobTitle: "Product Designer",
    team: "Design",
    manager: "Ana Costa",
    workMode: "remoto",
    city: "São Paulo",
    state: "SP",
    employmentStatus: "ativo",
  },
  {
    id: "3",
    firstName: "Pedro",
    lastName: "Oliveira",
    displayName: "Pedro Oliveira",
    workEmail: "pedro.oliveira@jetimob.com",
    jobTitle: "Customer Success",
    team: "CS",
    manager: "Fernanda Lima",
    workMode: "presencial",
    city: "Porto Alegre",
    state: "RS",
    employmentStatus: "férias",
  },
  {
    id: "4",
    firstName: "Ana",
    lastName: "Costa",
    displayName: "Ana Costa",
    workEmail: "ana.costa@jetimob.com",
    jobTitle: "Design Lead",
    team: "Design",
    manager: "Ricardo Mendes",
    workMode: "híbrido",
    city: "Florianópolis",
    state: "SC",
    employmentStatus: "ativo",
  },
  {
    id: "5",
    firstName: "Lucas",
    lastName: "Oliveira",
    displayName: "Lucas Oliveira",
    workEmail: "lucas.oliveira@jetimob.com",
    jobTitle: "Tech Lead",
    team: "Engenharia",
    manager: "Ricardo Mendes",
    workMode: "híbrido",
    city: "Porto Alegre",
    state: "RS",
    employmentStatus: "ativo",
  },
];

const workModeLabels = {
  presencial: "Presencial",
  híbrido: "Híbrido",
  remoto: "Remoto",
};

const statusColors = {
  ativo: "bg-success/10 text-success border-success/20",
  férias: "bg-warning/10 text-warning border-warning/20",
  desligado: "bg-muted text-muted-foreground border-muted",
};

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const teams = [...new Set(mockUsers.map((u) => u.team))];

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.workEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = teamFilter === "all" || user.team === teamFilter;
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.employmentStatus !== "desligado") ||
      user.employmentStatus === statusFilter;

    return matchesSearch && matchesTeam && matchesStatus;
  });

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jetimobers</h1>
            <p className="text-muted-foreground">
              Diretório de colaboradores da Jetimob
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Jetimober
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou cargo..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os times</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="férias">Férias</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} {filteredUsers.length === 1 ? "pessoa encontrada" : "pessoas encontradas"}
        </p>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Pessoa</TableHead>
                <TableHead className="font-semibold">Cargo</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Gestor</TableHead>
                <TableHead className="font-semibold">Localização</TableHead>
                <TableHead className="font-semibold">Modalidade</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoUrl} />
                        <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.workEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.jobTitle}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {user.team}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.manager}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {user.city}, {user.state}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {workModeLabels[user.workMode]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[user.employmentStatus]}
                    >
                      {user.employmentStatus.charAt(0).toUpperCase() +
                        user.employmentStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </HubLayout>
  );
}
