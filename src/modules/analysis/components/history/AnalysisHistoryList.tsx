/**
 * AnalysisHistoryList — lista de análises anteriores
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAnalysisHistory } from "../../hooks/useAnalysisHistory";

const STATUS_VARIANT: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  generating: { label: "Gerando…", variant: "secondary" },
  complete: { label: "Concluída", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

interface ItemProps {
  id: string;
  premise: string;
  title: string | null;
  status: string;
  created_at: string;
  modules: string[];
}

const Row = memo(function Row({ id, premise, title, status, created_at, modules }: ItemProps) {
  const cfg = STATUS_VARIANT[status] ?? STATUS_VARIANT.pending;
  return (
    <Link to={`/analysis/${id}`}>
      <Card className="p-4 transition-colors hover:bg-accent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {title || premise}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {premise}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modules.slice(0, 4).map((m) => (
                <Badge key={m} variant="outline" className="text-[10px]">
                  {m}
                </Badge>
              ))}
              {modules.length > 4 && (
                <Badge variant="outline" className="text-[10px]">
                  +{modules.length - 4}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
});

export function AnalysisHistoryList() {
  const { data = [], isLoading } = useAnalysisHistory();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico…</p>;
  }
  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma análise gerada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((r) => (
        <Row
          key={r.id}
          id={r.id}
          premise={r.premise}
          title={r.title}
          status={r.status}
          created_at={r.created_at}
          modules={r.modules ?? []}
        />
      ))}
    </div>
  );
}
