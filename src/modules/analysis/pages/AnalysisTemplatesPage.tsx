/**
 * AnalysisTemplatesPage — galeria de templates
 */
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Lock } from "lucide-react";
import { useAnalysisTemplates } from "../hooks/useAnalysisTemplates";

export default function AnalysisTemplatesPage() {
  const { data: templates = [], isLoading } = useAnalysisTemplates();

  // Group by category
  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to="/analysis">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <FileText className="h-6 w-6 text-primary" />
          Templates de análise
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece com uma premissa pré-formulada e ajuste como quiser.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando templates…</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <Card key={t.id} className="flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                      {t.is_admin_only && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          <Lock className="mr-0.5 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 flex-1 text-xs text-muted-foreground">
                      {t.premise}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link to={`/analysis?template_id=${t.id}`}>Usar este template</Link>
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
