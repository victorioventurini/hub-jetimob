/**
 * KPI Cards — Top-level metrics
 * Clicking any card navigates to /events/participants
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Target, DollarSign, Brain, Award } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useEventsContext } from "../../context/EventsContext";
import { SPONSOR_MOCK } from "../../mocks/sponsor";
import { EVENTS_MOCK } from "../../mocks/events";
import { PARTICIPANTS_MOCK } from "../../mocks/participants";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const KPI_TOOLTIPS: Record<string, string> = {
  "Oportunidades Capturadas": "Total de oportunidades de negócio identificadas durante os eventos, com base nas interações e interesses declarados pelos participantes.",
  "ROI Estimado": "Retorno sobre investimento projetado, calculado com base no LTV médio por lead qualificado e na taxa de conversão estimada (35%).",
  "Fit Score Médio": "Média do score de adequação dos leads aos critérios de qualificação do patrocinador (0–100%).",
  "Leads Qualificados": "Percentual de oportunidades com Fit Score ≥ 75, indicando alta aderência ao perfil ideal de cliente.",
  "Brand Recall": "Percentual de participantes que lembraram da marca do patrocinador espontaneamente ou de forma estimulada após o evento.",
  "Participantes": "Número total de participantes que efetivamente estiveram presentes nos eventos do período selecionado.",
};

export function KpiCards() {
  const { opportunities } = useEventsContext();

  const totalOpps = opportunities.length;
  const avgFit = totalOpps > 0 ? Math.round(opportunities.reduce((s, o) => s + o.fitScore, 0) / totalOpps) : 0;
  const highFit = opportunities.filter((o) => o.fitScore >= 75).length;
  const qualifiedPct = totalOpps > 0 ? Math.round((highFit / totalOpps) * 100) : 0;

  const avgLtv = SPONSOR_MOCK.areasOfOperation.reduce((s, a) => s + a.ltvPerLead, 0) / SPONSOR_MOCK.areasOfOperation.length;
  const estimatedRoi = Math.round(highFit * avgLtv * 0.35);

  const totalAttendees = EVENTS_MOCK.reduce((s, e) => s + e.totalAttendees, 0);

  const kpis = [
    { label: "Oportunidades Capturadas", value: String(totalOpps), icon: Target, color: "text-primary" },
    { label: "ROI Estimado", value: formatCurrency(estimatedRoi), icon: DollarSign, color: "text-emerald-600" },
    { label: "Fit Score Médio", value: `${avgFit}%`, icon: Brain, color: "text-amber-600" },
    { label: "Leads Qualificados", value: `${qualifiedPct}%`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Brand Recall", value: "78%", icon: Award, color: "text-purple-600" },
    { label: "Participantes", value: String(totalAttendees), icon: Users, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
