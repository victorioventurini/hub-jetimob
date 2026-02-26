/**
 * BrandRecallLeadsOverlap — Leads Qualificados com Brand Recall
 * 3-segment horizontal bar: Apenas Associação Marca-Dor (Não Fit),
 * Leads Qualificados com Brand Recall (Associação Marca-Dor + Fit),
 * Apenas Fit (Sem Associação)
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Brain, Target } from "lucide-react";

const SEGMENTS = [
  {
    label: "Apenas Associação Marca-Dor",
    sublabel: "(Não Fit)",
    value: 22,
    bgClass: "bg-blue-500",
    textClass: "text-white",
  },
  {
    label: "Leads Qualificados com Brand Recall",
    sublabel: "(Associação Marca-Dor + Fit)",
    value: 38,
    bgClass: "bg-emerald-500",
    textClass: "text-white",
  },
  {
    label: "Apenas Fit",
    sublabel: "(Sem Associação)",
    value: 40,
    bgClass: "bg-orange-500",
    textClass: "text-white",
  },
];

export function BrandRecallLeadsOverlap() {
  const navigate = useNavigate();

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
          {SEGMENTS.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.bgClass} ${seg.textClass} flex flex-col items-center justify-center px-2 text-center border-r last:border-r-0 border-white/20`}
              style={{ width: `${seg.value}%` }}
            >
              <span className="text-[10px] leading-tight font-medium">
                {seg.label}
              </span>
              <span className="text-[9px] leading-tight opacity-80">
                {seg.sublabel}
              </span>
              <span className="text-lg font-bold mt-1">{seg.value}%</span>
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
