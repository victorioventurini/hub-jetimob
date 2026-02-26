/**
 * Mock: Events and Journeys
 */
import type { EventMock, JourneyMock } from "../types";

export const EVENTS_MOCK: EventMock[] = [
  {
    id: "evt-capao-2026",
    code: "JET2026CC",
    name: "Jet Experience Talks - Capão da Canoa, RS",
    date: "2026-04-12",
    city: "Capão da Canoa",
    uf: "RS",
    totalRegistrations: 180,
    totalAttendees: 156,
    scope: "event",
  },
  {
    id: "evt-pelotas-2026",
    code: "JET2026PEL",
    name: "Jet Experience Talks - Pelotas, RS",
    date: "2026-05-17",
    city: "Pelotas",
    uf: "RS",
    totalRegistrations: 210,
    totalAttendees: 184,
    scope: "event",
  },
  {
    id: "evt-poa-2026",
    code: "JET2026POA",
    name: "Jet Experience Talks - Porto Alegre, RS",
    date: "2026-06-21",
    city: "Porto Alegre",
    uf: "RS",
    totalRegistrations: 420,
    totalAttendees: 368,
    scope: "event",
  },
  {
    id: "evt-sm-2026",
    code: "JET2026SM",
    name: "Jet Experience Talks - Santa Maria, RS",
    date: "2026-07-19",
    city: "Santa Maria",
    uf: "RS",
    totalRegistrations: 190,
    totalAttendees: 162,
    scope: "event",
  },
  {
    id: "evt-je-2026",
    code: "JE2026",
    name: "Jet Experience 2026",
    date: "2026-10-18",
    city: "Porto Alegre",
    uf: "RS",
    totalRegistrations: 580,
    totalAttendees: 502,
    scope: "event",
  },
];

export const JOURNEYS_MOCK: JourneyMock[] = [
  {
    id: "jrn-journey-2026",
    code: "JEJ2026",
    name: "Jet Experience Journey",
    startDate: "2026-04-01",
    endDate: "2026-10-31",
    eventIds: ["evt-capao-2026", "evt-pelotas-2026", "evt-poa-2026", "evt-sm-2026", "evt-je-2026"],
    scope: "journey",
  },
];
