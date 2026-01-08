import { useState, useCallback } from "react";
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
import { useCreateSquad, useUpdateSquad, useDeleteSquad } from "../hooks/useSquads";
import { useTeams } from "../hooks/useTeams";
import { 
  SquadWithRelations, 
  SquadProduct, 
  SQUAD_PRODUCT_LABELS 
} from "../types/squad";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface SquadFormDialogProps {
  /** Squad to edit. If null/undefined, dialog is in create mode */
  squad?: SquadWithRelations | null;
  /** Controls dialog open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Default team ID for new squads */
  defaultTeamId?: string;
}

export function SquadFormDialog({ 
  squad,
  open, 
  onOpenChange,
  defaultTeamId 
}: SquadFormDialogProps) {
  const isEditing = !!squad;
  
  const createSquad = useCreateSquad();
  const updateSquad = useUpdateSquad();
  const deleteSquad = useDeleteSquad();
  const { data: teams } = useTeams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<SquadProduct[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>(defaultTeamId ? [defaultTeamId] : []);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Reset form when dialog opens
  useDialogFormReset(open, useCallback(() => {
    if (squad) {
      setName(squad.name);
      setDescription(squad.description || "");
      setProducts(squad.products);
      setTeamIds(squad.teams?.map((t) => t.id) || []);
      setStatus(squad.status);
    } else {
      setName("");
      setDescription("");
      setProducts([]);
      setTeamIds(defaultTeamId ? [defaultTeamId] : []);
      setStatus("active");
    }
  }, [squad, defaultTeamId]));

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

    const data = {
      name,
      description,
      products,
      team_ids: teamIds,
      status,
    };

    if (isEditing && squad) {
      await updateSquad.mutateAsync({ id: squad.id, data });
    } else {
      await createSquad.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const allProducts: SquadProduct[] = ["crm", "cms", "erp"];
  const isPending = createSquad.isPending || updateSquad.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Squad" : "Criar Squad"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Atualize as informações do squad."
                  : "Crie um novo squad multidisciplinar para entrega de produto."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Squad *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Squad CRM"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
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
                        id={`product-${product}`}
                        checked={products.includes(product)}
                        onCheckedChange={() => handleProductToggle(product)}
                      />
                      <Label 
                        htmlFor={`product-${product}`}
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
                        id={`team-${team.id}`}
                        checked={teamIds.includes(team.id)}
                        onCheckedChange={() => handleTeamToggle(team.id)}
                      />
                      <Label 
                        htmlFor={`team-${team.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {team.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
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

            <DialogFooter className={`flex ${isEditing ? 'justify-between sm:justify-between' : ''}`}>
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
                  disabled={!name.trim() || isPending}
                >
                  {isPending 
                    ? (isEditing ? "Salvando..." : "Criando...") 
                    : (isEditing ? "Salvar" : "Criar Squad")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEditing && squad && (
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
      )}
    </>
  );
}
