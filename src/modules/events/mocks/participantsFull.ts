/**
 * Mock: Full participants dataset for the participants list page
 * Alinhado com os parâmetros de /events/settings (KPIs tab)
 * Distribuição geográfica ~80% RS, proporcional aos attendees por evento
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
  "Diretor(a)", "Gerente Comercial", "Corretor autônomo",
  "Gestor(a) de Vendas", "Coordenador(a)", "Analista", "Outros",
];

/** Tipos de empresa — alinhados com /events/settings?tab=kpis */
const companyTypes: CompanyType[] = [
  "Imobiliária", "Incorporadora", "Construtora",
  "Loteadora", "Administradora de condomínios", "Outros",
];

/** Áreas de atuação — alinhadas com /events/settings?tab=kpis */
const operationAreas: OperationArea[] = [
  "Venda de imóveis", "Locação", "Incorporação",
  "Loteamento", "Administração", "Avaliação",
];

const companyNames = [
  "Imobiliária Estrela", "Imobiliária Central", "Ponto Imóveis", "Casa & Cia",
  "HabitarSC", "Morar Bem Imóveis", "Incorpora Sul", "Lotes Premium",
  "RealTech Soluções", "Digital Imobi", "Construtora Horizonte", "Viva Imóveis",
  "Nova Era Imobiliária", "Investlar", "Prédio & Lar", "Grupo Habitacional",
  "Urban Realty", "Terra Nova", "Ideal Imóveis", "Premium Locações",
];

/**
 * Distribuição de participantes por evento (proporcional aos attendees em settings):
 *   evt-sm-2026:       51 attendees
 *   evt-pelotas-2026:  45 attendees
 *   evt-capao-2026:    53 attendees
 *   evt-poa-2026:      45 attendees
 *   evt-je-2026:      687 attendees
 * Total: 881 participantes / 925 inscritos
 *
 * Cada participante pode ter participado em mais de um evento da jornada.
 * Geramos ~300 participantes únicos para representar de forma realista.
 */
interface EventWeight {
  id: string;
  weight: number; // probabilidade relativa
}

const EVENT_WEIGHTS: EventWeight[] = [
  { id: "evt-sm-2026", weight: 0.06 },
  { id: "evt-pelotas-2026", weight: 0.05 },
  { id: "evt-capao-2026", weight: 0.06 },
  { id: "evt-poa-2026", weight: 0.05 },
  { id: "evt-je-2026", weight: 0.78 },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Seeded pseudo-random based on index */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function assignEvents(i: number): string[] {
  const primary = pseudoRandom(i * 13 + 7);
  let cumulative = 0;
  let primaryEvent = "evt-je-2026";
  for (const ew of EVENT_WEIGHTS) {
    cumulative += ew.weight;
    if (primary < cumulative) {
      primaryEvent = ew.id;
      break;
    }
  }

  const events = [primaryEvent];
  // ~20% chance of multi-event (attended another event in the journey)
  if (pseudoRandom(i * 31 + 11) < 0.20) {
    const secondRand = pseudoRandom(i * 47 + 3);
    const secondIdx = Math.floor(secondRand * EVENT_WEIGHTS.length);
    const secondEvent = EVENT_WEIGHTS[secondIdx].id;
    if (!events.includes(secondEvent)) events.push(secondEvent);
  }

  return events;
}

function generateParticipantsFull(): ParticipantFull[] {
  return Array.from({ length: 300 }, (_, i) => {
    const firstName = pick(firstNames, i);
    const lastName = pick(lastNames, i + 3);
    const loc = pick(cities, i);
    const rand = pseudoRandom(i);

    // Fit score: ~30% alto (≥80), ~35% medio (50-79), ~35% baixo (<50)
    let fitScore: number;
    if (rand < 0.30) {
      fitScore = 80 + Math.round(pseudoRandom(i + 1) * 20); // 80-100
    } else if (rand < 0.65) {
      fitScore = 50 + Math.round(pseudoRandom(i + 2) * 29); // 50-79
    } else {
      fitScore = 10 + Math.round(pseudoRandom(i + 3) * 39); // 10-49
    }

    const eventIds = assignEvents(i);
    const isParticipante = pseudoRandom(i * 7 + 5) < 0.95; // ~95% attended (matching 881/925)
    const oppCount = fitScore >= 70 ? Math.floor(pseudoRandom(i + 10) * 3) + 1 : (pseudoRandom(i + 20) > 0.85 ? 1 : 0);

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
      eventIds,
      journeyId: "jrn-journey-2026", // todos fazem parte da jornada
      year: 2026,
      statusInscricao: isParticipante ? "participante" : "inscrito",
      oportunidadesCount: oppCount,
      fitScore,
      fitLabel: deriveFitLabel(fitScore),
    };
  });
}

export const PARTICIPANTS_FULL_MOCK: ParticipantFull[] = generateParticipantsFull();
