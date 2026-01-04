import { useAuth } from "@/hooks/useAuth";

// Mock data types
interface KpiSummary {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface OkrSummary {
  onTrack: number;
  atRisk: number;
  offTrack: number;
}

interface FocusItem {
  type: "warning" | "info" | "action";
  label: string;
}

interface TeamStatus {
  teamName: string;
  onTrackPercent: number;
  atRiskPercent: number;
  offTrackPercent: number;
}

export interface HomeDashboardData {
  role: "ceo" | "director" | "leader" | "collaborator";
  kpis: KpiSummary[];
  okrSummary: OkrSummary;
  focusItems: FocusItem[];
  teamStatus?: TeamStatus;
}

// Mock data based on role
const mockDataByRole: Record<string, HomeDashboardData> = {
  ceo: {
    role: "ceo",
    kpis: [
      { label: "MRR", value: "R$ 1.180.000", change: "+4,2%", changeType: "positive" },
      { label: "NRR", value: "99%", change: "+1pp", changeType: "positive" },
      { label: "EBITDA", value: "R$ 320.000", changeType: "neutral" },
      { label: "NPS", value: "56", change: "+3", changeType: "positive" },
    ],
    okrSummary: { onTrack: 5, atRisk: 2, offTrack: 1 },
    focusItems: [
      { type: "warning", label: "2 OKRs organizacionais em risco" },
      { type: "info", label: "Review trimestral em 5 dias" },
      { type: "action", label: "3 times aguardando alinhamento" },
    ],
    teamStatus: {
      teamName: "Toda a BU",
      onTrackPercent: 65,
      atRiskPercent: 20,
      offTrackPercent: 15,
    },
  },
  director: {
    role: "director",
    kpis: [
      { label: "MRR", value: "R$ 1.180.000", change: "+4,2%", changeType: "positive" },
      { label: "NRR", value: "99%", change: "+1pp", changeType: "positive" },
      { label: "NPS", value: "56", change: "+3", changeType: "positive" },
    ],
    okrSummary: { onTrack: 4, atRisk: 2, offTrack: 1 },
    focusItems: [
      { type: "warning", label: "1 KR precisa de atualização" },
      { type: "warning", label: "2 indicadores abaixo da meta" },
      { type: "info", label: "Reunião de área amanhã" },
    ],
    teamStatus: {
      teamName: "Diretoria de Produto",
      onTrackPercent: 70,
      atRiskPercent: 20,
      offTrackPercent: 10,
    },
  },
  leader: {
    role: "leader",
    kpis: [
      { label: "Tickets Resolvidos", value: "142", change: "+12%", changeType: "positive" },
      { label: "CSAT", value: "4.6", changeType: "neutral" },
      { label: "Tempo Médio", value: "2.4h", change: "-18%", changeType: "positive" },
    ],
    okrSummary: { onTrack: 3, atRisk: 1, offTrack: 0 },
    focusItems: [
      { type: "action", label: "2 KRs precisam de check-in" },
      { type: "warning", label: "1 membro do time sem update há 7 dias" },
    ],
    teamStatus: {
      teamName: "Customer Success",
      onTrackPercent: 75,
      atRiskPercent: 15,
      offTrackPercent: 10,
    },
  },
  collaborator: {
    role: "collaborator",
    kpis: [
      { label: "Tarefas Concluídas", value: "23", change: "+8%", changeType: "positive" },
      { label: "Em Andamento", value: "5", changeType: "neutral" },
    ],
    okrSummary: { onTrack: 2, atRisk: 1, offTrack: 0 },
    focusItems: [
      { type: "action", label: "1 KR precisa de atualização" },
      { type: "info", label: "Check-in semanal pendente" },
    ],
    teamStatus: {
      teamName: "Customer Success",
      onTrackPercent: 75,
      atRiskPercent: 15,
      offTrackPercent: 10,
    },
  },
};

function mapRoleToCategory(role?: string): "ceo" | "director" | "leader" | "collaborator" {
  if (!role) return "collaborator";
  
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes("ceo") || roleLower.includes("super_admin")) {
    return "ceo";
  }
  if (roleLower.includes("diretor") || roleLower.includes("director") || roleLower.includes("admin")) {
    return "director";
  }
  if (roleLower.includes("líder") || roleLower.includes("leader") || roleLower.includes("team_leader")) {
    return "leader";
  }
  return "collaborator";
}

export function useHomeDashboard(): HomeDashboardData {
  const { role } = useAuth();
  
  const roleCategory = mapRoleToCategory(role as string | undefined);
  
  return mockDataByRole[roleCategory] || mockDataByRole.collaborator;
}
