/**
 * Mock: Full participants dataset for the participants list page
 * Alinhado com os dados de /events/settings (SponsorshipsTab)
 *
 * Totais por evento (de events.ts / eventSettings.ts):
 *   evt-sm-2026:       55 inscritos /  51 participantes
 *   evt-pelotas-2026:  47 inscritos /  45 participantes
 *   evt-capao-2026:    62 inscritos /  53 participantes
 *   evt-poa-2026:      49 inscritos /  45 participantes
 *   evt-je-2026:      712 inscritos / 687 participantes
 *   TOTAL:            925 inscritos / 881 participantes
 *
 * Estratégia: gerar participantes únicos por evento na quantidade de inscrições,
 * depois sortear ~15% de multi-evento entre os Talks (eventos menores).
 * Participantes do JE2026 podem ter ido a um Talk (~12%).
 */
import type { JobTitle, CompanyType, OperationArea } from "../types";

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
 * Dados-alvo por evento (de events.ts):
 *   eventId → { totalRegistrations, totalAttendees }
 *
 * A estratégia é:
 * 1. Gerar participantes com evento primário proporcional ao totalRegistrations
 * 2. ~15% dos participantes de Talks também vão a outro Talk
 * 3. ~12% dos participantes do JE2026 também foram a um Talk
 * 4. Status "participante" vs "inscrito" proporcional ao ratio attendees/registrations
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

const TOTAL_REGISTRATIONS = EVENT_TARGETS.reduce((s, e) => s + e.registrations, 0); // 925
const TALK_IDS = EVENT_TARGETS.filter((e) => e.id !== "evt-je-2026").map((e) => e.id);

function generateParticipantsFull(): ParticipantFull[] {
  const participants: ParticipantFull[] = [];

  // Track how many registrations and attendees each event has accumulated
  const eventRegCount = new Map<string, number>();
  const eventAttCount = new Map<string, number>();
  EVENT_TARGETS.forEach((e) => {
    eventRegCount.set(e.id, 0);
    eventAttCount.set(e.id, 0);
  });

  // Build flat assignment list: each slot = one event registration
  const assignmentSlots: string[] = [];
  for (const et of EVENT_TARGETS) {
    for (let j = 0; j < et.registrations; j++) {
      assignmentSlots.push(et.id);
    }
  }

  // Shuffle deterministically
  for (let i = assignmentSlots.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom(i * 17 + 3) * (i + 1));
    [assignmentSlots[i], assignmentSlots[j]] = [assignmentSlots[j], assignmentSlots[i]];
  }

  // Assign participants: consume slots, allow some multi-event overlap
  let slotIdx = 0;

  // We target ~800 unique participants (some attend multiple events)
  const TARGET_UNIQUE = 800;

  for (let i = 0; i < TARGET_UNIQUE && slotIdx < assignmentSlots.length; i++) {
    const primaryEvent = assignmentSlots[slotIdx];
    slotIdx++;

    const eventIds = [primaryEvent];

    // Multi-event logic: ~15% chance for Talks participants to attend another Talk
    // ~12% chance for JE participants to also have attended a Talk
    const multiRand = pseudoRandom(i * 31 + 11);
    if (primaryEvent === "evt-je-2026" && multiRand < 0.12) {
      const talkIdx = Math.floor(pseudoRandom(i * 47 + 3) * TALK_IDS.length);
      const secondEvent = TALK_IDS[talkIdx];
      if (!eventIds.includes(secondEvent) && slotIdx < assignmentSlots.length) {
        eventIds.push(secondEvent);
        // consume an extra slot for this event if available
        slotIdx++;
      }
    } else if (primaryEvent !== "evt-je-2026" && multiRand < 0.15) {
      const secondIdx = Math.floor(pseudoRandom(i * 53 + 7) * TALK_IDS.length);
      const secondEvent = TALK_IDS[secondIdx];
      if (!eventIds.includes(secondEvent) && slotIdx < assignmentSlots.length) {
        eventIds.push(secondEvent);
        slotIdx++;
      }
    }

    // Track registration counts
    for (const eid of eventIds) {
      eventRegCount.set(eid, (eventRegCount.get(eid) || 0) + 1);
    }

    // Determine status following funnel: inscrito → participante → lead → oportunidade
    const target = EVENT_TARGETS.find((e) => e.id === primaryEvent)!;
    const attendanceRate = target.attendees / target.registrations;
    const isParticipante = pseudoRandom(i * 7 + 5) < attendanceRate;

    if (isParticipante) {
      for (const eid of eventIds) {
        eventAttCount.set(eid, (eventAttCount.get(eid) || 0) + 1);
      }
    }

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

    const oppCount = fitScore >= 70
      ? Math.floor(pseudoRandom(i + 10) * 3) + 1
      : (pseudoRandom(i + 20) > 0.85 ? 1 : 0);

    // Funnel status: oportunidade > lead > participante > inscrito
    let statusInscricao: StatusInscricao;
    if (isParticipante && fitScore >= FIT_HIGH_THRESHOLD) {
      statusInscricao = "oportunidade";
    } else if (isParticipante && oppCount > 0) {
      statusInscricao = "lead";
    } else if (isParticipante) {
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
      eventIds,
      journeyId: "jrn-journey-2026",
      year: 2026,
      statusInscricao,
      oportunidadesCount: oppCount,
      fitScore,
      fitLabel: deriveFitLabel(fitScore),
    });
  }

  return participants;
}

export const PARTICIPANTS_FULL_MOCK: ParticipantFull[] = generateParticipantsFull();
