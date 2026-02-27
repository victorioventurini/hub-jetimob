/**
 * KPI Cards — Top-level metrics
 * Uses jetExperienceMetrics.ts as single source of truth.
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Target, DollarSign, Brain, Award, FileCheck } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useEventsContext } from "../../context/EventsContext";
import {
  EVENT_TOTALS,
  ROI_METRICS,
  CONVERSION_RATES,
  formatCurrencyBRL,
} from "../../mocks/jetExperienceMetrics";

const KPI_TOOLTIPS: Record<string, string> = {
  "Leads Capturados": "Total de leads identificados durante os eventos, com base nas interações e interesses declarados pelos participantes.",
  "ROI Estimado": `Retorno sobre investimento projetado: ${EVENT_TOTALS.contratos} contratos × LTV ${formatCurrencyBRL(ROI_METRICS.ltvPerContrato)} = ${formatCurrencyBRL(ROI_METRICS.ltvTotal)}.`,
  "Fit Score Médio": "Média do score de adequação dos leads aos critérios de qualificação do patrocinador (0–100%).",
  "Leads Qualificados": "Percentual de oportunidades com Fit Score ≥ 75, indicando alta aderência ao perfil ideal de cliente.",
  "Brand Awareness": "Percentual de participantes que lembraram da marca do patrocinador espontaneamente ou de forma estimulada após o evento.",
  "Participantes": "Número total de participantes que efetivamente estiveram presentes nos eventos do período selecionado.",
  "Oportunidades": "Total de oportunidades identificadas entre os leads qualificados.",
  "Contratos": `Contratos fechados estimados (${EVENT_TOTALS.contratos}), com base na taxa de conversão de ${Math.round(CONVERSION_RATES.contratosRate * 100)}% das oportunidades.`,
};

export function KpiCards() {
  const { filteredOpportunities: opportunities, filteredEvents } = useEventsContext();

  const totalOpps = opportunities.length;
  const avgFit = totalOpps > 0 ? Math.round(opportunities.reduce((s, o) => s + o.fitScore, 0) / totalOpps) : 0;
  const highFit = opportunities.filter((o) => o.fitScore >= 75).length;
  const qualifiedPct = totalOpps > 0 ? Math.round((highFit / totalOpps) * 100) : 0;

  const totalAttendees = filteredEvents.reduce((s, e) => s + e.totalAttendees, 0);

  const kpis = [
    { label: "Leads Capturados", value: String(EVENT_TOTALS.leads), icon: Target, color: "text-primary" },
    { label: "ROI Estimado", value: formatCurrencyBRL(ROI_METRICS.ltvTotal), icon: DollarSign, color: "text-emerald-600" },
    { label: "Fit Score Médio", value: `${avgFit}%`, icon: Brain, color: "text-amber-600" },
    { label: "Leads Qualificados", value: `${qualifiedPct}%`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Oportunidades", value: String(EVENT_TOTALS.oportunidades), icon: Award, color: "text-purple-600" },
    { label: "Participantes", value: String(totalAttendees), icon: Users, color: "text-muted-foreground" },
    { label: "Contratos", value: String(EVENT_TOTALS.contratos), icon: FileCheck, color: "text-emerald-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {kpis.map((kpi) => (
        <Link key={kpi.label} to="/events/participants" className="group">
          <Card className="border-border/50 transition-shadow group-hover:shadow-md group-hover:border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground font-medium truncate">{kpi.label}</span>
                <HelpTooltip content={KPI_TOOLTIPS[kpi.label]} size="sm" />
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
