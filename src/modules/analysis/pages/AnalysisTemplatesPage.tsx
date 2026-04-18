/**
 * AnalysisTemplatesPage — galeria de templates
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnalysisTemplates } from "../hooks/useAnalysisTemplates";

export default function AnalysisTemplatesPage() {
  usePageTitle("Templates de análise");
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useAnalysisTemplates();

  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/analysis")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Voltar
      </Button>

      <PageHeader
        title="Templates de análise"
        description="Use um template para iniciar rapidamente."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !templates.length ? (
        <p className="text-sm text-muted-foreground">Nenhum template disponível.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <Card key={t.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-foreground">{t.name}</h3>
                        {t.is_admin_only && (
                          <Badge variant="secondary" className="text-[10px]">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">
                        {t.premise}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/analysis?template_id=${t.id}`)}
                      >
                        Usar este template
                      </Button>
                    </CardContent>
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
