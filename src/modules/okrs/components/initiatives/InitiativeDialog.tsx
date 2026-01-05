import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useCreateInitiative, useUpdateInitiative } from "../../hooks/useInitiatives";
import { getInitiativeStatusLabel, getInitiativePriorityLabel, type Initiative, type InitiativeStatus, type InitiativePriority } from "../../types/initiative";
import { Loader2 } from "lucide-react";

interface InitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  krId: string;
  initiative?: Initiative | null;
}

const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
const priorities: InitiativePriority[] = ['low', 'medium', 'high'];

export function InitiativeDialog({ open, onOpenChange, krId, initiative }: InitiativeDialogProps) {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const createMutation = useCreateInitiative();
  const updateMutation = useUpdateInitiative();
  
  const isEditing = !!initiative;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planned" as InitiativeStatus,
    priority: "medium" as InitiativePriority,
    start_date: "",
    expected_end_date: "",
    progress: 0,
    notes: "",
  });

  useEffect(() => {
    if (initiative) {
      setFormData({
        name: initiative.name,
        description: initiative.description || "",
        status: initiative.status,
        priority: initiative.priority || "medium",
        start_date: initiative.start_date || "",
        expected_end_date: initiative.expected_end_date || "",
        progress: initiative.progress || 0,
        notes: initiative.notes || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        status: "planned",
        priority: "medium",
        start_date: "",
        expected_end_date: "",
        progress: 0,
        notes: "",
      });
    }
  }, [initiative, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      if (isEditing && initiative) {
        await updateMutation.mutateAsync({
          id: initiative.id,
          name: formData.name,
          description: formData.description || undefined,
          status: formData.status,
          priority: formData.priority,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date || undefined,
          progress: formData.progress,
          notes: formData.notes || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          kr_id: krId,
          bu_id: currentBu?.id,
          owner_user_id: user?.id || "",
          status: formData.status,
          priority: formData.priority,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date || undefined,
          progress: formData.progress,
          notes: formData.notes || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Iniciativa" : "Nova Iniciativa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="O que será feito para mover esta KR?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva brevemente a iniciativa..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: InitiativeStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getInitiativeStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: InitiativePriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {getInitiativePriorityLabel(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_end_date">Previsão de término</Label>
              <Input
                id="expected_end_date"
                type="date"
                value={formData.expected_end_date}
                onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Progresso: {formData.progress}%</Label>
            <Slider
              value={[formData.progress]}
              onValueChange={([value]) => setFormData({ ...formData, progress: value })}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
