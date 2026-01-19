import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { TeamSelect } from "@/components/selects";
import { SimpleSelect } from "@/components/selects";

interface ExistingProfile {
  id: string;
  user_id: string | null;
  display_name: string;
  work_email: string;
  photo_url: string | null;
  job_title_name?: string | null;
  bu_name?: string;
}

interface AddToBuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProfile: ExistingProfile | null;
}

const ROLE_OPTIONS = [
  { value: "collaborator", label: "Colaborador" },
  { value: "admin", label: "Administrador" },
];

export function AddToBuDialog({ open, onOpenChange, existingProfile }: AddToBuDialogProps) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  
  const [roleInBu, setRoleInBu] = useState<string>("collaborator");
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const [isDefault, setIsDefault] = useState(false);

  const addMembershipMutation = useMutation({
    mutationFn: async () => {
      if (!currentBu?.id) {
        throw new Error("Nenhuma BU selecionada");
      }
      
      if (!existingProfile?.id) {
        throw new Error("Perfil inválido");
      }
      
      // Criar membership na nova BU usando profile_id (Identity Cutover v3.0)
      const { error: membershipError } = await supabase
        .from("bu_user_memberships")
        .insert({
          profile_id: existingProfile.id, // Use profile_id instead of user_id
          bu_id: currentBu.id,
          role_in_bu: roleInBu as "super_admin" | "admin" | "collaborator",
          is_default: isDefault,
        });
      
      if (membershipError) throw membershipError;

      // Se selecionou um time, criar user_team_membership
      if (teamId) {
        const { error: teamError } = await supabase
          .from("user_team_memberships")
          .insert({
            user_id: existingProfile.id, // profile id
            team_id: teamId,
            is_primary: true,
          });
        
        if (teamError && !teamError.message?.includes("duplicate")) {
          console.warn("Erro ao vincular ao time:", teamError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.buMembers(currentBu?.id ?? null) });
      toast.success(`${existingProfile?.display_name} adicionado à ${currentBu?.name}!`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error adding to BU:", error);
      if (error.message?.includes("bu_user_memberships_bu_user_unique")) {
        toast.error("Este Jetimober já faz parte desta BU.");
      } else if (error.message?.includes("não possui um usuário vinculado")) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao adicionar à BU. Tente novamente.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMembershipMutation.mutate();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (!existingProfile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Adicionar Jetimober à BU
          </DialogTitle>
          <DialogDescription>
            Este Jetimober já está cadastrado. Deseja adicioná-lo também à{" "}
            <strong>{currentBu?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Perfil existente */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
            <Avatar className="h-12 w-12">
              <AvatarImage src={existingProfile.photo_url || undefined} />
              <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
                {getInitials(existingProfile.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-foreground">{existingProfile.display_name}</p>
              <p className="text-sm text-muted-foreground">{existingProfile.work_email}</p>
              {existingProfile.job_title_name && <p className="text-xs text-muted-foreground">{existingProfile.job_title_name}</p>}
            </div>
            {existingProfile.bu_name && (
              <Badge variant="secondary" className="text-xs">
                {existingProfile.bu_name}
              </Badge>
            )}
          </div>

          {/* Role na nova BU */}
          <div className="space-y-2">
            <Label>Papel nesta BU *</Label>
            <SimpleSelect
              value={roleInBu}
              onValueChange={setRoleInBu}
              options={ROLE_OPTIONS}
              triggerClassName="w-full"
            />
          </div>

          {/* Time na nova BU */}
          <div className="space-y-2">
            <Label>Time nesta BU</Label>
            <TeamSelect
              value={teamId}
              onValueChange={setTeamId}
              includeNone
              noneLabel="Nenhum"
              placeholder="Selecione um time"
              triggerClassName="w-full"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={addMembershipMutation.isPending}>
              Adicionar à BU
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
