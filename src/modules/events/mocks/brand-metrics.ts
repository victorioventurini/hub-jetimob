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
    painPoint: "Negócios que caem no final por reprovação de crédito ou garantia",
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
    painPoint: "Lentidão e burocracia para assinar contratos e fazer vistorias",
    associations: [
      { brandId: SPONSOR_BRAND_ID, share: 38 },
      { brandId: "comp-loft", share: 15 },
      { brandId: "comp-quintoandar", share: 20 },
      { brandId: "comp-kenlo", share: 10 },
      { brandId: "comp-vista", share: 12 },
      { brandId: "comp-arbo", share: 5 },
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
  { painPoint: "Receber muitos contatos, mas a maioria sem perfil de compra", percentage: 72, trend: "up", rank: 1 },
  { painPoint: "Negócios que caem no final por reprovação de crédito ou garantia", percentage: 58, trend: "up", rank: 2 },
  { painPoint: "Perder vendas pela demora no primeiro atendimento ao lead", percentage: 51, trend: "stable", rank: 3 },
  { painPoint: "Ter o cliente pronto, mas não encontrar o imóvel atualizado para ele", percentage: 45, trend: "up", rank: 4 },
  { painPoint: "Lentidão e burocracia para assinar contratos e fazer vistorias", percentage: 38, trend: "down", rank: 5 },
  { painPoint: "Sentimento de estar desatualizado perante as novas tecnologias", percentage: 29, trend: "stable", rank: 6 },
];
