/**
 * QuickTipsCard - Card de dicas rápidas para a home
 * 
 * Exibido quando o usuário não tem dados de time,
 * preenchendo o espaço no grid de 4 colunas.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Tip {
  id: string;
  text: string;
  linkTo?: string;
  linkLabel?: string;
}

const QUICK_TIPS: Tip[] = [
  {
    id: "1",
    text: "Atualize seus OKRs semanalmente para manter o progresso visível.",
    linkTo: "/okrs",
    linkLabel: "Ver OKRs",
  },
  {
    id: "2",
    text: "Defina seu foco do dia para aumentar sua produtividade.",
    linkTo: "/tasks",
    linkLabel: "Ver tarefas",
  },
  {
    id: "3",
    text: "Conheça os novos Jetimobeiros e fortaleça o networking.",
  },
];

export function QuickTipsCard() {
  // Rotate tips based on day of week
  const today = new Date().getDay();
  const tipIndex = today % QUICK_TIPS.length;
  const tip = QUICK_TIPS[tipIndex];

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Dica do Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tip.text}
          </p>
          
          {tip.linkTo && tip.linkLabel && (
            <Link 
              to={tip.linkTo}
              className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                "text-primary hover:text-primary/80 transition-colors"
              )}
            >
              {tip.linkLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
