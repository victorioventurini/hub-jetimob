import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useProfilesList } from "@/hooks/useSharedData";
import { useCreateInitiative, useUpdateInitiative } from "../../hooks/useInitiatives";
import { getInitiativeStatusLabel, getInitiativePriorityLabel, type Initiative, type InitiativeStatus, type InitiativePriority } from "../../types/initiative";
import { Loader2, Check, ChevronsUpDown, Target, Users, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
}

const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
const priorities: InitiativePriority[] = ['low', 'medium', 'high'];

export function InitiativeDialog({ open, onOpenChange, krId, krContext, initiative }: InitiativeDialogProps) {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const createMutation = useCreateInitiative();
  const updateMutation = useUpdateInitiative();
  const { data: profiles = [] } = useProfilesList(currentBu?.id);
  
  const isEditing = !!initiative;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [contributorsOpen, setContributorsOpen] = useState(false);

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

  // Get default owner (current user's profile id)
  const currentUserProfile = useMemo(() => {
    return profiles.find(p => p.user_id === user?.id);
  }, [profiles, user?.id]);

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
        owner_user_id: currentUserProfile?.id || "",
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
  }, [initiative, open, currentUserProfile?.id]);

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

  const getProfileById = (id: string) => profiles.find(p => p.id === id);

  const toggleContributor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contributors: prev.contributors.includes(id)
        ? prev.contributors.filter(c => c !== id)
        : [...prev.contributors, id]
    }));
  };

  const removeContributor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contributors: prev.contributors.filter(c => c !== id)
    }));
  };

  // Available statuses (can't start as completed when creating)
  const availableStatuses = isEditing 
    ? statuses 
    : statuses.filter(s => s !== 'completed');

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

          {/* Owner Select */}
          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ownerOpen}
                  className="w-full justify-between"
                >
                  {formData.owner_user_id ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={getProfileById(formData.owner_user_id)?.photo_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getProfileById(formData.owner_user_id)?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{getProfileById(formData.owner_user_id)?.display_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecione o responsável</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar usuário..." />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {profiles.map((profile) => (
                        <CommandItem
                          key={profile.id}
                          value={profile.display_name || profile.id}
                          onSelect={() => {
                            setFormData({ ...formData, owner_user_id: profile.id });
                            setOwnerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.owner_user_id === profile.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Avatar className="w-6 h-6 mr-2">
                            <AvatarImage src={profile.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {profile.display_name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{profile.display_name}</span>
                            {profile.job_title && (
                              <span className="text-xs text-muted-foreground">{profile.job_title}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Contributors Multi-Select */}
          <div className="space-y-2">
            <Label>Contribuidores</Label>
            <Popover open={contributorsOpen} onOpenChange={setContributorsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={contributorsOpen}
                  className="w-full justify-between min-h-9 h-auto"
                >
                  <span className="text-muted-foreground">
                    {formData.contributors.length > 0 
                      ? `${formData.contributors.length} selecionado(s)`
                      : "Adicionar contribuidores (opcional)"
                    }
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar usuário..." />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {profiles
                        .filter(p => p.id !== formData.owner_user_id)
                        .map((profile) => (
                          <CommandItem
                            key={profile.id}
                            value={profile.display_name || profile.id}
                            onSelect={() => toggleContributor(profile.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.contributors.includes(profile.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Avatar className="w-6 h-6 mr-2">
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {profile.display_name?.slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{profile.display_name}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected contributors chips */}
            {formData.contributors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.contributors.map((id) => {
                  const profile = getProfileById(id);
                  if (!profile) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={profile.photo_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {profile.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{profile.display_name?.split(' ')[0]}</span>
                      <button
                        type="button"
                        onClick={() => removeContributor(id)}
                        className="ml-0.5 hover:bg-muted rounded-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    Prioridade indica foco relativo, não urgência diária
                  </TooltipContent>
                </Tooltip>
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
              <Label htmlFor="blocker_reason">Motivo do bloqueio</Label>
              <Input
                id="blocker_reason"
                value={formData.blocker_reason}
                onChange={(e) => setFormData({ ...formData, blocker_reason: e.target.value })}
                placeholder="O que está impedindo o progresso?"
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
              <Label htmlFor="expected_end_date">Previsão de término *</Label>
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
              <p className="text-xs text-muted-foreground">
                Data estimada para conclusão da iniciativa
              </p>
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
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Riscos, dependências ou observações importantes sobre esta iniciativa."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
