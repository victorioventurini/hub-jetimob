import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUpdateInitiative } from "../../hooks";
import { 
  getInitiativeStatusLabel, 
  getInitiativePriorityLabel, 
  type Initiative, 
  type InitiativeStatus, 
  type InitiativePriority 
} from "../../types/initiative";
import { Loader2, Target, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserLink } from "@/components/links";

interface KrContext {
  id: string;
  title: string;
  objectiveTitle?: string;
  teamName?: string;
}

interface InitiativeQuickUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: Initiative | null;
  krContext?: KrContext;
}

const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
const priorities: InitiativePriority[] = ['low', 'medium', 'high'];

export function InitiativeQuickUpdateDialog({ 
  open, 
  onOpenChange, 
  initiative,
  krContext 
}: InitiativeQuickUpdateDialogProps) {
  const updateMutation = useUpdateInitiative();
  
  const [formData, setFormData] = useState({
    status: "planned" as InitiativeStatus,
    priority: "medium" as InitiativePriority,
    progress: 0,
    notes: "",
    blocker_reason: "",
  });

  // Reset form when initiative changes
  useEffect(() => {
    if (initiative && open) {
      setFormData({
        status: initiative.status,
        priority: initiative.priority || "medium",
        progress: initiative.progress || 0,
        notes: initiative.notes || "",
        blocker_reason: "",
      });
    }
  }, [initiative, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!initiative) return;

    // Combine blocker reason with notes if status is blocked
    let finalNotes = formData.notes;
    if (formData.status === 'blocked' && formData.blocker_reason) {
      finalNotes = `[Bloqueio] ${formData.blocker_reason}${formData.notes ? `\n\n${formData.notes}` : ''}`;
    }

    try {
      await updateMutation.mutateAsync({
        id: initiative.id,
        status: formData.status,
        priority: formData.priority,
        progress: formData.progress,
        notes: finalNotes || null,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getOwnerName = () => {
    if (!initiative?.owner) return "Usuário";
    if (initiative.owner.display_name) return initiative.owner.display_name;
    if (initiative.owner.first_name) {
      return `${initiative.owner.first_name}${initiative.owner.last_name ? ' ' + initiative.owner.last_name : ''}`;
    }
    return "Usuário";
  };

  const ownerName = getOwnerName();
  const ownerInitials = ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!initiative) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Iniciativa</DialogTitle>
        </DialogHeader>

        {/* Initiative Context - Read Only */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2 border">
          <h4 className="font-medium text-foreground text-sm">{initiative.name}</h4>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={initiative.owner?.photo_url || undefined} />
                <AvatarFallback className="text-[8px]">{ownerInitials}</AvatarFallback>
              </Avatar>
              <UserLink userId={initiative.owner_user_id} displayName={ownerName} />
            </div>

            {(initiative.start_date || initiative.expected_end_date) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {initiative.start_date && format(new Date(initiative.start_date), "dd MMM", { locale: ptBR })}
                  {initiative.start_date && initiative.expected_end_date && " → "}
                  {initiative.expected_end_date && format(new Date(initiative.expected_end_date), "dd MMM", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {krContext && (
            <div className="flex items-start gap-1.5 text-xs pt-1 border-t border-border/50 mt-2">
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">KR</Badge>
              <span className="text-muted-foreground line-clamp-1">{krContext.title}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: InitiativeStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
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
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: InitiativePriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
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

          {/* Blocker Reason - only when blocked */}
          {formData.status === 'blocked' && (
            <div className="space-y-2">
              <Label htmlFor="blocker_reason" className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                Motivo do bloqueio
              </Label>
              <Textarea
                id="blocker_reason"
                value={formData.blocker_reason}
                onChange={(e) => setFormData({ ...formData, blocker_reason: e.target.value })}
                placeholder="O que está impedindo o progresso desta iniciativa?"
                rows={2}
                className="border-destructive/50 focus-visible:ring-destructive/30"
              />
            </div>
          )}

          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progresso</Label>
              <span className="text-sm font-medium text-muted-foreground">{formData.progress}%</span>
            </div>
            <Slider
              value={[formData.progress]}
              onValueChange={([value]) => setFormData({ ...formData, progress: value })}
              min={0}
              max={100}
              step={5}
              className="py-2"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações gerais sobre a iniciativa..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Atualização
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
