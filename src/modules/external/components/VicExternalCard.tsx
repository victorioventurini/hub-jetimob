/**
 * Vic card for external users
 * Limited scope - only ticket-related suggestions
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Clock, HelpCircle, ArrowRight } from "lucide-react";
import { useVic } from "@/modules/vic/contexts/VicContext";
import { useVicEnabled } from "@/modules/vic/hooks/useVicAgent";

interface VicSuggestion {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EXTERNAL_SUGGESTIONS: VicSuggestion[] = [
  {
    id: "create-ticket",
    label: "Criar um novo ticket",
    description: "Abrir uma nova solicitação",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "track-tickets",
    label: "Acompanhar meus tickets",
    description: "Ver o status das minhas solicitações",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: "understand-status",
    label: "Entender o status de um ticket",
    description: "O que significa cada etapa",
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

export function VicExternalCard() {
  const { openPanel } = useVic();
  const { isEnabled, isLoading } = useVicEnabled();

  // Don't render if IA is disabled or still loading
  if (isLoading || !isEnabled) {
    return null;
  }

  const handleSuggestionClick = (suggestion: VicSuggestion) => {
    openPanel({
      agentSlug: "cultura", // Use culture agent for general help
      actionContext: "dashboard-culture",
      context: { 
        type: "external-help", 
        title: suggestion.label,
        additionalData: { isExternalUser: true },
      },
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
              Como posso ajudar?
            </h3>
            <p className="text-sm text-muted-foreground">
              Sou o Vic, assistente virtual
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          {EXTERNAL_SUGGESTIONS.map((suggestion) => (
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
                context: { type: "external-help", title: "Atendimento", additionalData: { isExternalUser: true } },
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
