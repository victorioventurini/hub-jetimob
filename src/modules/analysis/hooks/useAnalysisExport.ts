/**
 * useAnalysisExport — orquestra a coleta de dados de performance da BU ativa
 * e a geração do arquivo .xlsx multi-abas.
 */
import { useState, useCallback } from "react";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  collectAnalysisExport,
  type ExportPayload,
  type ExportPeriod,
} from "../services/analysisExport";
import {
  buildAnalysisWorkbook,
  downloadBlob,
} from "../services/analysisExportWorkbook";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function useAnalysisExport() {
  const { currentBu } = useBu();
  const { profile } = useAuth();
  const supabase = useBuScopedSupabase();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSummary, setLastSummary] = useState<ExportPayload | null>(null);

  const generate = useCallback(async () => {
    if (!currentBu) {
      toast.error("Selecione uma BU antes de exportar.");
      return;
    }
    setIsGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const period: ExportPeriod = {
        start: `${year}-01-01`,
        end: format(now, "yyyy-MM-dd"),
        year,
        label: `${year} YTD`,
      };
      const payload = await collectAnalysisExport({
        supabase,
        bu: { id: currentBu.id, name: currentBu.name },
        period,
        generatedBy: profile?.display_name ?? profile?.email ?? "—",
      });
      const blob = await buildAnalysisWorkbook(payload);
      const filename = `${slugify(currentBu.name)}-performance-${year}-YTD-${format(now, "yyyyMMdd")}.xlsx`;
      downloadBlob(blob, filename);
      setLastSummary(payload);
      toast.success("Planilha gerada com sucesso.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[analysis-export] falha ao gerar planilha", err);
      toast.error(`Não foi possível gerar a planilha: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  }, [currentBu, profile, supabase]);

  return { generate, isGenerating, lastSummary };
}
