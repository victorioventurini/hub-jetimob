import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { TeamSelect, SimpleSelect } from "@/components/selects";
import { useBu } from "@/contexts/BuContext";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onComplete: () => void;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedIds,
  onComplete,
}: BulkEditDialogProps) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const [teamId, setTeamId] = useState<string>("no-change");
  const [managerId, setManagerId] = useState<string>("no-change");

  const { data: managers } = useQuery({
    queryKey: ["managers-select", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .neq("employment_status", "terminated")
        .order("display_name");
      if (error) throw error;
      return data;
    },
    enabled: open && !!currentBu?.id,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (teamId !== "no-change") {
        updates.team_id = teamId === "none" ? null : teamId;
      }

      if (managerId !== "no-change") {
        updates.manager_user_id = managerId === "none" ? null : managerId;
      }

      // Only proceed if there's something to update
      if (Object.keys(updates).length === 1) {
        throw new Error("Selecione pelo menos um campo para atualizar");
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .in("id", selectedIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(`${selectedIds.length} jetimobers atualizados com sucesso!`);
      handleClose();
      onComplete();
    },
    onError: (error: Error) => {
      console.error("Bulk update error:", error);
      toast.error(error.message || "Erro ao atualizar. Tente novamente.");
    },
  });

  const handleClose = () => {
    setTeamId("no-change");
    setManagerId("no-change");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bulkUpdateMutation.mutate();
  };

  const hasChanges = teamId !== "no-change" || managerId !== "no-change";

  // Build options for team select with special "no-change" and "none" options
  const handleTeamChange = (value: string | undefined) => {
    setTeamId(value ?? "no-change");
  };

  const managerOptions = [
    { value: "no-change", label: "— Não alterar —" },
    { value: "none", label: "Nenhum (remover gestor)" },
    ...(managers?.map((m) => ({ value: m.id, label: m.display_name })) || []),
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edição em Massa
          </DialogTitle>
          <DialogDescription>
            Atualize {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "jetimober selecionado" : "jetimobers selecionados"}.
            Apenas os campos alterados serão atualizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Time</Label>
            {teamId === "no-change" ? (
              <SimpleSelect
                value="no-change"
                onValueChange={(v) => {
                  if (v === "no-change") return;
                  if (v === "none") {
                    setTeamId("none");
                  } else if (v === "select-team") {
                    setTeamId(""); // This will trigger the TeamSelect
                  }
                }}
                options={[
                  { value: "no-change", label: "— Não alterar —" },
                  { value: "none", label: "Nenhum (remover do time)" },
                  { value: "select-team", label: "Selecionar time..." },
                ]}
                triggerClassName="w-full"
              />
            ) : teamId === "none" ? (
              <SimpleSelect
                value="none"
                onValueChange={(v) => {
                  if (v === "no-change") setTeamId("no-change");
                  else if (v === "select-team") setTeamId("");
                }}
                options={[
                  { value: "no-change", label: "— Não alterar —" },
                  { value: "none", label: "Nenhum (remover do time)" },
                  { value: "select-team", label: "Selecionar time..." },
                ]}
                triggerClassName="w-full"
              />
            ) : (
              <TeamSelect
                value={teamId || undefined}
                onValueChange={(v) => setTeamId(v ?? "no-change")}
                includeNone
                noneLabel="Nenhum (remover do time)"
                placeholder="Selecione um time"
                triggerClassName="w-full"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Gestor</Label>
            <SimpleSelect
              value={managerId}
              onValueChange={setManagerId}
              options={managerOptions}
              placeholder="Não alterar"
              triggerClassName="w-full"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={bulkUpdateMutation.isPending || !hasChanges}
            >
              {bulkUpdateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Atualizar {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "jetimober" : "jetimobers"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
