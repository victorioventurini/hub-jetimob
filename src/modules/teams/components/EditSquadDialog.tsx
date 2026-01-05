import { useState, useCallback, useRef, useEffect } from "react";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useUpdateSquad, useDeleteSquad } from "../hooks/useSquads";
import { useTeams } from "../hooks/useTeams";
import { 
  SquadWithRelations, 
  SquadProduct, 
  SQUAD_PRODUCT_LABELS 
} from "../types/squad";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface EditSquadDialogProps {
  squad: SquadWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSquadDialog({ squad, open, onOpenChange }: EditSquadDialogProps) {
  const updateSquad = useUpdateSquad();
  const deleteSquad = useDeleteSquad();
  const { data: teams } = useTeams();

  const [name, setName] = useState(squad.name);
  const [description, setDescription] = useState(squad.description || "");
  const [products, setProducts] = useState<SquadProduct[]>(squad.products);
  const [teamIds, setTeamIds] = useState<string[]>(squad.teams?.map((t) => t.id) || []);
  const [status, setStatus] = useState<"active" | "inactive">(squad.status);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    setName(squad.name);
    setDescription(squad.description || "");
    setProducts(squad.products);
    setTeamIds(squad.teams?.map((t) => t.id) || []);
    setStatus(squad.status);
  }, [squad.name, squad.description, squad.products, squad.teams, squad.status]));

  const handleProductToggle = (product: SquadProduct) => {
    setProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product]
    );
  };

  const handleTeamToggle = (teamId: string) => {
    setTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await updateSquad.mutateAsync({
      id: squad.id,
      data: {
        name,
        description,
        products,
        team_ids: teamIds,
        status,
      },
    });

    onOpenChange(false);
  };

  const allProducts: SquadProduct[] = ["crm", "cms", "erp"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Squad</DialogTitle>
            <DialogDescription>
              Atualize as informações do squad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome do Squad *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Squad CRM"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo do squad..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Produtos</Label>
              <div className="flex gap-4">
                {allProducts.map((product) => (
                  <div key={product} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-product-${product}`}
                      checked={products.includes(product)}
                      onCheckedChange={() => handleProductToggle(product)}
                    />
                    <Label 
                      htmlFor={`edit-product-${product}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {SQUAD_PRODUCT_LABELS[product]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Times Vinculados</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                {teams?.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-team-${team.id}`}
                      checked={teamIds.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                    />
                    <Label 
                      htmlFor={`edit-team-${team.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {team.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(v: "active" | "inactive") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!name.trim() || updateSquad.isPending}
              >
                {updateSquad.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          await deleteSquad.mutateAsync(squad.id);
          setDeleteDialogOpen(false);
          onOpenChange(false);
        }}
        title="Excluir Squad"
        description={`Tem certeza que deseja excluir o squad "${squad.name}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteSquad.isPending}
      />
    </Dialog>
  );
}
