/**
 * VicLeaderInsightsCard - AI insights for leaders
 */
import { Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVic } from "@/modules/vic/contexts/VicContext";
import { useSidepanel } from "@/modules/vic/contexts/VicContext";

interface VicLeaderInsightsCardProps {
  teamId: string | null;
  teamName?: string;
}

// Default insights when no dynamic data is available
const defaultInsights = [
  {
    id: '1',
    label: 'Como está o alinhamento estratégico do meu time?',
    context: 'alignment',
  },
  {
    id: '2',
    label: 'Quais OKRs precisam de atenção esta semana?',
    context: 'okrs',
  },
  {
    id: '3',
    label: 'Dê-me um resumo de performance do time',
    context: 'performance',
  },
];

export function VicLeaderInsightsCard({ teamId, teamName }: VicLeaderInsightsCardProps) {
  const { openVic, isAvailable } = useVic();

  if (!isAvailable) {
    return null;
  }

  const handleInsightClick = (insight: typeof defaultInsights[0]) => {
    openVic({
      initialMessage: insight.label,
      context: {
        teamId,
        teamName,
        insightType: insight.context,
      },
    });
  };

  const handleOpenVic = () => {
    openVic({
      context: {
        teamId,
        teamName,
      },
    });
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Pergunte ao Vic
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sugestões para você hoje
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insights */}
        <div className="space-y-2">
          {defaultInsights.map((insight) => (
            <button
              key={insight.id}
              onClick={() => handleInsightClick(insight)}
              className="w-full text-left p-3 rounded-lg bg-background/50 hover:bg-background border transition-colors"
            >
              <span className="text-sm text-foreground">
                {insight.label}
              </span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <Button
          className="w-full gap-2"
          onClick={handleOpenVic}
        >
          <MessageSquare className="h-4 w-4" />
          Conversar com o Vic
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
