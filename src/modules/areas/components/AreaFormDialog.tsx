/**
 * AreaFormDialog - Create/Edit area dialog
 */
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Loader2 } from "lucide-react";
import { BuUserSelect } from "@/components/selects/BuUserSelect";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import { useCreateArea, useUpdateArea, useDeleteArea } from "../hooks";
import { AreaWithRelations, AreaFormData } from "../types";

interface AreaFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  area?: AreaWithRelations | null;
}

const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
];

export function AreaFormDialog({ open, setOpen, area }: AreaFormDialogProps) {
  const isEditing = !!area;

  const [formData, setFormData] = useState<AreaFormData>({
    name: "",
    description: "",
    leader_user_id: null,
    co_leader_user_id: null,
    status: "active",
    color: null,
    icon: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  // Reset form when dialog opens
  useDialogFormReset(
    open,
    useCallback(() => {
      if (area) {
        setFormData({
          name: area.name,
          description: area.description || "",
          leader_user_id: area.leader_user_id,
          co_leader_user_id: area.co_leader_user_id,
          status: area.status as "active" | "inactive",
          color: area.color,
          icon: area.icon,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          leader_user_id: null,
          co_leader_user_id: null,
          status: "active",
          color: null,
          icon: null,
        });
      }
      setErrors({});
    }, [area])
  );

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
      if (isEditing && area) {
        await updateArea.mutateAsync({ id: area.id, data: formData });
      } else {
        await createArea.mutateAsync(formData);
      }
      setOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!area) return;
    try {
      await deleteArea.mutateAsync(area.id);
      setDeleteDialogOpen(false);
      setOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createArea.isPending || updateArea.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Área" : "Nova Área"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Atualize as informações da área estratégica."
                : "Crie uma nova área para agrupar times estrategicamente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Revenue, Produto, Operações"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o propósito estratégico desta área..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Líder</Label>
                <BuUserSelect
                  value={formData.leader_user_id ?? undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, leader_user_id: value })
                  }
                  placeholder="Selecione o líder"
                  allowNone
                  noneLabel="Sem líder"
                />
              </div>

              <div className="space-y-2">
                <Label>Co-líder</Label>
                <BuUserSelect
                  value={formData.co_leader_user_id ?? undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, co_leader_user_id: value })
                  }
                  placeholder="Selecione o co-líder"
                  allowNone
                  noneLabel="Sem co-líder"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                  {formData.color && (
                    <button
                      type="button"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setFormData({ ...formData, color: null })}
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isPending}
                >
                  Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a área "{area?.name}". Os times vinculados a
              esta área ficarão sem área definida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteArea.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
