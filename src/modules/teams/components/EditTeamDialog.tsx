import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle } from "lucide-react";
import { useUpdateTeam, useTeams, useAvailableLeaders } from "../hooks/useTeams";
import { TeamWithRelations, TeamFormData } from "../types";

interface EditTeamDialogProps {
  team: TeamWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeamDialog({ team, open, onOpenChange }: EditTeamDialogProps) {
  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    leader_user_id: null,
    parent_team_id: null,
    status: "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateTeam = useUpdateTeam();
  const { data: teams } = useTeams(true);
  const { data: leaders } = useAvailableLeaders();

  // Teams that can be parent (excluding self and descendants)
  const availableParentTeams = teams?.filter((t) => {
    if (!team) return t.status === "active";
    if (t.id === team.id) return false;
    // Check if t is a descendant of team
    const isDescendant = (parentId: string | null): boolean => {
      if (!parentId) return false;
      if (parentId === team.id) return true;
      const parent = teams.find((p) => p.id === parentId);
      return parent ? isDescendant(parent.parent_team_id) : false;
    };
    return !isDescendant(t.parent_team_id) && t.status === "active";
  }) || [];

  const selectedParentTeam = teams?.find((t) => t.id === formData.parent_team_id);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        leader_user_id: team.leader_user_id,
        parent_team_id: team.parent_team_id,
        status: team.status as "active" | "inactive",
      });
    }
  }, [team]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !team) return;

    try {
      await updateTeam.mutateAsync({ id: team.id, data: formData });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Time</DialogTitle>
          <DialogDescription>
            Atualize as informações do time "{team.name}".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome *</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Engenharia, Design, Vendas..."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              placeholder="Descreva as responsabilidades e escopo do time..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Leader */}
          <div className="space-y-2">
            <Label htmlFor="edit-leader">Líder</Label>
            <Select
              value={formData.leader_user_id || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  leader_user_id: value === "none" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um líder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem líder definido</SelectItem>
                {leaders?.map((leader) => (
                  <SelectItem key={leader.id} value={leader.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={leader.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(leader.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{leader.display_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Team */}
          <div className="space-y-2">
            <Label htmlFor="edit-parent_team">Time Pai</Label>
            <Select
              value={formData.parent_team_id || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  parent_team_id: value === "none" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um time pai (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (time raiz)</SelectItem>
                {availableParentTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedParentTeam?.status === "inactive" && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span>O time pai selecionado está inativo</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            {formData.status === "inactive" && (
              <p className="text-xs text-muted-foreground">
                Times inativos não aparecem em novos cadastros, mas mantêm
                histórico.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={updateTeam.isPending}
            >
              {updateTeam.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
