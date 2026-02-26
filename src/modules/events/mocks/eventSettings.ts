/**
 * Mock: Event Settings — quotas e público projetado
 */

export type QuotaName = "Diamante" | "Esmeralda" | "Ouro" | "Prata";

export interface EventSettingsMock {
  id: string;
  name: string;
  date: string;
  city: string;
  uf: string;
  projectedAudience: number;
  totalRegistrations: number;
  totalAttendees: number;
  quota: QuotaName;
}

export const EVENT_SETTINGS_MOCK: EventSettingsMock[] = [
  {
    id: "evt-capao-2026",
    name: "Jet Experience Talks - Capão da Canoa, RS",
    date: "2026-04-12",
    city: "Capão da Canoa",
    uf: "RS",
    projectedAudience: 200,
    totalRegistrations: 180,
    totalAttendees: 156,
    quota: "Prata",
  },
  {
    id: "evt-pelotas-2026",
    name: "Jet Experience Talks - Pelotas, RS",
    date: "2026-05-17",
    city: "Pelotas",
    uf: "RS",
    projectedAudience: 250,
    totalRegistrations: 210,
    totalAttendees: 184,
    quota: "Ouro",
  },
  {
    id: "evt-poa-2026",
    name: "Jet Experience Talks - Porto Alegre, RS",
    date: "2026-06-21",
    city: "Porto Alegre",
    uf: "RS",
    projectedAudience: 500,
    totalRegistrations: 420,
    totalAttendees: 368,
    quota: "Diamante",
  },
  {
    id: "evt-sm-2026",
    name: "Jet Experience Talks - Santa Maria, RS",
    date: "2026-07-19",
    city: "Santa Maria",
    uf: "RS",
    projectedAudience: 220,
    totalRegistrations: 190,
    totalAttendees: 162,
    quota: "Prata",
  },
  {
    id: "evt-je-2026",
    name: "Jet Experience 2026",
    date: "2026-10-18",
    city: "Porto Alegre",
    uf: "RS",
    projectedAudience: 700,
    totalRegistrations: 580,
    totalAttendees: 502,
    quota: "Esmeralda",
  },
];
