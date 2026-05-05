import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export function trendArrow(variation: number | null, direction?: 'up' | 'down' | null) {
  if (variation == null) return <ArrowRight className="h-3.5 w-3.5" />;
  // Normaliza pelo sentido desejado: positivo = bom.
  const oriented = direction === 'down' ? -variation : variation;
  if (oriented >= 10) return <ArrowUp className="h-3.5 w-3.5 text-status-green" />;
  if (oriented > 1) return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
  if (oriented <= -10) return <ArrowDown className="h-3.5 w-3.5 text-status-red" />;
  if (oriented < -1) return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function statusToKpiBadge(rag: string | null) {
  if (rag === 'green') return { label: 'Verde', cls: 'bg-status-green-muted text-status-green' };
  if (rag === 'yellow') return { label: 'Amarelo', cls: 'bg-status-yellow-muted text-status-yellow' };
  if (rag === 'red') return { label: 'Vermelho', cls: 'bg-status-red-muted text-status-red' };
  return { label: 'Sem dados', cls: 'bg-muted text-muted-foreground' };
}

export function getFallback(text: string) {
  return text
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

export function extractLearnings(reflectionData: Record<string, any> | null) {
  const data = reflectionData?.data ?? reflectionData ?? {};
  const keep = data.keep ?? data.learnings?.keep ?? data.whatWorked ?? [];
  const stop = data.stop ?? data.learnings?.stop ?? data.stopDoing ?? [];
  const debts = data.debitos ?? data.debts ?? data.learnings?.debts ?? [];
  const nextStepItems = data.nextSteps ?? data.itensDecisao ?? [];

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  };

  return {
    keep: toArray(keep),
    stop: toArray(stop),
    debts: toArray(debts),
    nextStepItems: toArray(nextStepItems),
  };
}
