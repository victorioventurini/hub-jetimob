import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAddSquadMember } from "../hooks/useSquads";
import { useProfilesList } from "@/hooks/useSharedData";
import { useBu } from "@/contexts/BuContext";
import { SquadRole, SQUAD_ROLE_LABELS } from "../types/squad";

interface AddSquadMemberDialogProps {
  squadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberIds: string[];
}

export function AddSquadMemberDialog({ 
  squadId, 
  open, 
  onOpenChange,
  existingMemberIds
}: AddSquadMemberDialogProps) {
  const { currentBu } = useBu();
  const { data: profiles } = useProfilesList(currentBu?.id);
  const addMember = useAddSquadMember();

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<SquadRole>("member");

  const availableProfiles = profiles?.filter(
    (p) => !existingMemberIds.includes(p.id)
  ) || [];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    await addMember.mutateAsync({
      squadId,
      data: { user_id: userId, role },
    });

    setUserId("");
    setRole("member");
    onOpenChange(false);
  };

  const selectedProfile = profiles?.find((p) => p.id === userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Membro ao Squad</DialogTitle>
            <DialogDescription>
              Selecione um usuário e defina seu papel no squad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Usuário *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário">
                    {selectedProfile && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedProfile.photo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(selectedProfile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedProfile.display_name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((profile) => (
                    <SelectItem 
                      key={profile.id} 
                      value={profile.id}
                      textValue={profile.display_name || undefined}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.photo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span>{profile.display_name}</span>
                          {profile.job_title && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {profile.job_title}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Papel no Squad</Label>
              <Select value={role} onValueChange={(v: SquadRole) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_owner">{SQUAD_ROLE_LABELS.product_owner}</SelectItem>
                  <SelectItem value="tech_lead">{SQUAD_ROLE_LABELS.tech_lead}</SelectItem>
                  <SelectItem value="ux_ui_lead">{SQUAD_ROLE_LABELS.ux_ui_lead}</SelectItem>
                  <SelectItem value="member">{SQUAD_ROLE_LABELS.member}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!userId || addMember.isPending}
            >
              {addMember.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
