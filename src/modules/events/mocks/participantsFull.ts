/**
 * Mock: Full participants dataset for the participants list page
 * Alinhado com os dados de events.ts e eventSettings.ts
 *
 * Totais por evento (fonte de verdade = events.ts):
 *   evt-sm-2026:       55 inscritos /  51 participantes
 *   evt-pelotas-2026:  47 inscritos /  45 participantes
 *   evt-capao-2026:    62 inscritos /  53 participantes
 *   evt-poa-2026:      49 inscritos /  45 participantes
 *   evt-je-2026:      712 inscritos / 687 participantes
 *   TOTAL:            925 inscritos / 881 participantes
 *
 * Estratégia: gerar exatamente 925 participantes únicos, um por inscrição.
 * Cada participante pertence a exatamente 1 evento primário.
 * Os primeiros N participantes de cada evento (= totalAttendees) são marcados como presentes.
 */
import type { JobTitle, CompanyType, OperationArea } from "../types";
import { OPPORTUNITIES_MOCK } from "./opportunities";

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

/**
 * Distribuição geográfica: ~80% RS (cidades-sede dos eventos + região metropolitana),
 * ~12% SC, ~5% PR, ~3% SP — coerente com eventos realizados no RS.
 */
const cities: { city: string; uf: string }[] = [
  // RS — cidades-sede dos eventos (peso alto)
  { city: "Porto Alegre", uf: "RS" },
  { city: "Porto Alegre", uf: "RS" },
  { city: "Porto Alegre", uf: "RS" },
  { city: "Porto Alegre", uf: "RS" },
  { city: "Santa Maria", uf: "RS" },
  { city: "Santa Maria", uf: "RS" },
  { city: "Pelotas", uf: "RS" },
  { city: "Pelotas", uf: "RS" },
  { city: "Capão da Canoa", uf: "RS" },
  { city: "Capão da Canoa", uf: "RS" },
  // RS — região metropolitana e interior
  { city: "Caxias do Sul", uf: "RS" },
  { city: "Canoas", uf: "RS" },
  { city: "Gravataí", uf: "RS" },
  { city: "Novo Hamburgo", uf: "RS" },
  { city: "São Leopoldo", uf: "RS" },
  { city: "Rio Grande", uf: "RS" },
  { city: "Viamão", uf: "RS" },
  { city: "Passo Fundo", uf: "RS" },
  { city: "Lajeado", uf: "RS" },
  { city: "Bento Gonçalves", uf: "RS" },
  // SC (~12%)
  { city: "Florianópolis", uf: "SC" },
  { city: "Joinville", uf: "SC" },
  { city: "Balneário Camboriú", uf: "SC" },
  // PR (~5%)
  { city: "Curitiba", uf: "PR" },
  // SP (~3%)
  { city: "São Paulo", uf: "SP" },
];

/** Cargos — alinhados com /events/settings?tab=kpis */
const jobTitles: JobTitle[] = [
  "Analista de marketing", "Gerente de marketing", "Assessor de locações",
  "Gerente de locações", "Corretor de imóveis", "Gerente de vendas",
  "Diretor geral / Proprietário / CEO", "Outros",
];

/** Tipos de empresa — alinhados com /events/settings?tab=kpis */
const companyTypes: CompanyType[] = [
  "Imobiliária de vendas", "Imobiliária de aluguéis", "Imobiliária de vendas e aluguéis",
  "Corretor autônomo", "Incorporadora / loteadora", "Agência de marketing",
  "Empresa de tecnologia", "Outros",
];

/** Áreas de atuação — alinhadas com /events/settings?tab=kpis */
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

/** Seeded pseudo-random based on index */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Exatamente 925 participantes, distribuídos proporcionalmente por evento.
 * Cada evento tem exatamente totalRegistrations inscrições e totalAttendees presentes.
 */
interface EventTarget {
  id: string;
  registrations: number;
  attendees: number;
}

const EVENT_TARGETS: EventTarget[] = [
  { id: "evt-sm-2026", registrations: 55, attendees: 51 },
  { id: "evt-pelotas-2026", registrations: 47, attendees: 45 },
  { id: "evt-capao-2026", registrations: 62, attendees: 53 },
  { id: "evt-poa-2026", registrations: 49, attendees: 45 },
  { id: "evt-je-2026", registrations: 712, attendees: 687 },
];

// Build a set of participant IDs that are opportunities (from OPPORTUNITIES_MOCK)
const oppParticipantIds = new Set(OPPORTUNITIES_MOCK.map((o) => o.participantId));
// Count opportunities per participant
const oppCountByParticipant = new Map<string, number>();
for (const o of OPPORTUNITIES_MOCK) {
  oppCountByParticipant.set(o.participantId, (oppCountByParticipant.get(o.participantId) || 0) + 1);
}

function generateParticipantsFull(): ParticipantFull[] {
  const participants: ParticipantFull[] = [];
  let globalIdx = 0;

  for (const target of EVENT_TARGETS) {
    for (let j = 0; j < target.registrations; j++) {
      const i = globalIdx;
      const isAttendee = j < target.attendees; // first N are attendees

      // Fit score: ~30% alto (≥80), ~35% medio (50-79), ~35% baixo (<50)
      const rand = pseudoRandom(i);
      let fitScore: number;
      if (rand < 0.30) {
        fitScore = 80 + Math.round(pseudoRandom(i + 1) * 20); // 80-100
      } else if (rand < 0.65) {
        fitScore = 50 + Math.round(pseudoRandom(i + 2) * 29); // 50-79
      } else {
        fitScore = 10 + Math.round(pseudoRandom(i + 3) * 39); // 10-49
      }

      // Check if this participant is in OPPORTUNITIES_MOCK
      const partId = `part-${i + 1}`;
      const oppCount = oppCountByParticipant.get(partId) || 0;

      // Funnel status: oportunidade > lead > participante > inscrito
      let statusInscricao: StatusInscricao;
      if (isAttendee && oppCount >= 2) {
        statusInscricao = "oportunidade";
      } else if (isAttendee && oppCount === 1) {
        statusInscricao = "lead";
      } else if (isAttendee) {
        statusInscricao = "participante";
      } else {
        statusInscricao = "inscrito";
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
        eventIds: [target.id],
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
