import { useState } from "react";
import { HubLayout } from "@/components/layout/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  Building2,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  trend: "up" | "down" | "neutral";
  owner: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: "on_track" | "at_risk" | "behind";
  owner: string;
  ownerType: "team" | "individual";
  teamName?: string;
  keyResults: KeyResult[];
}

const mockObjectives: Objective[] = [
  {
    id: "1",
    title: "Aumentar a satisfação dos clientes",
    description: "Melhorar a experiência do cliente em todos os pontos de contato",
    progress: 72,
    status: "on_track",
    owner: "Customer Success",
    ownerType: "team",
    teamName: "Customer Success",
    keyResults: [
      {
        id: "kr1",
        title: "Aumentar NPS para 75",
        currentValue: 68,
        targetValue: 75,
        unit: "pontos",
        progress: 85,
        trend: "up",
        owner: "Fernanda Lima",
      },
      {
        id: "kr2",
        title: "Reduzir tempo médio de resposta para 2h",
        currentValue: 3.2,
        targetValue: 2,
        unit: "horas",
        progress: 60,
        trend: "up",
        owner: "Pedro Santos",
      },
      {
        id: "kr3",
        title: "Atingir 95% de CSAT no suporte",
        currentValue: 91,
        targetValue: 95,
        unit: "%",
        progress: 72,
        trend: "neutral",
        owner: "Maria Silva",
      },
    ],
  },
  {
    id: "2",
    title: "Acelerar o crescimento de receita",
    description: "Expandir a base de clientes e aumentar o ticket médio",
    progress: 58,
    status: "at_risk",
    owner: "Vendas",
    ownerType: "team",
    teamName: "Vendas",
    keyResults: [
      {
        id: "kr4",
        title: "Atingir R$ 2M em MRR",
        currentValue: 1.6,
        targetValue: 2,
        unit: "M",
        progress: 80,
        trend: "up",
        owner: "Marcos Almeida",
      },
      {
        id: "kr5",
        title: "Conquistar 50 novos clientes",
        currentValue: 28,
        targetValue: 50,
        unit: "clientes",
        progress: 56,
        trend: "down",
        owner: "Ana Paula",
      },
      {
        id: "kr6",
        title: "Aumentar ticket médio em 20%",
        currentValue: 12,
        targetValue: 20,
        unit: "%",
        progress: 60,
        trend: "neutral",
        owner: "Carlos Mendes",
      },
    ],
  },
  {
    id: "3",
    title: "Melhorar a qualidade do produto",
    description: "Reduzir bugs e aumentar a estabilidade da plataforma",
    progress: 85,
    status: "on_track",
    owner: "Engenharia",
    ownerType: "team",
    teamName: "Engenharia",
    keyResults: [
      {
        id: "kr7",
        title: "Reduzir bugs críticos em 50%",
        currentValue: 60,
        targetValue: 50,
        unit: "%",
        progress: 100,
        trend: "up",
        owner: "Lucas Oliveira",
      },
      {
        id: "kr8",
        title: "Atingir 99.9% de uptime",
        currentValue: 99.7,
        targetValue: 99.9,
        unit: "%",
        progress: 80,
        trend: "up",
        owner: "Diego Costa",
      },
      {
        id: "kr9",
        title: "Reduzir tempo de deploy para 10min",
        currentValue: 18,
        targetValue: 10,
        unit: "min",
        progress: 75,
        trend: "up",
        owner: "Julia Ramos",
      },
    ],
  },
];

const statusConfig = {
  on_track: {
    label: "No caminho",
    color: "bg-success/10 text-success border-success/20",
  },
  at_risk: {
    label: "Em risco",
    color: "bg-warning/10 text-warning border-warning/20",
  },
  behind: {
    label: "Atrasado",
    color: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function ObjectiveCard({ objective }: { objective: Objective }) {
  const [expanded, setExpanded] = useState(true);
  const status = statusConfig[objective.status];

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-accent/10 mt-0.5">
            <Target className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{objective.title}</CardTitle>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {objective.description}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{objective.teamName}</span>
              </div>
              <div className="flex-1 max-w-48">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold">{objective.progress}%</span>
                </div>
                <Progress value={objective.progress} className="h-2" />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" className="shrink-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Key Results
            </p>
            {objective.keyResults.map((kr, index) => (
              <div
                key={kr.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {kr.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {kr.owner}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {kr.currentValue} / {kr.targetValue} {kr.unit}
                    </span>
                  </div>
                </div>
                <TrendIcon trend={kr.trend} />
                <div className="w-24">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="sr-only">Progresso</span>
                    <span className="font-semibold ml-auto">{kr.progress}%</span>
                  </div>
                  <Progress value={kr.progress} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function OKRs() {
  const [cycleFilter, setCycleFilter] = useState("q1-2024");

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">OKRs</h1>
            <p className="text-muted-foreground">
              Objetivos e Resultados-Chave da Jetimob
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="q1-2024">Q1 2024</SelectItem>
                <SelectItem value="q4-2023">Q4 2023</SelectItem>
                <SelectItem value="q3-2023">Q3 2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo OKR
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {mockObjectives.length}
              </p>
              <p className="text-sm text-muted-foreground">Objetivos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {mockObjectives.reduce((acc, o) => acc + o.keyResults.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Key Results</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {Math.round(
                  mockObjectives.reduce((acc, o) => acc + o.progress, 0) /
                    mockObjectives.length
                )}
                %
              </p>
              <p className="text-sm text-muted-foreground">Progresso médio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-success">
                {mockObjectives.filter((o) => o.status === "on_track").length}
              </p>
              <p className="text-sm text-muted-foreground">No caminho</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="team">Times</TabsTrigger>
            <TabsTrigger value="individual">Individuais</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {mockObjectives.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} />
            ))}
          </TabsContent>

          <TabsContent value="company">
            <div className="text-center py-12 text-muted-foreground">
              Nenhum OKR de empresa cadastrado
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            {mockObjectives
              .filter((o) => o.ownerType === "team")
              .map((objective) => (
                <ObjectiveCard key={objective.id} objective={objective} />
              ))}
          </TabsContent>

          <TabsContent value="individual">
            <div className="text-center py-12 text-muted-foreground">
              Nenhum OKR individual cadastrado
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
