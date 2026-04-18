/**
 * LoadingRotativo — mensagens rotativas durante geração de análise
 */
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

const MESSAGES = [
  "Coletando KPIs, OKRs, projetos e check-ins…",
  "Cruzando dados entre módulos para identificar padrões…",
  "Aplicando análise estratégica com sazonalidade do mercado imobiliário…",
  "Estruturando insights e ações sugeridas…",
];

export function LoadingRotativo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        <Sparkles className="h-12 w-12 text-primary" />
        <Loader2 className="absolute -bottom-1 -right-1 h-6 w-6 animate-spin text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Gerando análise estratégica</p>
        <p className="mt-1 text-xs text-muted-foreground transition-opacity duration-300">
          {MESSAGES[index]}
        </p>
      </div>
    </div>
  );
}
