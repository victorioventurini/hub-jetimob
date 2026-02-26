/**
 * Mock: Brand metrics for dashboard
 */
import type {
  BrandRecallMetric,
  BrandPainAssociation,
  BaselineEndlineMetric,
  ShareOfMindDimension,
  PainPointRanking,
} from "../types";
import { SPONSOR_BRAND_ID } from "./sponsor";

// Brand recall (spontaneous & stimulated)
export const BRAND_RECALL_MOCK: BrandRecallMetric[] = [
  { brandId: SPONSOR_BRAND_ID, spontaneous: 42, stimulated: 78 },
  { brandId: "comp-loft", spontaneous: 35, stimulated: 65 },
  { brandId: "comp-quintoandar", spontaneous: 28, stimulated: 58 },
  { brandId: "comp-kenlo", spontaneous: 18, stimulated: 45 },
  { brandId: "comp-vista", spontaneous: 15, stimulated: 38 },
  { brandId: "comp-arbo", spontaneous: 10, stimulated: 25 },
];

// Brand × Pain associations (shares sum to 100 per pain)
export const BRAND_PAIN_MOCK: BrandPainAssociation[] = [
  {
    painPoint: "Garantia locatícia",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 45 },
      { brandId: "comp-loft", share: 18 },
      { brandId: "comp-quintoandar", share: 15 },
      { brandId: "comp-kenlo", share: 12 },
      { brandId: "comp-vista", share: 6 },
      { brandId: "comp-arbo", share: 4 },
    ],
  },
  {
    painPoint: "CRM Imobiliário",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 12 },
      { brandId: "comp-loft", share: 8 },
      { brandId: "comp-quintoandar", share: 10 },
      { brandId: "comp-kenlo", share: 38 },
      { brandId: "comp-vista", share: 25 },
      { brandId: "comp-arbo", share: 7 },
    ],
  },
  {
    painPoint: "Crédito imobiliário",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 35 },
      { brandId: "comp-loft", share: 22 },
      { brandId: "comp-quintoandar", share: 20 },
      { brandId: "comp-kenlo", share: 8 },
      { brandId: "comp-vista", share: 10 },
      { brandId: "comp-arbo", share: 5 },
    ],
  },
  {
    painPoint: "Portal imobiliário",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 8 },
      { brandId: "comp-loft", share: 15 },
      { brandId: "comp-quintoandar", share: 35 },
      { brandId: "comp-kenlo", share: 12 },
      { brandId: "comp-vista", share: 20 },
      { brandId: "comp-arbo", share: 10 },
    ],
  },
  {
    painPoint: "Seguro residencial",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 52 },
      { brandId: "comp-loft", share: 10 },
      { brandId: "comp-quintoandar", share: 12 },
      { brandId: "comp-kenlo", share: 8 },
      { brandId: "comp-vista", share: 10 },
      { brandId: "comp-arbo", share: 8 },
    ],
  },
];

// Baseline vs Endline
export const BASELINE_ENDLINE_MOCK: BaselineEndlineMetric[] = [
  { metric: "Brand Recall (espontâneo)", baseline: 28, endline: 42, delta: 14 },
  { metric: "Brand Recall (estimulado)", baseline: 55, endline: 78, delta: 23 },
  { metric: "Intenção de contato", baseline: 12, endline: 34, delta: 22 },
  { metric: "NPS da marca", baseline: 45, endline: 72, delta: 27 },
  { metric: "Associação com 'confiança'", baseline: 38, endline: 65, delta: 27 },
  { metric: "Top of Mind (categoria)", baseline: 15, endline: 32, delta: 17 },
];

// Share of Mind dimensions (radar) — Baseline vs Endline
export const SHARE_OF_MIND_MOCK: ShareOfMindDimension[] = [
  { dimension: "Porto Seguro", baseline: 55, endline: 85 },
  { dimension: "Competidor A", baseline: 42, endline: 60 },
  { dimension: "Competidor B", baseline: 50, endline: 70 },
  { dimension: "Competidor C", baseline: 45, endline: 78 },
  { dimension: "Competidor D", baseline: 48, endline: 82 },
  { dimension: "Competidor E", baseline: 40, endline: 75 },
];

// Pain point ranking
export const PAIN_RANKING_MOCK: PainPointRanking[] = [
  { painPoint: "Garantia locatícia", percentage: 68, trend: "up", rank: 1 },
  { painPoint: "CRM Imobiliário", percentage: 55, trend: "stable", rank: 2 },
  { painPoint: "Crédito imobiliário", percentage: 48, trend: "up", rank: 3 },
  { painPoint: "Seguro residencial", percentage: 42, trend: "up", rank: 4 },
  { painPoint: "Portal imobiliário", percentage: 38, trend: "down", rank: 5 },
  { painPoint: "Captação de imóveis", percentage: 32, trend: "stable", rank: 6 },
  { painPoint: "Gestão de aluguéis", percentage: 28, trend: "up", rank: 7 },
  { painPoint: "Marketing digital", percentage: 22, trend: "down", rank: 8 },
];
