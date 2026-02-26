/**
 * Mock: Events and Journeys
 */
import type { EventMock, JourneyMock } from "../types";

export const EVENTS_MOCK: EventMock[] = [
  {
    id: "evt-sm-2026",
    code: "JET2026SM",
    name: "Jet Experience Talks - Santa Maria, RS",
    date: "2026-06-11",
    city: "Santa Maria",
    uf: "RS",
    totalRegistrations: 55,
    totalAttendees: 51,
    scope: "event",
  },
  {
    id: "evt-pelotas-2026",
    code: "JET2026PEL",
    name: "Jet Experience Talks - Pelotas, RS",
    date: "2026-06-25",
    city: "Pelotas",
    uf: "RS",
    totalRegistrations: 47,
    totalAttendees: 45,
    scope: "event",
  },
  {
    id: "evt-capao-2026",
    code: "JET2026CC",
    name: "Jet Experience Talks - Capão da Canoa, RS",
    date: "2026-07-09",
    city: "Capão da Canoa",
    uf: "RS",
    totalRegistrations: 62,
    totalAttendees: 53,
    scope: "event",
  },
  {
    id: "evt-poa-2026",
    code: "JET2026POA",
    name: "Jet Experience Talks - Porto Alegre, RS",
    date: "2026-08-14",
    city: "Porto Alegre",
    uf: "RS",
    totalRegistrations: 49,
    totalAttendees: 45,
    scope: "event",
  },
  {
    id: "evt-je-2026",
    code: "JE2026",
    name: "Jet Experience 2026",
    date: "2026-09-03",
    city: "Porto Alegre",
    uf: "RS",
    totalRegistrations: 712,
    totalAttendees: 687,
    scope: "event",
  },
];

export const JOURNEYS_MOCK: JourneyMock[] = [
  {
    id: "jrn-journey-2026",
    code: "JEJ2026",
    name: "Jet Experience Journey",
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    eventIds: ["evt-sm-2026", "evt-pelotas-2026", "evt-capao-2026", "evt-poa-2026", "evt-je-2026"],
    scope: "journey",
  },
];
