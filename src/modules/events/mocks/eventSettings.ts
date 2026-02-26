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
    id: "evt-sm-2026",
    name: "Jet Experience Talks - Santa Maria, RS",
    date: "2026-06-11",
    city: "Santa Maria",
    uf: "RS",
    projectedAudience: 50,
    totalRegistrations: 55,
    totalAttendees: 51,
    quota: "Prata",
  },
  {
    id: "evt-pelotas-2026",
    name: "Jet Experience Talks - Pelotas, RS",
    date: "2026-06-25",
    city: "Pelotas",
    uf: "RS",
    projectedAudience: 50,
    totalRegistrations: 47,
    totalAttendees: 45,
    quota: "Prata",
  },
  {
    id: "evt-capao-2026",
    name: "Jet Experience Talks - Capão da Canoa, RS",
    date: "2026-07-09",
    city: "Capão da Canoa",
    uf: "RS",
    projectedAudience: 50,
    totalRegistrations: 62,
    totalAttendees: 53,
    quota: "Prata",
  },
  {
    id: "evt-poa-2026",
    name: "Jet Experience Talks - Porto Alegre, RS",
    date: "2026-08-14",
    city: "Porto Alegre",
    uf: "RS",
    projectedAudience: 50,
    totalRegistrations: 49,
    totalAttendees: 45,
    quota: "Ouro",
  },
  {
    id: "evt-je-2026",
    name: "Jet Experience 2026",
    date: "2026-09-03",
    city: "Porto Alegre",
    uf: "RS",
    projectedAudience: 700,
    totalRegistrations: 712,
    totalAttendees: 687,
    quota: "Diamante",
  },
];
