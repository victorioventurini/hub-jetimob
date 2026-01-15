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
import { useAddSquadMember } from "../hooks";
import { BuUserSelect } from "@/components/selects/BuUserSelect";
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
  const addMember = useAddSquadMember();

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<SquadRole>("member");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    await addMember.mutateAsync({
      squadId,
      data: { user_id: userId, role },
    });

    setUserId(undefined);
    setRole("member");
    onOpenChange(false);
  };

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
              <BuUserSelect
                value={userId}
                onValueChange={(val) => setUserId(val ?? undefined)}
                placeholder="Selecione um usuário"
                excludeUserIds={existingMemberIds}
                showSearch={false}
                showBadges={false}
                excludeExternal
              />
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
