/**
 * AnalysisHomePage — composer + histórico
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain } from "lucide-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PremiseField } from "../components/composer/PremiseField";
import { AdditionalContextField } from "../components/composer/AdditionalContextField";
import { ModeSelector } from "../components/composer/ModeSelector";
import { ModulesChips } from "../components/composer/ModulesChips";
import { ScopePills } from "../components/composer/ScopePills";
import { PeriodPills } from "../components/composer/PeriodPills";
import { DepthSelector } from "../components/composer/DepthSelector";
import { AnalysisHistoryList } from "../components/history/AnalysisHistoryList";
import { useGenerateAnalysis } from "../hooks/useGenerateAnalysis";
import { useAnalysisTemplates } from "../hooks/useAnalysisTemplates";
import {
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import {
  coerceAnalysisDepth,
  type AnalysisComposerState,
  type AnalysisModule,
} from "../types";

function defaultState(): AnalysisComposerState {
  return {
    premise: "",
    additional_context: "",
    mode: "auto",
    modules: ["kpis", "okrs"],
    scope: {},
    period: {
      start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      label: "Este mês",
    },
    depth: "standard",
  };
}

export default function AnalysisHomePage() {
  usePageTitle("Análise Estratégica");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateId = params.get("template_id");
  const { data: templates = [] } = useAnalysisTemplates();
  const generate = useGenerateAnalysis();

  const [state, setState] = useState<AnalysisComposerState>(defaultState);
  const [scopeMode, setScopeMode] = useState("bu");

  // Pré-preenche a partir de template
  useEffect(() => {
    if (!templateId || !templates.length) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const d = (tpl.defaults ?? {}) as Partial<AnalysisComposerState>;
    setState((prev) => ({
      ...prev,
      premise: tpl.premise || prev.premise,
      mode: (d.mode as AnalysisComposerState["mode"]) || prev.mode,
      modules: (d.modules as AnalysisModule[]) || prev.modules,
      depth: d.depth ? coerceAnalysisDepth(d.depth) : prev.depth,
      template_id: tpl.id,
    }));
  }, [templateId, templates]);

  const canSubmit = useMemo(
    () => state.premise.trim().length >= 5 && !generate.isPending,
    [state.premise, generate.isPending]
  );

  const onSubmit = async () => {
    const result = await generate.mutateAsync({
      premise: state.premise.trim(),
      additional_context: state.additional_context.trim() || undefined,
      mode: state.mode,
      modules: state.mode === "auto" ? [] : state.modules,
      scope: state.scope,
      period: state.period,
      depth: state.depth,
      template_id: state.template_id,
    });
    if (result?.report_id) navigate(`/analysis/${result.report_id}`);
  };

  return (
    <HubLayout>
      <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
        <PageHeader
          title="Análise Estratégica"
          description="Gere análises com IA combinando KPIs, OKRs, projetos e check-ins."
          breadcrumbs={[{ label: "Análise Estratégica" }]}
          actions={
            <Button variant="outline" asChild>
              <Link to="/analysis/templates">Templates</Link>
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base">Nova análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 pt-0 md:p-6 md:pt-0">
              <PremiseField
                value={state.premise}
                onChange={(premise) => setState((s) => ({ ...s, premise }))}
              />
              <AdditionalContextField
                value={state.additional_context}
                onChange={(additional_context) =>
                  setState((s) => ({ ...s, additional_context }))
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ModeSelector
                  value={state.mode}
                  onChange={(mode) => setState((s) => ({ ...s, mode }))}
                />
                <DepthSelector
                  value={state.depth}
                  onChange={(depth) => setState((s) => ({ ...s, depth }))}
                />
              </div>
              {state.mode !== "auto" && (
                <ModulesChips
                  value={state.modules}
                  onChange={(modules) => setState((s) => ({ ...s, modules }))}
                />
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <ScopePills value={scopeMode} onChange={setScopeMode} />
                <PeriodPills
                  value={state.period}
                  onChange={(period) => setState((s) => ({ ...s, period }))}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generate.isPending ? "Gerando…" : "Gerar análise"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <AnalysisHistoryList />
            </CardContent>
          </Card>
        </div>
      </div>
    </HubLayout>
  );
}
