/**
 * Mock: Participants (amostra representativa ~200)
 * Usado nos gráficos de segmentação do dashboard e no CaptureForm.
 * Alinhado com /events/settings — distribuição proporcional aos attendees por evento.
 */
import type { Participant, JobTitle, CompanyType, OperationArea } from "../types";

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

      const company = pick(companyNames, i);
      result.push({
        id: `part-${i + 1}`,
        code,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: `(${48 + (i % 10)}) 9${String(9000 + i * 17).slice(0, 4)}-${String(1000 + i * 31).slice(0, 4)}`,
        city: loc.city,
        uf: loc.uf,
        jobTitle: pick(jobTitles, i),
        companyName: company.name,
        companyDomain: company.domain,
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
