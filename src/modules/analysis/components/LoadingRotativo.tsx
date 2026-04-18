/**
 * LoadingRotativo — mensagens rotativas durante geração
 */
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const MESSAGES = [
  "Coletando dados dos módulos selecionados…",
  "Analisando padrões e correlações…",
  "Gerando insights estratégicos…",
  "Preparando ações sugeridas…",
];

export function LoadingRotativo() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-foreground">{MESSAGES[idx]}</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
