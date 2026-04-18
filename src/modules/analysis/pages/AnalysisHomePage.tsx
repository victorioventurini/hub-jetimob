/**
 * AnalysisHomePage — composer + histórico
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { PremiseField } from "../components/composer/PremiseField";
import { AdditionalContextField } from "../components/composer/AdditionalContextField";
import { ModeSelector } from "../components/composer/ModeSelector";
import { ModulesChips } from "../components/composer/ModulesChips";
import { ScopePills } from "../components/composer/ScopePills";
import { PeriodPills } from "../components/composer/PeriodPills";
import { DepthSelector } from "../components/composer/DepthSelector";
import { AnalysisHistoryList } from "../components/history/AnalysisHistoryList";
import { useGenerateAnalysis } from "../hooks/useGenerateAnalysis";
import { useAnalysisHistory } from "../hooks/useAnalysisHistory";
import { useAnalysisTemplates } from "../hooks/useAnalysisTemplates";
import type { AnalysisComposerState } from "../types";

function defaultPeriod(): AnalysisComposerState["period"] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    preset: "last_30_days",
  };
}

const INITIAL: AnalysisComposerState = {
  premise: "",
  additionalContext: "",
  mode: "auto",
  modules: [],
  scope: { buWide: true },
  period: defaultPeriod(),
  depth: "auto",
  templateId: null,
};

export default function AnalysisHomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateIdFromUrl = params.get("template_id");

  const { data: templates = [] } = useAnalysisTemplates();
  const { data: history = [], isLoading: loadingHistory } = useAnalysisHistory();
  const generate = useGenerateAnalysis();

  const [state, setState] = useState<AnalysisComposerState>(INITIAL);

  // Hidratar template via URL
  useEffect(() => {
    if (!templateIdFromUrl || templates.length === 0) return;
    const tpl = templates.find((t) => t.id === templateIdFromUrl);
    if (!tpl) return;
    setState((prev) => ({
      ...prev,
      premise: tpl.premise,
      mode: tpl.defaults?.mode ?? "auto",
      depth: tpl.defaults?.depth ?? "auto",
      modules: tpl.defaults?.modules ?? [],
      scope: tpl.defaults?.scope ?? { buWide: true },
      templateId: tpl.id,
    }));
  }, [templateIdFromUrl, templates]);

  const canGenerate = useMemo(
    () => state.premise.trim().length >= 10 && !generate.isPending,
    [state.premise, generate.isPending],
  );

  const handleGenerate = async () => {
    const res = await generate.mutateAsync(state);
    navigate(`/analysis/${res.report_id}`);
  };

  const modulesDisabled = state.mode === "auto";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            Análise Estratégica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cruze KPIs, OKRs, projetos e rituais com IA para gerar insights acionáveis.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/analysis/templates">
            <FileText className="mr-1.5 h-4 w-4" />
            Templates
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="space-y-5 p-5">
          <PremiseField
            value={state.premise}
            onChange={(v) => setState((s) => ({ ...s, premise: v }))}
          />
          <AdditionalContextField
            value={state.additionalContext}
            onChange={(v) => setState((s) => ({ ...s, additionalContext: v }))}
          />
          <ModeSelector
            value={state.mode}
            onChange={(v) => setState((s) => ({ ...s, mode: v }))}
          />
          <ModulesChips
            value={state.modules}
            onChange={(v) => setState((s) => ({ ...s, modules: v }))}
            disabled={modulesDisabled}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ScopePills
              value={state.scope}
              onChange={(v) => setState((s) => ({ ...s, scope: v }))}
            />
            <PeriodPills
              value={state.period}
              onChange={(v) => setState((s) => ({ ...s, period: v }))}
            />
          </div>
          <DepthSelector
            value={state.depth}
            onChange={(v) => setState((s) => ({ ...s, depth: v }))}
          />

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setState(INITIAL)}
              disabled={generate.isPending}
            >
              Limpar
            </Button>
            <Button onClick={handleGenerate} disabled={!canGenerate}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Gerar análise
            </Button>
          </div>
        </Card>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico
          </h2>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <AnalysisHistoryList reports={history} />
          )}
        </aside>
      </div>
    </div>
  );
}
