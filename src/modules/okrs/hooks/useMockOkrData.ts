// Mock data for OKRs - optimized for fast rendering
import type { OkrStatus, OkrRagStatus, OkrDirection, OkrKrType } from '../types';

export interface MockOrgKr {
  id: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
}

export interface MockOrgObjective {
  id: string;
  title: string;
  description?: string;
  year: number;
  status: OkrStatus;
  key_results: MockOrgKr[];
}

export interface MockTeamKr {
  id: string;
  title: string;
  type: OkrKrType;
  baseline: number;
  current_value: number;
  target: number;
  direction: OkrDirection;
  unit: string;
  status: OkrRagStatus;
}

export interface MockTeamObjective {
  id: string;
  title: string;
  description?: string;
  team_id: string;
  team_name: string;
  org_objective_id: string;
  status: OkrStatus;
  key_results: MockTeamKr[];
}

export const mockOrgObjectives: MockOrgObjective[] = [
  {
    id: "org-1",
    title: "Crescer MRR em 40% mantendo NRR acima de 100%",
    description: "Foco em expansão de receita com clientes atuais",
    year: 2025,
    status: "active",
    key_results: [
      { id: "org-kr-1", title: "Atingir R$ 1.5M de MRR", baseline: 1080000, current_value: 1180000, target: 1500000, direction: "up", unit: "R$", status: "yellow" },
      { id: "org-kr-2", title: "Manter NRR acima de 105%", baseline: 100, current_value: 99, target: 105, direction: "up", unit: "%", status: "red" },
      { id: "org-kr-3", title: "Reduzir churn para menos de 2%", baseline: 4, current_value: 3.2, target: 2, direction: "down", unit: "%", status: "yellow" },
    ],
  },
  {
    id: "org-2",
    title: "Ser referência em experiência do cliente no mercado imobiliário",
    description: "NPS e satisfação como diferencial competitivo",
    year: 2025,
    status: "active",
    key_results: [
      { id: "org-kr-4", title: "NPS acima de 70", baseline: 56, current_value: 58, target: 70, direction: "up", unit: "pts", status: "yellow" },
      { id: "org-kr-5", title: "CSAT de suporte acima de 95%", baseline: 88, current_value: 93, target: 95, direction: "up", unit: "%", status: "green" },
      { id: "org-kr-6", title: "Tempo médio de resposta < 2h", baseline: 8, current_value: 3.5, target: 2, direction: "down", unit: "h", status: "yellow" },
    ],
  },
  {
    id: "org-3",
    title: "Lançar nova plataforma de IA para corretores",
    description: "Produto inovador usando inteligência artificial",
    year: 2025,
    status: "active",
    key_results: [
      { id: "org-kr-7", title: "MVP em produção até Q2", baseline: 0, current_value: 75, target: 100, direction: "up", unit: "%", status: "green" },
      { id: "org-kr-8", title: "100 usuários beta ativos", baseline: 0, current_value: 42, target: 100, direction: "up", unit: "", status: "yellow" },
    ],
  },
  {
    id: "org-4",
    title: "Construir cultura de alta performance",
    description: "Pessoas engajadas e time fortalecido",
    year: 2025,
    status: "active",
    key_results: [
      { id: "org-kr-9", title: "eNPS acima de 50", baseline: 35, current_value: 48, target: 50, direction: "up", unit: "pts", status: "green" },
      { id: "org-kr-10", title: "Turnover voluntário < 15%", baseline: 22, current_value: 18, target: 15, direction: "down", unit: "%", status: "yellow" },
    ],
  },
];

export const mockTeamObjectives: MockTeamObjective[] = [
  {
    id: "team-1",
    title: "Aumentar conversão de leads em 25%",
    description: "Otimizar funil de vendas com automações",
    team_id: "t1",
    team_name: "Growth",
    org_objective_id: "org-1",
    status: "active",
    key_results: [
      { id: "team-kr-1", title: "Taxa de conversão MQL→SQL de 35%", type: "contribution", baseline: 22, current_value: 28, target: 35, direction: "up", unit: "%", status: "yellow" },
      { id: "team-kr-2", title: "Ciclo de vendas < 45 dias", type: "contribution", baseline: 68, current_value: 52, target: 45, direction: "down", unit: "dias", status: "yellow" },
      { id: "team-kr-3", title: "CAC abaixo de R$ 800", type: "enabler", baseline: 1200, current_value: 950, target: 800, direction: "down", unit: "R$", status: "yellow" },
    ],
  },
  {
    id: "team-2",
    title: "Reduzir tickets de suporte em 30%",
    description: "Self-service e automação de respostas",
    team_id: "t2",
    team_name: "CS",
    org_objective_id: "org-2",
    status: "active",
    key_results: [
      { id: "team-kr-4", title: "Tickets resolvidos por IA > 40%", type: "contribution", baseline: 15, current_value: 32, target: 40, direction: "up", unit: "%", status: "green" },
      { id: "team-kr-5", title: "Base de conhecimento com 200 artigos", type: "enabler", baseline: 80, current_value: 156, target: 200, direction: "up", unit: "", status: "green" },
    ],
  },
  {
    id: "team-3",
    title: "Entregar MVP do assistente IA",
    description: "Primeira versão funcional para beta testers",
    team_id: "t3",
    team_name: "Produto",
    org_objective_id: "org-3",
    status: "active",
    key_results: [
      { id: "team-kr-6", title: "100% das features core implementadas", type: "contribution", baseline: 0, current_value: 85, target: 100, direction: "up", unit: "%", status: "green" },
      { id: "team-kr-7", title: "Uptime > 99.5%", type: "foundational", baseline: 95, current_value: 99.2, target: 99.5, direction: "up", unit: "%", status: "yellow" },
      { id: "team-kr-8", title: "< 3 bugs críticos por sprint", type: "foundational", baseline: 8, current_value: 2, target: 3, direction: "down", unit: "", status: "green" },
    ],
  },
  {
    id: "team-4",
    title: "Implementar programa de desenvolvimento",
    description: "PDIs e trilhas de carreira estruturadas",
    team_id: "t4",
    team_name: "People",
    org_objective_id: "org-4",
    status: "active",
    key_results: [
      { id: "team-kr-9", title: "100% dos colaboradores com PDI", type: "contribution", baseline: 40, current_value: 78, target: 100, direction: "up", unit: "%", status: "yellow" },
      { id: "team-kr-10", title: "90% de aderência às 1:1s", type: "enabler", baseline: 60, current_value: 88, target: 90, direction: "up", unit: "%", status: "green" },
    ],
  },
];

// Summary stats
export const getMockStats = () => {
  const allOrgKrs = mockOrgObjectives.flatMap(o => o.key_results);
  const allTeamKrs = mockTeamObjectives.flatMap(o => o.key_results);
  const allKrs = [...allOrgKrs, ...allTeamKrs];
  
  return {
    totalOrgObjectives: mockOrgObjectives.length,
    totalTeamObjectives: mockTeamObjectives.length,
    atRiskKrs: allKrs.filter(kr => kr.status === 'red').length,
    greenKrs: allKrs.filter(kr => kr.status === 'green').length,
    yellowKrs: allKrs.filter(kr => kr.status === 'yellow').length,
  };
};
