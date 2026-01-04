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
import { useCreateSquad } from "../hooks/useSquads";
import { useTeams } from "../hooks/useTeams";
import { SquadProduct, SQUAD_PRODUCT_LABELS } from "../types/squad";

interface CreateSquadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTeamId?: string;
}

export function CreateSquadDialog({ 
  open, 
  onOpenChange,
  defaultTeamId 
}: CreateSquadDialogProps) {
  const createSquad = useCreateSquad();
  const { data: teams } = useTeams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState<SquadProduct[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>(defaultTeamId ? [defaultTeamId] : []);
  const [status, setStatus] = useState<"active" | "inactive">("active");

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

    await createSquad.mutateAsync({
      name,
      description,
      products,
      team_ids: teamIds,
      status,
    });

    // Reset form
    setName("");
    setDescription("");
    setProducts([]);
    setTeamIds(defaultTeamId ? [defaultTeamId] : []);
    setStatus("active");
    onOpenChange(false);
  };

  const allProducts: SquadProduct[] = ["crm", "cms", "erp"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Squad</DialogTitle>
            <DialogDescription>
              Crie um novo squad multidisciplinar para entrega de produto.
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
              disabled={!name.trim() || createSquad.isPending}
            >
              {createSquad.isPending ? "Criando..." : "Criar Squad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
