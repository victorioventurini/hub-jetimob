/**
 * Mock: Participants (~50)
 */
import type { Participant, JobTitle, CompanyType, OperationArea } from "../types";

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

const cities: { city: string; uf: string }[] = [
  // RS — maioria
  { city: "Porto Alegre", uf: "RS" }, { city: "Caxias do Sul", uf: "RS" },
  { city: "Canoas", uf: "RS" }, { city: "Pelotas", uf: "RS" },
  { city: "Santa Maria", uf: "RS" }, { city: "Gravataí", uf: "RS" },
  { city: "Viamão", uf: "RS" }, { city: "Novo Hamburgo", uf: "RS" },
  { city: "São Leopoldo", uf: "RS" }, { city: "Rio Grande", uf: "RS" },
  // PR
  { city: "Curitiba", uf: "PR" }, { city: "Londrina", uf: "PR" },
  // SC
  { city: "Florianópolis", uf: "SC" }, { city: "Joinville", uf: "SC" },
  // SP
  { city: "São Paulo", uf: "SP" }, { city: "Campinas", uf: "SP" },
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
    ["evt-floripa-2026"],
    ["evt-sp-2026"],
    ["evt-poa-2026"],
    ["evt-floripa-2026", "evt-sp-2026"],
    ["evt-sp-2026", "evt-poa-2026"],
    ["evt-floripa-2026", "evt-sp-2026", "evt-poa-2026"],
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
      registeredAt: `2026-0${1 + (i % 6)}-${String(10 + (i % 18)).padStart(2, "0")}T10:00:00Z`,
      attendedAt: i % 7 !== 0 ? `2026-0${1 + (i % 6)}-${String(10 + (i % 18)).padStart(2, "0")}T08:30:00Z` : undefined,
    };
  });
}

export const PARTICIPANTS_MOCK: Participant[] = generateParticipants();
