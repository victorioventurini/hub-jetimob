/**
 * Mock: Full participants dataset for the participants list page
 * Includes fit_score, status_inscricao, oportunidades_count
 */
import type { JobTitle, CompanyType, OperationArea } from "../types";

export type StatusInscricao = "inscrito" | "participante";
export type FitLabel = "baixo" | "medio" | "alto";

export interface ParticipantFull {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  uf: string;
  jobTitle: JobTitle;
  companyName: string;
  companyType: CompanyType;
  operationArea: OperationArea;
  eventIds: string[];
  journeyId?: string;
  year: number;
  statusInscricao: StatusInscricao;
  oportunidadesCount: number;
  fitScore: number;
  fitLabel: FitLabel;
}

export const FIT_HIGH_THRESHOLD = 80;

function deriveFitLabel(score: number): FitLabel {
  if (score >= FIT_HIGH_THRESHOLD) return "alto";
  if (score >= 50) return "medio";
  return "baixo";
}

const firstNames = [
  "Ana", "Carlos", "Maria", "João", "Fernanda", "Pedro", "Juliana", "Lucas",
  "Camila", "Rafael", "Patrícia", "Bruno", "Larissa", "Diego", "Amanda",
  "Rodrigo", "Beatriz", "Felipe", "Gabriela", "Thiago", "Mariana", "André",
  "Carolina", "Gustavo", "Isabela", "Marcos", "Natália", "Eduardo", "Vanessa",
  "Daniel", "Letícia", "Renato", "Priscila", "Vinícius", "Aline", "Roberto",
  "Talita", "Alexandre", "Débora", "Henrique", "Michele", "Leonardo", "Sandra",
  "Matheus", "Cláudia", "Paulo", "Bianca", "Ricardo", "Tatiane", "Sérgio",
];

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Ferreira",
  "Almeida", "Nascimento", "Lima", "Araújo", "Ribeiro", "Carvalho", "Gomes",
  "Martins", "Rocha", "Reis", "Moreira", "Vieira", "Nunes", "Monteiro",
  "Cardoso", "Correia", "Dias", "Barbosa",
];

const cities: { city: string; uf: string }[] = [
  { city: "Porto Alegre", uf: "RS" }, { city: "Caxias do Sul", uf: "RS" },
  { city: "Canoas", uf: "RS" }, { city: "Pelotas", uf: "RS" },
  { city: "Santa Maria", uf: "RS" }, { city: "Gravataí", uf: "RS" },
  { city: "Viamão", uf: "RS" }, { city: "Novo Hamburgo", uf: "RS" },
  { city: "São Leopoldo", uf: "RS" }, { city: "Rio Grande", uf: "RS" },
  { city: "Capão da Canoa", uf: "RS" }, { city: "Canela", uf: "RS" },
  { city: "Curitiba", uf: "PR" }, { city: "Londrina", uf: "PR" },
  { city: "Florianópolis", uf: "SC" }, { city: "Joinville", uf: "SC" },
  { city: "São Paulo", uf: "SP" }, { city: "Campinas", uf: "SP" },
];

const jobTitles: JobTitle[] = [
  "Corretor autônomo", "Gerente de vendas", "Gerente de aluguéis",
  "Diretor geral", "Assistente de locações", "Analista de marketing",
  "Gerente de marketing", "Outros",
];

const companyTypes: CompanyType[] = [
  "Imobiliária", "Incorporadora", "Loteadora",
  "Agência de marketing", "Empresa de tecnologia", "Outros",
];

const operationAreas: OperationArea[] = ["vendas", "aluguéis", "vendas e aluguéis"];

const companyNames = [
  "Imobiliária Estrela", "Imobiliária Central", "Ponto Imóveis", "Casa & Cia",
  "HabitarSC", "Morar Bem Imóveis", "Incorpora Sul", "Lotes Premium",
  "RealTech Soluções", "Digital Imobi", "Construtora Horizonte", "Viva Imóveis",
  "Nova Era Imobiliária", "Investlar", "Prédio & Lar", "Grupo Habitacional",
  "Urban Realty", "Terra Nova", "Ideal Imóveis", "Premium Locações",
];

const eventIds = [
  "evt-capao-2026", "evt-pelotas-2026", "evt-poa-2026", "evt-sm-2026", "evt-je-2026",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Seeded pseudo-random based on index */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generateParticipantsFull(): ParticipantFull[] {
  return Array.from({ length: 80 }, (_, i) => {
    const firstName = pick(firstNames, i);
    const lastName = pick(lastNames, i + 3);
    const loc = pick(cities, i);
    const rand = pseudoRandom(i);
    const fitScore = Math.round(rand * 100);
    const isParticipante = i % 5 !== 0; // ~80% attended
    const oppCount = fitScore >= 70 ? Math.floor(rand * 4) + 1 : (rand > 0.7 ? 1 : 0);
    const evtId = pick(eventIds, i);

    return {
      id: `pfull-${i + 1}`,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      phone: `(${51 + (i % 6)}) 9${String(9000 + i * 17).slice(0, 4)}-${String(1000 + i * 31).slice(0, 4)}`,
      city: loc.city,
      uf: loc.uf,
      jobTitle: pick(jobTitles, i),
      companyName: pick(companyNames, i),
      companyType: pick(companyTypes, i),
      operationArea: pick(operationAreas, i),
      eventIds: [evtId],
      journeyId: i % 3 === 0 ? "jrn-journey-2026" : undefined,
      year: 2026,
      statusInscricao: isParticipante ? "participante" : "inscrito",
      oportunidadesCount: oppCount,
      fitScore,
      fitLabel: deriveFitLabel(fitScore),
    };
  });
}

export const PARTICIPANTS_FULL_MOCK: ParticipantFull[] = generateParticipantsFull();
