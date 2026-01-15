import { useState, useCallback, useMemo } from "react";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { useCreateTeam, useUpdateTeam, useTeams, useDeleteTeam } from "../hooks";
import { TeamWithRelations, TeamFormData } from "../types";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { TeamSelect } from "@/components/selects/TeamSelect";
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { AreaSelect } from "@/modules/areas/components";

interface TeamFormDialogProps {
  /** Team to edit. If null/undefined, dialog is in create mode */
  team?: TeamWithRelations | null;
  /** Controls dialog open state (for edit mode) */
  open?: boolean;
  /** Callback when open state changes (for edit mode) */
  onOpenChange?: (open: boolean) => void;
  /** Optional trigger element (for create mode) */
  trigger?: React.ReactNode;
  /** Default parent team ID for new teams */
  defaultParentTeamId?: string;
}

export function TeamFormDialog({
  team,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  defaultParentTeamId,
}: TeamFormDialogProps) {
  const isEditing = !!team;
  const { canManageTeam } = useTeamManagement();

  // Defense in depth: don't render edit dialog if user can't manage this team
  // This respects impersonation context via useTeamManagement
  if (isEditing && team && !canManageTeam(team.id)) {
    return null;
  }
  
  // Internal state for uncontrolled mode (create)
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    leader_user_id: null,
    parent_team_id: defaultParentTeamId || null,
    area_id: null,
    status: "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const { data: teams } = useTeams(true);

  // Calculate IDs to exclude from parent team selection (self + descendants)
  const excludedTeamIds = useMemo(() => {
    if (!team || !teams) return [];
    
    const excluded: string[] = [team.id];
    
    // Find all descendants recursively
    const findDescendants = (parentId: string) => {
      teams.forEach((t) => {
        if (t.parent_team_id === parentId && !excluded.includes(t.id)) {
          excluded.push(t.id);
          findDescendants(t.id);
        }
      });
    };
    
    findDescendants(team.id);
    return excluded;
  }, [team, teams]);

  const selectedParentTeam = teams?.find((t) => t.id === formData.parent_team_id);

  // Reset form when dialog opens
  useDialogFormReset(open, useCallback(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        leader_user_id: team.leader_user_id,
        parent_team_id: team.parent_team_id,
        area_id: team.area_id || null,
        status: team.status as "active" | "inactive",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        leader_user_id: null,
        parent_team_id: defaultParentTeamId || null,
        area_id: null,
        status: "active",
      });
    }
    setErrors({});
  }, [team, defaultParentTeamId]));

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
    if (!validate()) return;

    try {
      if (isEditing && team) {
        await updateTeam.mutateAsync({ id: team.id, data: formData });
      } else {
        await createTeam.mutateAsync(formData);
      }
      setOpen(false);
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

  const isPending = createTeam.isPending || updateTeam.isPending;

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Time" : "Criar Novo Time"}</DialogTitle>
        <DialogDescription>
          {isEditing 
            ? `Atualize as informações do time "${team?.name}".`
            : "Crie um novo time para organizar sua estrutura organizacional."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            placeholder="Ex: Engenharia, Design, Vendas..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Descreva as responsabilidades e escopo do time..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Leader */}
        <div className="space-y-2">
          <Label htmlFor="leader">Líder</Label>
          <BuUserSelect
            value={formData.leader_user_id ?? undefined}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                leader_user_id: value,
              })
            }
            placeholder="Selecione um líder"
            showSearch={false}
            showBadges={false}
            allowNone
            excludeExternal
            noneLabel="Sem líder definido"
          />
        </div>

        {/* Área */}
        <div className="space-y-2">
          <Label htmlFor="area">Área</Label>
          <AreaSelect
            value={formData.area_id}
            onChange={(value) =>
              setFormData({
                ...formData,
                area_id: value,
              })
            }
            placeholder="Selecione uma área (opcional)"
          />
          <p className="text-xs text-muted-foreground">
            Áreas agrupam times estrategicamente (ex: Revenue, Produto).
          </p>
        </div>

        {/* Parent Team */}
        <div className="space-y-2">
          <Label htmlFor="parent_team">Time Pai</Label>
          <TeamSelect
            value={formData.parent_team_id}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                parent_team_id: value ?? null,
              })
            }
            placeholder="Selecione um time pai (opcional)"
            includeNone
            noneLabel="Nenhum (time raiz)"
            excludeIds={excludedTeamIds}
          />
          {selectedParentTeam?.status === "inactive" && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>O time pai selecionado está inativo</span>
            </div>
          )}
          {!isEditing && (
            <p className="text-xs text-muted-foreground">
              Times pai são unidades de governança para consolidação e visão estratégica.
            </p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
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
              Times inativos não aparecem em novos cadastros, mas mantêm histórico.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className={`flex pt-4 ${isEditing ? 'justify-between' : 'justify-end gap-3'}`}>
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={isPending}>
              {isPending 
                ? (isEditing ? "Salvando..." : "Criando...") 
                : (isEditing ? "Salvar Alterações" : "Criar Time")}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );

  // For create mode with trigger
  if (!isEditing && trigger !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Time
            </Button>
          )}
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // For create mode without trigger (default button)
  if (!isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Time
          </Button>
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // For edit mode (controlled)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (team) {
            await deleteTeam.mutateAsync(team.id);
            setDeleteDialogOpen(false);
            setOpen(false);
          }
        }}
        title="Excluir Time"
        description={`Tem certeza que deseja excluir o time "${team?.name}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteTeam.isPending}
      />
    </>
  );
}
