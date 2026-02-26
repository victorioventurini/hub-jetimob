/**
 * BrandRecallLeadsOverlap — Leads Qualificados com Brand Recall
 * Derives percentages from PARTICIPANTS_FULL_MOCK + OPPORTUNITIES_MOCK
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Brain, Target } from "lucide-react";
import { useEventsContext } from "../../context/EventsContext";
import { PARTICIPANTS_FULL_MOCK, FIT_HIGH_THRESHOLD } from "../../mocks/participantsFull";
import { JOURNEYS_MOCK } from "../../mocks/events";

export function BrandRecallLeadsOverlap() {
  const navigate = useNavigate();
  const { filteredOpportunities: opportunities, filters } = useEventsContext();

  const segments = useMemo(() => {
    // Filter participants by scope
    let data = PARTICIPANTS_FULL_MOCK.filter((p) => p.year === filters.year);
    if (filters.scope === "event" && filters.selectedEventId) {
      data = data.filter((p) => p.eventIds.includes(filters.selectedEventId!));
    }
    if (filters.scope === "journey" && filters.selectedJourneyId) {
      const journey = JOURNEYS_MOCK.find((j) => j.id === filters.selectedJourneyId);
      if (journey) {
        data = data.filter((p) => p.eventIds.some((eid) => journey.eventIds.includes(eid)));
      }
    }

    // Only attendees (participante/lead/oportunidade)
    const attendees = data.filter((p) => p.statusInscricao !== "inscrito");
    const totalAttendees = attendees.length;

    // Fit alto count
    const fitAlto = attendees.filter((p) => p.fitScore >= FIT_HIGH_THRESHOLD).length;

    // Opportunities (leads) count — from context
    const totalOpps = opportunities.length;

    // Brand recall simulation: ~35% of attendees recalled the brand
    // Among fit alto, higher recall rate (~55%)
    const brandRecallRate = 0.35;
    const fitBrandRecallRate = 0.55;

    const brandRecallTotal = Math.round(totalAttendees * brandRecallRate);
    const fitWithBrandRecall = Math.round(fitAlto * fitBrandRecallRate);
    const brandRecallNoFit = brandRecallTotal - fitWithBrandRecall;
    const fitNoBrandRecall = fitAlto - fitWithBrandRecall;

    const total = brandRecallNoFit + fitWithBrandRecall + fitNoBrandRecall;
    if (total === 0) return [
      { label: "Apenas Associação Marca-Dor", sublabel: "(Não Fit)", value: 0, pct: 0 },
      { label: "Leads Qualificados com Brand Recall", sublabel: "(Associação Marca-Dor + Fit)", value: 0, pct: 0 },
      { label: "Apenas Fit", sublabel: "(Sem Associação)", value: 0, pct: 0 },
    ];

    return [
      {
        label: "Apenas Associação Marca-Dor",
        sublabel: "(Não Fit)",
        value: brandRecallNoFit,
        pct: Math.round((brandRecallNoFit / total) * 100),
        bgClass: "bg-blue-500",
        textClass: "text-white",
      },
      {
        label: "Leads Qualificados com Brand Recall",
        sublabel: "(Associação Marca-Dor + Fit)",
        value: fitWithBrandRecall,
        pct: Math.round((fitWithBrandRecall / total) * 100),
        bgClass: "bg-emerald-500",
        textClass: "text-white",
      },
      {
        label: "Apenas Fit",
        sublabel: "(Sem Associação)",
        value: fitNoBrandRecall,
        pct: Math.round((fitNoBrandRecall / total) * 100),
        bgClass: "bg-orange-500",
        textClass: "text-white",
      },
    ];
  }, [opportunities, filters]);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate("/events/participants")}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Leads Qualificados com Brand Recall
          <HelpTooltip
            content="Demonstração da interseção entre reconhecimento de marca (associação à dor) e alinhamento com o Perfil de Fit. Leads que citaram uma dor de interesse, são Fit e associaram a marca à resolução da dor."
            size="sm"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header label */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>Total de Leads Fit</span>
          <Target className="h-4 w-4" />
        </div>

        {/* Stacked horizontal bar */}
        <div className="flex w-full rounded-md overflow-hidden border border-border h-28">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.bgClass} ${seg.textClass} flex flex-col items-center justify-center px-2 text-center border-r last:border-r-0 border-white/20`}
              style={{ width: `${Math.max(seg.pct, 10)}%` }}
            >
              <span className="text-[10px] leading-tight font-medium">
                {seg.label}
              </span>
              <span className="text-[9px] leading-tight opacity-80">
                {seg.sublabel}
              </span>
              <span className="text-lg font-bold mt-1">{seg.pct}%</span>
            </div>
          ))}
        </div>

        {/* Bottom annotation */}
        <p className="text-[10px] text-center text-muted-foreground leading-snug">
          Fit e associou a marca a resolução da dor
          <br />
          (% de associação) e são Fit.
        </p>
      </CardContent>
    </Card>
  );
}
