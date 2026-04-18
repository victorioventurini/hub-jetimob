/**
 * AnalysisHistoryList — listagem de análises da BU (memoizada)
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import type { AnalysisReport } from "../../types";

interface Props {
  reports: AnalysisReport[];
}

const HistoryRow = memo(function HistoryRow({ r }: { r: AnalysisReport }) {
  const title = r.title || r.premise.slice(0, 80);
  return (
    <Link to={`/analysis/${r.id}`}>
      <Card className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{r.premise}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <Badge
          variant={
            r.status === "complete"
              ? "default"
              : r.status === "failed"
                ? "destructive"
                : "secondary"
          }
          className="shrink-0 text-[10px]"
        >
          {r.status === "complete"
            ? "Concluída"
            : r.status === "failed"
              ? "Falhou"
              : "Gerando…"}
        </Badge>
      </Card>
    </Link>
  );
});

export function AnalysisHistoryList({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma análise ainda. Crie a primeira no painel ao lado.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <HistoryRow key={r.id} r={r} />
      ))}
    </div>
  );
}
