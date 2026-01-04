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
  type: "kr" | "update" | "alert";
  label: string;
  count?: number;
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
      { label: "MRR", value: "R$ 1.120.000", change: "+3%", changeType: "positive" },
      { label: "NRR", value: "98%", change: "+1%", changeType: "positive" },
      { label: "NPS", value: "54", change: "-2", changeType: "negative" },
      { label: "Churn", value: "2.1%", change: "-0.3%", changeType: "positive" },
    ],
    okrSummary: { onTrack: 4, atRisk: 2, offTrack: 1 },
    focusItems: [
      { type: "alert", label: "OKRs precisando de atenção", count: 3 },
      { type: "update", label: "Atualizações pendentes do time", count: 5 },
    ],
    teamStatus: {
      teamName: "Organização",
      onTrackPercent: 57,
      atRiskPercent: 29,
      offTrackPercent: 14,
    },
  },
  director: {
    role: "director",
    kpis: [
      { label: "MRR", value: "R$ 1.120.000", change: "+3%", changeType: "positive" },
      { label: "NRR", value: "98%", change: "+1%", changeType: "positive" },
      { label: "NPS", value: "54", change: "-2", changeType: "negative" },
    ],
    okrSummary: { onTrack: 3, atRisk: 2, offTrack: 1 },
    focusItems: [
      { type: "kr", label: "KRs pedindo atenção", count: 2 },
      { type: "update", label: "Check-ins pendentes", count: 3 },
    ],
    teamStatus: {
      teamName: "Diretoria",
      onTrackPercent: 50,
      atRiskPercent: 33,
      offTrackPercent: 17,
    },
  },
  leader: {
    role: "leader",
    kpis: [
      { label: "CSAT", value: "4.2", change: "+0.3", changeType: "positive" },
      { label: "Tickets Resolvidos", value: "156", change: "+12%", changeType: "positive" },
      { label: "Tempo Médio", value: "2.4h", change: "-15min", changeType: "positive" },
    ],
    okrSummary: { onTrack: 2, atRisk: 1, offTrack: 0 },
    focusItems: [
      { type: "kr", label: "KRs pedindo atenção", count: 1 },
      { type: "update", label: "Updates do time pendentes", count: 2 },
    ],
    teamStatus: {
      teamName: "Customer Success",
      onTrackPercent: 60,
      atRiskPercent: 25,
      offTrackPercent: 15,
    },
  },
  collaborator: {
    role: "collaborator",
    kpis: [
      { label: "Meus Tickets", value: "23", change: "+5", changeType: "neutral" },
      { label: "CSAT Pessoal", value: "4.5", change: "+0.2", changeType: "positive" },
    ],
    okrSummary: { onTrack: 1, atRisk: 1, offTrack: 0 },
    focusItems: [
      { type: "kr", label: "KRs para atualizar", count: 2 },
      { type: "update", label: "Check-in pendente", count: 1 },
    ],
    teamStatus: {
      teamName: "Customer Success",
      onTrackPercent: 60,
      atRiskPercent: 25,
      offTrackPercent: 15,
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
  
  // role is the app_role enum value directly (string), not an object
  const roleCategory = mapRoleToCategory(role as string | undefined);
  
  return mockDataByRole[roleCategory] || mockDataByRole.collaborator;
}
