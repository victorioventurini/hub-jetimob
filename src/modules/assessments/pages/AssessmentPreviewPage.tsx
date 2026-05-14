/**
 * AssessmentPreviewPage — `/assessments/provas/:id/preview` (POST-BU, autenticado).
 * Renderiza o ambiente do respondente sem consumir convite e sem persistir nada.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import {
  AssessmentRunnerView,
  type RunnerLookup,
} from "@/modules/assessments/components/AssessmentRunnerView";
import { createPreviewRunnerApi } from "@/modules/assessments/runner/runnerApi";
import { usePageTitle } from "@/hooks/usePageTitle";

type Lookup = RunnerLookup & { ok: boolean; error?: string };

export default function AssessmentPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);

  usePageTitle("Pré-visualização do ambiente", {
    customDescription: "Preview do ambiente do respondente — nada é salvo.",
  });

  useEffect(() => {
    if (!id || !currentBuId) return;
    setLoading(true);
    supabase.rpc("rpc_assessment_preview_lookup", { p_assessment_id: id }).then(({ data, error }) => {
      if (error) {
        setLookup({ ok: false, error: error.message });
      } else {
        setLookup(data as unknown as Lookup);
      }
      setLoading(false);
    });
  }, [id, currentBuId, supabase]);

  if (loading) {
    return <CenterCard><Loader2 className="h-6 w-6 animate-spin" /></CenterCard>;
  }
  if (!lookup?.ok) {
    return (
      <CenterCard>
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="font-medium">Não foi possível carregar a pré-visualização</p>
        <p className="text-sm text-muted-foreground">{lookup?.error ?? "Verifique se você tem permissão e se a prova está nessa BU."}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link to={`/assessments/provas/${id}`}><ArrowLeft className="h-4 w-4 mr-2" />Voltar para a prova</Link>
        </Button>
      </CenterCard>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button asChild variant="outline" size="sm" className="shadow-lg">
          <Link to={`/assessments/provas/${id}`}><ArrowLeft className="h-3.5 w-3.5 mr-2" />Voltar para a prova</Link>
        </Button>
      </div>
      <AssessmentRunnerView lookup={lookup} api={createPreviewRunnerApi()} isPreview />
    </>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}
