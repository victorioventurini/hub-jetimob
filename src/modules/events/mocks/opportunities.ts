/**
 * Mock: Opportunities — exactly 32 total, distributed per EVENT_DISTRIBUTION
 */
import type { Opportunity } from "../types";
import { EVENT_DISTRIBUTION } from "./jetExperienceMetrics";

const AREAS_POOL = [
  "Garantia locatícia",
  "Corretora de seguros",
  "Seguradora",
  "Adiantamento recebíveis",
  "Consórcios",
  "Crédito imobiliário",
  "CRM Imobiliário",
  "Portal imobiliário",
];

const OBSERVATIONS_POOL = [
  "Interesse em plano corporativo para a imobiliária",
  "Já possui relacionamento com corretor local",
  "Opera com mais de 500 contratos de locação",
  "Quer migrar de fornecedor atual",
  "Interesse em parceria para revenda",
  "Pequena imobiliária, potencial de crescimento",
  "Carteira de 200+ contratos, busca antecipação",
  "Busca solução integrada para locação e vendas",
  "Interesse em digitalização do funil de vendas",
  "Necessita de solução de garantia para carteira de aluguéis",
  "Avaliando troca de plataforma de CRM",
  "Rede com 3 filiais, busca padronização",
  "Foco em lançamentos imobiliários",
  "Interesse em seguro para novos empreendimentos",
  "Gestão de mais de 1.000 contratos ativos",
  "Busca parceria para crédito imobiliário aos clientes",
  "Interesse em consórcio para carteira própria",
  "Precisa de ferramenta de qualificação de leads",
  "Expansão para mercado de locação comercial",
  "Avaliando soluções de antecipação de recebíveis",
];

const EVENT_DATES: Record<string, string> = {
  "evt-sm-2026": "2026-06-11",
  "evt-pelotas-2026": "2026-06-25",
  "evt-capao-2026": "2026-07-09",
  "evt-poa-2026": "2026-08-14",
  "evt-je-2026": "2026-09-03",
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seededRandom(seed) * arr.length)) % arr.length];
}

function pickAreas(seed: number): string[] {
  const count = seededRandom(seed + 100) > 0.5 ? 2 : 1;
  const first = pick(AREAS_POOL, seed);
  if (count === 1) return [first];
  let second = pick(AREAS_POOL, seed + 50);
  if (second === first) second = pick(AREAS_POOL, seed + 99);
  return [first, second];
}

function generateOpportunities(): Opportunity[] {
  const opps: Opportunity[] = [];
  let globalIdx = 0;

  for (const { eventId, opps: count } of EVENT_DISTRIBUTION) {
    const date = EVENT_DATES[eventId];
    for (let i = 0; i < count; i++) {
      const seed = globalIdx * 17 + i * 7;
      const rand = seededRandom(seed);

      let fitScore: number;
      if (rand < 0.55) {
        fitScore = 75 + Math.round(seededRandom(seed + 1) * 25);
      } else if (rand < 0.85) {
        fitScore = 50 + Math.round(seededRandom(seed + 2) * 24);
      } else {
        fitScore = 30 + Math.round(seededRandom(seed + 3) * 19);
      }

      const hour = 9 + Math.floor(seededRandom(seed + 4) * 8);
      const minute = Math.floor(seededRandom(seed + 5) * 60);

      opps.push({
        id: `opp-${globalIdx + 1}`,
        participantId: `part-${globalIdx + 1}`,
        eventId,
        sponsorId: "sponsor-porto-seguro",
        areasOfInterest: pickAreas(seed + 10),
        observations: pick(OBSERVATIONS_POOL, seed + 20),
        capturedAt: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
        capturedBy: "Equipe Porto Seguro",
        fitScore,
      });

      globalIdx++;
    }
  }

  return opps;
}

export const OPPORTUNITIES_MOCK: Opportunity[] = generateOpportunities();
