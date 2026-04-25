import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { BuUserSelect, BuUserMultiSelect } from "@/components/selects";
import { useProfileId } from "@/hooks/useIdentity";
import { useBu } from "@/contexts/BuContext";
import { useCreateInitiative, useUpdateInitiative, useInitiativeNameValidation } from "../../hooks";
import { getInitiativeStatusLabel, getInitiativePriorityLabel, type Initiative, type InitiativeStatus, type InitiativePriority } from "../../types/initiative";
import { Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { AskToVicInline } from "@/modules/vic/components/AskToVic";
import { InitiativeNameFeedback } from "./InitiativeNameFeedback";
import { InitiativeCulturalMessage } from "./InitiativeCulturalMessage";
import { CharCountFeedback } from "@/components/shared/CharCountFeedback";
import { ENTITY_NAME_LIMITS } from "@/shared/constants/entityLimits";

interface KrContext {
  id: string;
  title: string;
  objectiveTitle?: string;
  teamName?: string;
}

interface InitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  krId: string;
  krContext?: KrContext;
  initiative?: Initiative | null;
  /**
   * ID do time dono da KR. Quando informado, o seletor de Responsável e
   * Contribuidores é escopado a este time + subtimes (padrão canônico
   * `mem://standards/users/team-filter-includes-subteams`).
   */
  krTeamId?: string;
}

const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
const priorities: InitiativePriority[] = ['low', 'medium', 'high'];

export function InitiativeDialog({ open, onOpenChange, krId, krContext, initiative, krTeamId }: InitiativeDialogProps) {
  const profileId = useProfileId();
  const { currentBu } = useBu();
  const createMutation = useCreateInitiative();
  const updateMutation = useUpdateInitiative();

  const isEditing = !!initiative;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    owner_user_id: "",
    contributors: [] as string[],
    status: "planned" as InitiativeStatus,
    priority: "medium" as InitiativePriority,
    start_date: "",
    expected_end_date: "",
    progress: 0,
    notes: "",
    blocker_reason: "",
  });

  // Semantic validation for initiative name
  const { feedback: nameFeedback, isValidating: isNameValidating } = useInitiativeNameValidation(
    formData.name,
    krContext?.title || '',
    { disabled: !open || isEditing }
  );

  useEffect(() => {
    if (initiative) {
      setFormData({
        name: initiative.name,
        description: initiative.description || "",
        owner_user_id: initiative.owner_user_id,
        contributors: initiative.contributors || [],
        status: initiative.status,
        priority: initiative.priority || "medium",
        start_date: initiative.start_date || "",
        expected_end_date: initiative.expected_end_date || "",
        progress: initiative.progress || 0,
        notes: initiative.notes || "",
        blocker_reason: "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        // Default owner = current user's profile id (if available in current scope)
        owner_user_id: profileId || "",
        contributors: [],
        status: "planned",
        priority: "medium",
        start_date: "",
        expected_end_date: "",
        progress: 0,
        notes: "",
        blocker_reason: "",
      });
    }
  }, [initiative, open, profileId]);

  // Validation
  const today = format(new Date(), 'yyyy-MM-dd');
  const isEndDateValid = !formData.expected_end_date || formData.expected_end_date >= today;
  const canSubmit = formData.name.trim() && 
                    formData.owner_user_id && 
                    formData.expected_end_date && 
                    isEndDateValid &&
                    (isEditing || formData.status !== 'completed');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;

    // Combine blocker reason with notes if status is blocked
    let finalNotes = formData.notes;
    if (formData.status === 'blocked' && formData.blocker_reason) {
      finalNotes = `[Bloqueio] ${formData.blocker_reason}${formData.notes ? `\n\n${formData.notes}` : ''}`;
    }

    try {
      if (isEditing && initiative) {
        await updateMutation.mutateAsync({
          id: initiative.id,
          name: formData.name,
          description: formData.description || undefined,
          owner_user_id: formData.owner_user_id,
          status: formData.status,
          priority: formData.priority,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date || undefined,
          progress: formData.progress,
          contributors: formData.contributors.length > 0 ? formData.contributors : undefined,
          notes: finalNotes || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          kr_id: krId,
          bu_id: currentBu?.id,
          owner_user_id: formData.owner_user_id,
          status: formData.status,
          priority: formData.priority,
          start_date: formData.start_date || undefined,
          expected_end_date: formData.expected_end_date,
          progress: formData.progress,
          contributors: formData.contributors.length > 0 ? formData.contributors : undefined,
          notes: finalNotes || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Available statuses (can't start as completed when creating)
  const availableStatuses = isEditing 
    ? statuses 
    : statuses.filter(s => s !== 'completed');

  // Context for AskToVic
  const vicContext = {
    module: 'okrs' as const,
    wizard: 'creation' as const,
    step: 'initiatives' as const,
    krTitle: krContext?.title,
    objectiveTitle: krContext?.objectiveTitle,
    teamName: krContext?.teamName,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Iniciativa" : "Nova Iniciativa"}
          </DialogTitle>
        </DialogHeader>

        {/* KR Context - Read Only */}
        {krContext && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 border">
            {krContext.objectiveTitle && (
              <div className="flex items-start gap-2 text-xs">
                <Target className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground line-clamp-1">
                  <span className="font-medium text-foreground">Objetivo:</span> {krContext.objectiveTitle}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">KR</Badge>
              <span className="text-muted-foreground line-clamp-2">{krContext.title}</span>
            </div>
            {krContext.teamName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{krContext.teamName}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field with AI validation */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="name">Nome *</Label>
              <HelpTooltip 
                content="Iniciativas descrevem ações concretas, não resultados finais. Responda: O que será feito?" 
                size="sm"
              />
              <AskToVicInline context={vicContext} />
            </div>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="O que será feito para mover esta KR?"
              required
              maxLength={ENTITY_NAME_LIMITS.INITIATIVE_NAME}
            />
            <CharCountFeedback value={formData.name} maxLength={ENTITY_NAME_LIMITS.INITIATIVE_NAME} />
            {!isEditing && (
              <InitiativeNameFeedback 
                feedback={nameFeedback} 
                isValidating={isNameValidating} 
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva brevemente como esta iniciativa deve ajudar o KR."
              rows={2}
            />
          </div>

          {/* Owner Select - canonical BuUserSelect, scoped by KR team + subteams */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Responsável *</Label>
              <HelpTooltip
                content="Responsável é quem puxa, acompanha e ajusta. Não é quem 'ajuda'."
                size="sm"
              />
            </div>
            <BuUserSelect
              value={formData.owner_user_id || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, owner_user_id: value || "" })
              }
              placeholder="Selecione o responsável"
              teamId={krTeamId}
              includeSubteams
              excludeExternal
              showBadges={false}
            />
          </div>

          {/* Contributors Multi-Select - canonical BuUserMultiSelect, scoped by KR team + subteams */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Contribuidores</Label>
              <HelpTooltip
                content="Use contribuidores quando a iniciativa depende de mais pessoas, não para diluir responsabilidade."
                size="sm"
              />
            </div>
            <BuUserMultiSelect
              value={formData.contributors}
              onValueChange={(value) =>
                setFormData({ ...formData, contributors: value })
              }
              placeholder="Adicionar contribuidores (opcional)"
              teamId={krTeamId}
              includeSubteams
              excludeExternal
              excludeUserIds={
                formData.owner_user_id ? [formData.owner_user_id] : []
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Status</Label>
                <HelpTooltip 
                  content="Status descreve o momento da iniciativa, não seu sucesso." 
                  size="sm"
                />
              </div>
              <Select
                value={formData.status}
                onValueChange={(value: InitiativeStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getInitiativeStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Prioridade</Label>
                <HelpTooltip 
                  content="Prioridade indica foco relativo dentro do KR — não urgência operacional." 
                  size="sm"
                />
              </div>
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

          {/* Blocker reason when status is blocked */}
          {formData.status === 'blocked' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="blocker_reason">Motivo do bloqueio</Label>
                <HelpTooltip 
                  content="Registrar bloqueios ajuda o líder a destravar — não é um registro de falha." 
                  size="sm"
                />
              </div>
              <Input
                id="blocker_reason"
                value={formData.blocker_reason}
                onChange={(e) => setFormData({ ...formData, blocker_reason: e.target.value })}
                placeholder="O que está impedindo o avanço?"
              />
            </div>
          )}

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
              <div className="flex items-center gap-1">
                <Label htmlFor="expected_end_date">Previsão de término *</Label>
                <HelpTooltip 
                  content="Datas em iniciativas são estimativas. Se mudar, ajuste — não esconda." 
                  size="sm"
                />
              </div>
              <Input
                id="expected_end_date"
                type="date"
                value={formData.expected_end_date}
                onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                min={today}
                required
                className={cn(
                  !isEndDateValid && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {!isEndDateValid && (
                <p className="text-xs text-destructive">Data não pode ser no passado</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Progresso: {formData.progress}%</Label>
              <Slider
                value={[formData.progress]}
                onValueChange={([value]) => setFormData({ ...formData, progress: value })}
                max={100}
                step={5}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="notes">Notas</Label>
              <HelpTooltip 
                content="Registre riscos, dependências ou bloqueios. Iniciativas sem contexto viram tarefas perdidas." 
                size="sm"
              />
              <AskToVicInline context={vicContext} />
            </div>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Riscos, dependências ou observações importantes sobre esta iniciativa."
              rows={2}
            />
          </div>

          {/* Cultural message - only on creation */}
          {!isEditing && <InitiativeCulturalMessage />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={!canSubmit}>
              {isEditing ? "Salvar" : "Criar Iniciativa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
