/**
 * Mock: Participants (~50) — alinhado com /events/settings
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

function generateParticipants(): Participant[] {
  const eventAssignments = [
    ["evt-sm-2026"],
    ["evt-pelotas-2026"],
    ["evt-capao-2026"],
    ["evt-poa-2026"],
    ["evt-je-2026"],
    ["evt-sm-2026", "evt-pelotas-2026"],
    ["evt-capao-2026", "evt-poa-2026"],
    ["evt-poa-2026", "evt-je-2026"],
    ["evt-sm-2026", "evt-capao-2026", "evt-je-2026"],
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const firstName = pick(firstNames, i);
    const lastName = pick(lastNames, i);
    const loc = pick(cities, i);
    const code = `P${String(1001 + i)}`;

    return {
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
      eventIds: pick(eventAssignments, i),
      registeredAt: `2026-0${6 + (i % 4)}-${String(1 + (i % 28)).padStart(2, "0")}T10:00:00Z`,
      attendedAt: i % 7 !== 0 ? `2026-0${6 + (i % 4)}-${String(1 + (i % 28)).padStart(2, "0")}T08:30:00Z` : undefined,
    };
  });
}

export const PARTICIPANTS_MOCK: Participant[] = generateParticipants();
