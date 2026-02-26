/**
 * Mock: Participants (amostra representativa ~200)
 * Usado nos gráficos de segmentação do dashboard e no CaptureForm.
 * Alinhado com /events/settings — distribuição proporcional aos attendees por evento.
 */
import type { Participant, JobTitle, CompanyType, OperationArea } from "../types";

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

/**
 * Distribuição geográfica: ~80% RS, ~12% SC, ~5% PR, ~3% SP
 */
const cities: { city: string; uf: string }[] = [
  // RS — cidades-sede (peso alto)
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
  // RS — interior
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

const companyNames = [
  "Imobiliária Estrela", "Imobiliária Central", "Ponto Imóveis", "Casa & Cia",
  "HabitarSC", "Morar Bem Imóveis", "Incorpora Sul", "Lotes Premium",
  "RealTech Soluções", "Digital Imobi", "Construtora Horizonte", "Viva Imóveis",
  "Nova Era Imobiliária", "Investlar", "Prédio & Lar", "Grupo Habitacional",
  "Urban Realty", "Terra Nova", "Ideal Imóveis", "Premium Locações",
];

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Distribuição proporcional aos attendees por evento:
 *   evt-sm-2026:       51/881 ≈ 6%   → ~12 participantes
 *   evt-pelotas-2026:  45/881 ≈ 5%   → ~10 participantes
 *   evt-capao-2026:    53/881 ≈ 6%   → ~12 participantes
 *   evt-poa-2026:      45/881 ≈ 5%   → ~10 participantes
 *   evt-je-2026:      687/881 ≈ 78%  → ~156 participantes
 *   Total: ~200
 */
const eventSlots: { eventId: string; count: number }[] = [
  { eventId: "evt-sm-2026", count: 12 },
  { eventId: "evt-pelotas-2026", count: 10 },
  { eventId: "evt-capao-2026", count: 12 },
  { eventId: "evt-poa-2026", count: 10 },
  { eventId: "evt-je-2026", count: 156 },
];

function generateParticipants(): Participant[] {
  const result: Participant[] = [];
  let globalIdx = 0;

  for (const slot of eventSlots) {
    for (let j = 0; j < slot.count; j++) {
      const i = globalIdx;
      const firstName = pick(firstNames, i);
      const lastName = pick(lastNames, i);
      const loc = pick(cities, i);
      const code = `P${String(1001 + i)}`;

      // ~15% multi-event
      const eventIds = [slot.eventId];
      if (pseudoRandom(i * 31 + 11) < 0.15 && slot.eventId === "evt-je-2026") {
        const talkIds = ["evt-sm-2026", "evt-pelotas-2026", "evt-capao-2026", "evt-poa-2026"];
        const talkIdx = Math.floor(pseudoRandom(i * 47 + 3) * talkIds.length);
        eventIds.push(talkIds[talkIdx]);
      }

      const attended = pseudoRandom(i * 7 + 5) < 0.95;
      const monthOffset = i % 4;

      result.push({
        id: `part-${i + 1}`,
        code,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: `(${48 + (i % 10)}) 9${String(9000 + i * 17).slice(0, 4)}-${String(1000 + i * 31).slice(0, 4)}`,
        city: loc.city,
        uf: loc.uf,
        jobTitle: pick(jobTitles, i),
        companyName: pick(companyNames, i),
        companyType: pick(companyTypes, i),
        operationArea: pick(operationAreas, i),
        eventIds,
        registeredAt: `2026-0${6 + monthOffset}-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`,
        attendedAt: attended ? `2026-0${6 + monthOffset}-${String(1 + (i % 28)).padStart(2, "0")}T08:30:00Z` : undefined,
      });

      globalIdx++;
    }
  }

  return result;
}

export const PARTICIPANTS_MOCK: Participant[] = generateParticipants();
