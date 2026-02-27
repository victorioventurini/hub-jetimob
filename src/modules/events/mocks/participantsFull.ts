/**
 * Mock: Full participants dataset — aligned with jetExperienceMetrics.ts
 *
 * Totals (source of truth = jetExperienceMetrics.ts):
 *   inscritos     = 925
 *   participantes = 881
 *   leads         = 176
 *   oportunidades = 32
 */
import type { JobTitle, CompanyType, OperationArea } from "../types";
import { EVENT_DISTRIBUTION } from "./jetExperienceMetrics";

export type StatusInscricao = "inscrito" | "participante" | "lead" | "oportunidade";
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
  companyDomain?: string;
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
  { city: "Porto Alegre", uf: "RS" }, { city: "Porto Alegre", uf: "RS" },
  { city: "Porto Alegre", uf: "RS" }, { city: "Porto Alegre", uf: "RS" },
  { city: "Santa Maria", uf: "RS" }, { city: "Santa Maria", uf: "RS" },
  { city: "Pelotas", uf: "RS" }, { city: "Pelotas", uf: "RS" },
  { city: "Capão da Canoa", uf: "RS" }, { city: "Capão da Canoa", uf: "RS" },
  { city: "Caxias do Sul", uf: "RS" }, { city: "Canoas", uf: "RS" },
  { city: "Gravataí", uf: "RS" }, { city: "Novo Hamburgo", uf: "RS" },
  { city: "São Leopoldo", uf: "RS" }, { city: "Rio Grande", uf: "RS" },
  { city: "Viamão", uf: "RS" }, { city: "Passo Fundo", uf: "RS" },
  { city: "Lajeado", uf: "RS" }, { city: "Bento Gonçalves", uf: "RS" },
  { city: "Florianópolis", uf: "SC" }, { city: "Joinville", uf: "SC" },
  { city: "Balneário Camboriú", uf: "SC" },
  { city: "Curitiba", uf: "PR" },
  { city: "São Paulo", uf: "SP" },
];

const jobTitles: JobTitle[] = [
  "Analista de marketing", "Gerente de marketing", "Assessor de locações",
  "Gerente de locações", "Corretor de imóveis", "Gerente de vendas",
  "Diretor geral / Proprietário / CEO", "Outros",
];

const companyTypes: CompanyType[] = [
  "Imobiliária de vendas", "Imobiliária de aluguéis", "Imobiliária de vendas e aluguéis",
  "Corretor autônomo", "Incorporadora / loteadora", "Agência de marketing",
  "Empresa de tecnologia", "Outros",
];

const operationAreas: OperationArea[] = [
  "Venda de imóveis", "Locação", "Incorporação",
  "Loteamento", "Administração", "Avaliação",
];

const companyNames: { name: string; domain: string }[] = [
  { name: "Imobiliária Estrela", domain: "estrelaimoveis.com.br" },
  { name: "Imobiliária Central", domain: "centralimob.com.br" },
  { name: "Ponto Imóveis", domain: "pontoimoveis.com.br" },
  { name: "Casa & Cia", domain: "casaecia.com.br" },
  { name: "HabitarSC", domain: "habitarsc.com.br" },
  { name: "Morar Bem Imóveis", domain: "morarbem.com.br" },
  { name: "Incorpora Sul", domain: "incorporasul.com.br" },
  { name: "Lotes Premium", domain: "lotespremium.com.br" },
  { name: "RealTech Soluções", domain: "realtechsolucoes.com.br" },
  { name: "Digital Imobi", domain: "digitalimobi.com.br" },
  { name: "Construtora Horizonte", domain: "construtorahorizonte.com.br" },
  { name: "Viva Imóveis", domain: "vivaimoveis.com.br" },
  { name: "Nova Era Imobiliária", domain: "novaeraimob.com.br" },
  { name: "Investlar", domain: "investlar.com.br" },
  { name: "Prédio & Lar", domain: "predioelar.com.br" },
  { name: "Grupo Habitacional", domain: "grupohabitacional.com.br" },
  { name: "Urban Realty", domain: "urbanrealty.com.br" },
  { name: "Terra Nova", domain: "terranova.com.br" },
  { name: "Ideal Imóveis", domain: "idealimoveis.com.br" },
  { name: "Premium Locações", domain: "premiumlocacoes.com.br" },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Generate exactly 925 participants.
 *
 * For each event, the first `attendees` are marked present.
 * Among attendees, the first `opps` get status "oportunidade",
 * the next `leads - opps` get status "lead",
 * the rest get "participante".
 * Non-attendees get "inscrito".
 */
function generateParticipantsFull(): ParticipantFull[] {
  const participants: ParticipantFull[] = [];
  let globalIdx = 0;

  for (const target of EVENT_DISTRIBUTION) {
    for (let j = 0; j < target.registrations; j++) {
      const i = globalIdx;
      const isAttendee = j < target.attendees;

      // Fit score distribution
      const rand = pseudoRandom(i);
      let fitScore: number;
      if (rand < 0.30) {
        fitScore = 80 + Math.round(pseudoRandom(i + 1) * 20);
      } else if (rand < 0.65) {
        fitScore = 50 + Math.round(pseudoRandom(i + 2) * 29);
      } else {
        fitScore = 10 + Math.round(pseudoRandom(i + 3) * 39);
      }

      // Deterministic status assignment based on position within event
      let statusInscricao: StatusInscricao;
      let oppCount = 0;
      if (!isAttendee) {
        statusInscricao = "inscrito";
      } else if (j < target.opps) {
        statusInscricao = "oportunidade";
        oppCount = 1;
      } else if (j < target.leads) {
        statusInscricao = "lead";
      } else {
        statusInscricao = "participante";
      }

      const firstName = pick(firstNames, i);
      const lastName = pick(lastNames, i + 3);
      const loc = pick(cities, i);

      participants.push({
        id: `pfull-${i + 1}`,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        phone: `(${51 + (i % 6)}) 9${String(9000 + i * 17).slice(0, 4)}-${String(1000 + i * 31).slice(0, 4)}`,
        city: loc.city,
        uf: loc.uf,
        jobTitle: pick(jobTitles, i),
        companyName: pick(companyNames, i).name,
        companyDomain: pick(companyNames, i).domain,
        companyType: pick(companyTypes, i),
        operationArea: pick(operationAreas, i),
        eventIds: [target.eventId],
        journeyId: "jrn-journey-2026",
        year: 2026,
        statusInscricao,
        oportunidadesCount: oppCount,
        fitScore,
        fitLabel: deriveFitLabel(fitScore),
      });

      globalIdx++;
    }
  }

  return participants;
}

export const PARTICIPANTS_FULL_MOCK: ParticipantFull[] = generateParticipantsFull();
