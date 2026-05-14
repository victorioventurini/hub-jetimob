/**
 * PublicAssessmentRunner — `/q/:token` (PRE-BU, sem login).
 * Identifica respondente por CPF e executa o questionário com timer + anti-fraude.
 *
 * A UI vive em `AssessmentRunnerView` (compartilhada com a página de preview admin).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/globalClient";
import { Card, CardContent } from "@/components/ui/card";
import {
  AssessmentRunnerView,
  type RunnerLookup,
} from "@/modules/assessments/components/AssessmentRunnerView";
import { createRealRunnerApi } from "@/modules/assessments/runner/runnerApi";

type Lookup = RunnerLookup & { ok: boolean; error?: string };

export default function PublicAssessmentRunner() {
  const { token } = useParams<{ token: string }>();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("rpc_assessment_invite_lookup", { p_token: token }).then(({ data, error }) => {
      if (error) {
        setLookup({ ok: false, error: error.message });
      } else {
        setLookup(data as unknown as Lookup);
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return <CenterCard><Loader2 className="h-6 w-6 animate-spin" /></CenterCard>;
  }
  if (!lookup?.ok) {
    return (
      <CenterCard>
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="font-medium">Convite indisponível</p>
        <p className="text-sm text-muted-foreground">{lookup?.error ?? "Verifique o link com quem te convidou."}</p>
      </CenterCard>
    );
  }

  return <AssessmentRunnerView lookup={lookup} api={createRealRunnerApi(token!)} />;
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
