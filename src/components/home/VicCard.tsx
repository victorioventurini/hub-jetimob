import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, BarChart3, MessageSquare, ArrowRight } from "lucide-react";
import { useVic } from "@/modules/vic/contexts/VicContext";
import { useVicEnabled } from "@/modules/vic/hooks/useVicAgent";
import type { VicAgentSlug, VicActionContext, VicContext } from "@/modules/vic/types";

interface VicSuggestion {
  id: string;
  label: string;
  description: string;
  agentSlug: VicAgentSlug;
  actionContext: VicActionContext;
  context: VicContext;
  icon: React.ReactNode;
}

const SUGGESTIONS: VicSuggestion[] = [
  {
    id: "review-okrs",
    label: "Revisar meus OKRs",
    description: "Análise da qualidade e clareza dos objetivos",
    agentSlug: "coach-okrs",
    actionContext: "okr-review-quality",
    context: { type: "okr-review", title: "Revisão geral de OKRs" },
    icon: <Target className="h-4 w-4" />,
  },
  {
    id: "analyze-kpis",
    label: "Analisar KPIs",
    description: "Entender variações e tendências",
    agentSlug: "analista-kpis",
    actionContext: "kpi-analyze-variation",
    context: { type: "kpi-analysis", title: "Análise geral de KPIs" },
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: "structure-decision",
    label: "Estruturar decisão",
    description: "Organize uma decisão importante",
    agentSlug: "facilitador-decisoes",
    actionContext: "decision-structure",
    context: { type: "decision", title: "Nova decisão" },
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

export function VicCard() {
  const { openPanel } = useVic();
  const { isEnabled, isLoading } = useVicEnabled();

  // Don't render if IA is disabled or still loading
  if (isLoading || !isEnabled) {
    return null;
  }

  const handleSuggestionClick = (suggestion: VicSuggestion) => {
    openPanel({
      agentSlug: suggestion.agentSlug,
      actionContext: suggestion.actionContext,
      context: suggestion.context,
    });
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-full blur-3xl transform translate-x-8 -translate-y-8" />
      </div>

      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Pergunte ao Vic
            </h3>
            <p className="text-sm text-muted-foreground">
              Sugestões para você hoje
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full group flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-all text-left"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-background text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {suggestion.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-primary"
            onClick={() =>
              openPanel({
                agentSlug: "cultura",
                actionContext: "dashboard-culture",
                context: { type: "general", title: "Conversa livre" },
              })
            }
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            Conversar com o Vic
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
