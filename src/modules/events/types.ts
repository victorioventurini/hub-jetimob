/**
 * Events Module Types
 * 
 * Tipos para o módulo Jet Experience — Patrocinadores & ROI.
 * Módulo 100% mockado, sem dependência de banco.
 */

// ===== Sponsor =====

export interface SponsorAreaOfOperation {
  id: string;
  category: string;
  subcategory: string;
  ltvPerLead: number; // R$ estimated LTV per qualified lead
}

export interface Sponsor {
  id: string;
  name: string;
  legalName: string;
  cnpj: string;
  logoUrl: string;
  areasOfOperation: SponsorAreaOfOperation[];
}

// ===== Events & Journeys =====

export type EventScope = "event" | "journey";

export interface EventMock {
  id: string;
  code: string;
  name: string;
  date: string;
  city: string;
  uf: string;
  totalRegistrations: number;
  totalAttendees: number;
  scope: "event";
}

export interface JourneyMock {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  eventIds: string[];
  scope: "journey";
}

// ===== Participants =====

export type JobTitle =
  | "Analista de marketing"
  | "Gerente de marketing"
  | "Assessor de locações"
  | "Gerente de locações"
  | "Corretor de imóveis"
  | "Gerente de vendas"
  | "Diretor geral / Proprietário / CEO"
  | "Outros";

export type CompanyType =
  | "Imobiliária de vendas"
  | "Imobiliária de aluguéis"
  | "Imobiliária de vendas e aluguéis"
  | "Corretor autônomo"
  | "Incorporadora / loteadora"
  | "Agência de marketing"
  | "Empresa de tecnologia"
  | "Outros";

export type OperationArea =
  | "Venda de imóveis"
  | "Locação"
  | "Incorporação"
  | "Loteamento"
  | "Administração"
  | "Avaliação";

export interface Participant {
  id: string;
  code: string; // código para QR/captura
  fullName: string;
  email: string;
  phone: string;
  city: string;
  uf: string;
  jobTitle: JobTitle;
  companyName: string;
  companyDomain?: string;
  companyType: CompanyType;
  operationArea: OperationArea;
  eventIds: string[]; // eventos que participou
  registeredAt: string;
  attendedAt?: string;
}

// ===== Opportunities =====

export interface Opportunity {
  id: string;
  participantId: string;
  eventId: string;
  sponsorId: string;
  areasOfInterest: string[]; // subcategorias selecionadas
  observations: string;
  capturedAt: string;
  capturedBy: string; // nome do usuário que capturou
  fitScore: number; // 0-100 calculated mock
}

// ===== Brand Metrics =====

export interface CompetitorBrand {
  id: string;
  realName: string;
  anonymousName: string; // "Competidor A", etc.
  color: string;
}

export interface BrandRecallMetric {
  brandId: string;
  spontaneous: number; // % recall espontâneo
  stimulated: number; // % recall estimulado
}

export interface BrandPainAssociation {
  painPoint: string;
  associations: { brandId: string; share: number }[]; // shares sum to 100
}

export interface BaselineEndlineMetric {
  metric: string;
  baseline: number;
  endline: number;
  delta: number;
}

export interface ShareOfMindDimension {
  dimension: string;
  baseline: number;
  endline: number;
}

export interface PainPointRanking {
  painPoint: string;
  percentage: number;
  trend: "up" | "down" | "stable";
  rank: number;
}

// ===== Webhook =====

export interface WebhookConfig {
  url: string;
  secret: string;
  isActive: boolean;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  statusCode: number;
  success: boolean;
  responseTime: number;
}

// ===== View Mode =====

export type ViewMode = "sponsor" | "admin";

// ===== Filters =====

export interface EventsFilters {
  scope: EventScope;
  selectedEventId?: string;
  selectedJourneyId?: string;
  year: number;
  uf?: string;
  city?: string;
  jobTitle?: JobTitle;
  companyType?: CompanyType;
  operationArea?: OperationArea;
  areaOfOperation?: string;
}
