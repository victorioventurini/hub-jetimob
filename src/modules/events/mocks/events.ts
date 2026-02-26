/**
 * Mock: Events and Journeys
 */
import type { EventMock, JourneyMock } from "../types";

export const EVENTS_MOCK: EventMock[] = [
  {
    id: "evt-floripa-2026",
    code: "JEF2026",
    name: "Jet Experience Floripa 2026",
    date: "2026-03-15",
    city: "Florianópolis",
    uf: "SC",
    totalRegistrations: 420,
    totalAttendees: 368,
    scope: "event",
  },
  {
    id: "evt-sp-2026",
    code: "JESP2026",
    name: "Jet Experience SP 2026",
    date: "2026-05-20",
    city: "São Paulo",
    uf: "SP",
    totalRegistrations: 580,
    totalAttendees: 502,
    scope: "event",
  },
  {
    id: "evt-poa-2026",
    code: "JEPOA2026",
    name: "Jet Experience POA 2026",
    date: "2026-08-10",
    city: "Porto Alegre",
    uf: "RS",
    totalRegistrations: 310,
    totalAttendees: 274,
    scope: "event",
  },
];

export const JOURNEYS_MOCK: JourneyMock[] = [
  {
    id: "jrn-gestao-2026",
    code: "JGST2026",
    name: "Jornada Gestão Imobiliária 2026",
    startDate: "2026-03-01",
    endDate: "2026-08-31",
    eventIds: ["evt-floripa-2026", "evt-sp-2026", "evt-poa-2026"],
    scope: "journey",
  },
  {
    id: "jrn-performance-2026",
    code: "JPRF2026",
    name: "Jornada Performance Comercial 2026",
    startDate: "2026-04-01",
    endDate: "2026-09-30",
    eventIds: ["evt-sp-2026", "evt-poa-2026"],
    scope: "journey",
  },
];
