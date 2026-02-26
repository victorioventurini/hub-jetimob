/**
 * Mock: Porto Seguro sponsor profile
 */
import type { Sponsor, CompetitorBrand } from "../types";

export const SPONSOR_MOCK: Sponsor = {
  id: "sponsor-porto-seguro",
  name: "Porto Seguro",
  legalName: "Porto Seguro Cia de Seguros Gerais",
  cnpj: "61.198.164/0001-60",
  logoUrl: "/images/sponsors/porto-seguro-logo.svg",
  areasOfOperation: [
    // Software
    { id: "sw-crm", category: "Software", subcategory: "CRM", ltvPerLead: 8000 },
    { id: "sw-erp", category: "Software", subcategory: "ERP (aluguéis)", ltvPerLead: 12000 },
    { id: "sw-ia", category: "Software", subcategory: "IA qualificação leads", ltvPerLead: 6000 },
    // Geral
    { id: "ge-portal", category: "Geral", subcategory: "Portal imobiliário", ltvPerLead: 5000 },
    { id: "ge-captacao", category: "Geral", subcategory: "Captação de imóveis", ltvPerLead: 4000 },
    { id: "ge-educacao", category: "Geral", subcategory: "Educação/formação", ltvPerLead: 3000 },
    { id: "ge-entidade", category: "Geral", subcategory: "Entidade de classe", ltvPerLead: 2000 },
    { id: "ge-incorporadora", category: "Geral", subcategory: "Incorporadora", ltvPerLead: 15000 },
    { id: "ge-loteadora", category: "Geral", subcategory: "Loteadora", ltvPerLead: 12000 },
    // Vendas
    { id: "ve-credito", category: "Vendas", subcategory: "Crédito imobiliário", ltvPerLead: 10000 },
    { id: "ve-funil", category: "Vendas", subcategory: "Funil pós-venda", ltvPerLead: 7000 },
    { id: "ve-consorcio", category: "Vendas", subcategory: "Consórcios", ltvPerLead: 15000 },
    { id: "ve-estoque", category: "Vendas", subcategory: "Estoque incorporadoras", ltvPerLead: 20000 },
    // Aluguéis
    { id: "al-garantia", category: "Aluguéis", subcategory: "Garantia locatícia", ltvPerLead: 18000 },
    { id: "al-corretora", category: "Aluguéis", subcategory: "Corretora de seguros", ltvPerLead: 12000 },
    { id: "al-seguradora", category: "Aluguéis", subcategory: "Seguradora", ltvPerLead: 25000 },
    { id: "al-adiantamento", category: "Aluguéis", subcategory: "Adiantamento recebíveis", ltvPerLead: 9000 },
  ],
};

export const COMPETITORS_MOCK: CompetitorBrand[] = [
  { id: "comp-loft", realName: "Loft", anonymousName: "Competidor A", color: "hsl(var(--chart-1))" },
  { id: "comp-quintoandar", realName: "QuintoAndar", anonymousName: "Competidor B", color: "hsl(var(--chart-2))" },
  { id: "comp-kenlo", realName: "Kenlo", anonymousName: "Competidor C", color: "hsl(var(--chart-3))" },
  { id: "comp-vista", realName: "Vista", anonymousName: "Competidor D", color: "hsl(var(--chart-4))" },
  { id: "comp-arbo", realName: "Arbo", anonymousName: "Competidor E", color: "hsl(var(--chart-5))" },
];

export const SPONSOR_BRAND_ID = "brand-porto-seguro";
export const SPONSOR_COLOR = "hsl(210, 80%, 45%)";
