import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";
import type { OkrStatus } from "../types";

interface CancellationReason {
  id: string;
  code: string;
  label: string;
  description: string | null;
  applies_to: string[];
}

interface CancelOkrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: "objective" | "kr";
  entityLevel: "org" | "team";
  entityTitle: string;
  onSuccess?: () => void;
}

export function CancelOkrDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  entityLevel,
  entityTitle,
  onSuccess,
}: CancelOkrDialogProps) {
  const { user } = useAuth();
  const supabase = useBuScopedSupabase();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reasonCode, setReasonCode] = useState<string>("");
  const [learning, setLearning] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [finalStatus, setFinalStatus] = useState<"cancelled" | "discarded">("cancelled");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReasonCode("");
      setLearning("");
      setAdditionalNotes("");
      setFinalStatus("cancelled");
    }
  }, [open]);

  // Fetch cancellation reasons
  const { data: reasons = [] } = useQuery({
    queryKey: ["okr-cancellation-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_cancellation_reasons")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as CancellationReason[];
    },
  });

  // Filter reasons by entity type
  const filteredReasons = reasons.filter((r) =>
    r.applies_to.includes(entityType)
  );

  const selectedReason = filteredReasons.find((r) => r.code === reasonCode);

  // Get table name based on entity
  const getTableName = () => {
    if (entityType === "objective") {
      return entityLevel === "org" ? "okr_org_objectives" : "okr_team_objectives";
    } else {
      return entityLevel === "org" ? "okr_org_key_results" : "okr_team_key_results";
    }
  };

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!reasonCode) throw new Error("Selecione um motivo");
      if (!learning.trim()) throw new Error("Descreva o aprendizado");

      const tableName = getTableName();

      const { error } = await supabase
        .from(tableName)
        .update({
          status: finalStatus as OkrStatus,
          cancellation_reason: `${selectedReason?.label || reasonCode}${additionalNotes ? `: ${additionalNotes}` : ""}`,
          cancellation_learning: learning.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["okr-org-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-team-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-org-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-team-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["all-org-objectives-view"] });

      toast({
        title: finalStatus === "cancelled" ? "Cancelado" : "Descartado",
        description: `${entityType === "objective" ? "Objetivo" : "KR"} ${
          finalStatus === "cancelled" ? "cancelado" : "descartado"
        } com sucesso. O aprendizado foi registrado.`,
      });

      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error cancelling:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível cancelar.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cancelMutation.mutate();
  };

  const canSubmit = reasonCode && learning.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Cancelar {entityType === "objective" ? "Objetivo" : "Key Result"}
          </DialogTitle>
          <DialogDescription>
            {entityTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <Label>Ação</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={finalStatus === "cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFinalStatus("cancelled")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant={finalStatus === "discarded" ? "default" : "outline"}
                size="sm"
                onClick={() => setFinalStatus("discarded")}
                className="flex-1"
              >
                Descartar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {finalStatus === "cancelled"
                ? "Cancelar: O objetivo era válido mas foi interrompido por motivos específicos."
                : "Descartar: O objetivo não deveria ter sido criado ou era fundamentalmente inviável."}
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo principal" />
              </SelectTrigger>
              <SelectContent>
                {filteredReasons.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedReason.description}
              </p>
            )}
          </div>

          {/* Additional notes for the reason */}
          {reasonCode === "other" && (
            <div className="space-y-2">
              <Label htmlFor="notes">Descreva o motivo</Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Explique o motivo específico..."
                rows={2}
              />
            </div>
          )}

          {/* Learning - Required */}
          <div className="space-y-2">
            <Label htmlFor="learning" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Aprendizado *
            </Label>
            <Textarea
              id="learning"
              value={learning}
              onChange={(e) => setLearning(e.target.value)}
              placeholder="O que aprendemos com isso? Como evitar no futuro?"
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. Esse aprendizado ficará registrado para consulta futura.
            </p>
          </div>

          {/* Educational Alert */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              Cancelar OKRs faz parte do processo de aprendizado. O importante é 
              documentar o motivo e a lição aprendida para evoluir como organização.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={cancelMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!canSubmit || cancelMutation.isPending}
            >
              {cancelMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmar {finalStatus === "cancelled" ? "Cancelamento" : "Descarte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
