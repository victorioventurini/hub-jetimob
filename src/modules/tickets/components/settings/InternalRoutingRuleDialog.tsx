// ============================================================
// INTERNAL ROUTING RULE DIALOG
// Dialog para criar/editar regras de roteamento interno
// ============================================================

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, Target } from "lucide-react";
import {
  useCreateInternalRoutingRule,
  useUpdateInternalRoutingRule,
} from "../../hooks";
import { TicketCategory, TicketInternalRoutingRule, TicketSubcategory } from "../../types";
import { useTeams, useSquads } from "@/modules/teams/hooks";
import { useBuProfiles } from "@/hooks/useNotificationAdmin";
import { useBu } from "@/contexts/BuContext";

// ============================================================
// SCHEMA
// ============================================================

const formSchema = z.object({
  level: z.enum(["category", "subcategory"]),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  assignee_user_ids: z.array(z.string()).default([]),
  assignee_team_ids: z.array(z.string()).default([]),
  assignee_squad_ids: z.array(z.string()).default([]),
  watcher_user_ids: z.array(z.string()).default([]),
  watcher_team_ids: z.array(z.string()).default([]),
  watcher_squad_ids: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(999).default(100),
  notes: z.string().nullable().optional(),
}).refine((data) => {
  if (data.level === "category") {
    return !!data.category_id;
  }
  return !!data.subcategory_id;
}, {
  message: "Selecione uma categoria ou subcategoria",
  path: ["category_id"],
});

type FormData = z.infer<typeof formSchema>;

// ============================================================
// PROPS
// ============================================================

interface InternalRoutingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: TicketInternalRoutingRule | null;
  categories: TicketCategory[];
}

// ============================================================
// COMPONENT
// ============================================================

export function InternalRoutingRuleDialog({
  open,
  onOpenChange,
  rule,
  categories,
}: InternalRoutingRuleDialogProps) {
  const { mutate: create, isPending: isCreating } = useCreateInternalRoutingRule();
  const { mutate: update, isPending: isUpdating } = useUpdateInternalRoutingRule();
  const isPending = isCreating || isUpdating;

  const { currentBu } = useBu();
  const { data: teams = [], isLoading: loadingTeams } = useTeams();
  const { data: squads = [], isLoading: loadingSquads } = useSquads();
  const { data: profiles = [], isLoading: loadingProfiles } = useBuProfiles(currentBu?.id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      level: "subcategory",
      category_id: undefined,
      subcategory_id: undefined,
      assignee_user_ids: [],
      assignee_team_ids: [],
      assignee_squad_ids: [],
      watcher_user_ids: [],
      watcher_team_ids: [],
      watcher_squad_ids: [],
      priority: 100,
      notes: null,
    },
  });

  // Flatten subcategories
  const allSubcategories: (TicketSubcategory & { categoryName: string })[] = categories.flatMap(
    (cat) =>
      (cat.subcategories || []).map((sub) => ({
        ...sub,
        categoryName: cat.name,
      }))
  );

  // Filter subcategories by selected category
  const filteredSubcategories = selectedCategoryId
    ? allSubcategories.filter((s) => s.category_id === selectedCategoryId)
    : allSubcategories;

  // Reset form when dialog opens/closes or rule changes
  useEffect(() => {
    if (open) {
      if (rule) {
        const isSubcategory = !!rule.subcategory_id;
        const categoryId = isSubcategory
          ? rule.subcategory?.category?.id || null
          : rule.category_id;

        setSelectedCategoryId(categoryId || null);

        form.reset({
          level: isSubcategory ? "subcategory" : "category",
          category_id: rule.category_id || undefined,
          subcategory_id: rule.subcategory_id || undefined,
          assignee_user_ids: rule.assignee_user_ids || [],
          assignee_team_ids: rule.assignee_team_ids || [],
          assignee_squad_ids: rule.assignee_squad_ids || [],
          watcher_user_ids: rule.watcher_user_ids || [],
          watcher_team_ids: rule.watcher_team_ids || [],
          watcher_squad_ids: rule.watcher_squad_ids || [],
          priority: rule.priority || 100,
          notes: rule.notes || null,
        });
      } else {
        setSelectedCategoryId(null);
        form.reset({
          level: "subcategory",
          category_id: undefined,
          subcategory_id: undefined,
          assignee_user_ids: [],
          assignee_team_ids: [],
          assignee_squad_ids: [],
          watcher_user_ids: [],
          watcher_team_ids: [],
          watcher_squad_ids: [],
          priority: 100,
          notes: null,
        });
      }
    }
  }, [open, rule, form]);

  const onSubmit = (data: FormData) => {
    const payload = {
      category_id: data.level === "category" ? data.category_id : null,
      subcategory_id: data.level === "subcategory" ? data.subcategory_id : null,
      assignee_user_ids: data.assignee_user_ids,
      assignee_team_ids: data.assignee_team_ids,
      assignee_squad_ids: data.assignee_squad_ids,
      watcher_user_ids: data.watcher_user_ids,
      watcher_team_ids: data.watcher_team_ids,
      watcher_squad_ids: data.watcher_squad_ids,
      priority: data.priority,
      notes: data.notes || null,
    };

    if (rule) {
      update({ id: rule.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const level = form.watch("level");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Editar Regra de Roteamento" : "Nova Regra de Roteamento Interno"}
          </DialogTitle>
          <DialogDescription>
            Configure a atribuição automática de tickets internos para usuários, times ou squads.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Level Selection */}
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Escopo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear selections when changing level
                        form.setValue("category_id", undefined);
                        form.setValue("subcategory_id", undefined);
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="category" id="level-category" />
                        <Label htmlFor="level-category">Categoria</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="subcategory" id="level-subcategory" />
                        <Label htmlFor="level-subcategory">Subcategoria</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {level === "category"
                      ? "A regra será aplicada a todos os tickets desta categoria"
                      : "A regra será aplicada apenas a tickets desta subcategoria específica"}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Category/Subcategory Selection */}
            {level === "category" ? (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-4">
                {/* Filter by category (optional) */}
                <div>
                  <Label className="text-sm text-muted-foreground">Filtrar por categoria (opcional)</Label>
                  <Select
                    value={selectedCategoryId || "all"}
                    onValueChange={(v) => {
                      setSelectedCategoryId(v === "all" ? null : v);
                      form.setValue("subcategory_id", undefined);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategoria</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma subcategoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSubcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.categoryName} → {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Assignees Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Responsáveis</Label>
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users" className="gap-1">
                    <Users className="h-4 w-4" />
                    Usuários
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="gap-1">
                    <Building2 className="h-4 w-4" />
                    Times
                  </TabsTrigger>
                  <TabsTrigger value="squads" className="gap-1">
                    <Target className="h-4 w-4" />
                    Squads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="assignee_user_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingProfiles ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : profiles.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhum usuário disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {profiles.map((profile) => (
                              <div key={profile.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`assignee-user-${profile.id}`}
                                  checked={field.value?.includes(profile.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, profile.id]
                                        : current.filter((id) => id !== profile.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`assignee-user-${profile.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {profile.display_name || profile.work_email || 'Usuário'}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>

                <TabsContent value="teams" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="assignee_team_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingTeams ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : teams.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhum time disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {teams.map((team) => (
                              <div key={team.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`assignee-team-${team.id}`}
                                  checked={field.value?.includes(team.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, team.id]
                                        : current.filter((id) => id !== team.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`assignee-team-${team.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {team.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>

                <TabsContent value="squads" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="assignee_squad_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingSquads ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : squads.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhuma squad disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {squads.map((squad) => (
                              <div key={squad.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`assignee-squad-${squad.id}`}
                                  checked={field.value?.includes(squad.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, squad.id]
                                        : current.filter((id) => id !== squad.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`assignee-squad-${squad.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {squad.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Watchers Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Observadores</Label>
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users" className="gap-1">
                    <Users className="h-4 w-4" />
                    Usuários
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="gap-1">
                    <Building2 className="h-4 w-4" />
                    Times
                  </TabsTrigger>
                  <TabsTrigger value="squads" className="gap-1">
                    <Target className="h-4 w-4" />
                    Squads
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="watcher_user_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingProfiles ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : profiles.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhum usuário disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {profiles.map((profile) => (
                              <div key={profile.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`watcher-user-${profile.id}`}
                                  checked={field.value?.includes(profile.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, profile.id]
                                        : current.filter((id) => id !== profile.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`watcher-user-${profile.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {profile.display_name || profile.work_email || 'Usuário'}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>

                <TabsContent value="teams" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="watcher_team_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingTeams ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : teams.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhum time disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {teams.map((team) => (
                              <div key={team.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`watcher-team-${team.id}`}
                                  checked={field.value?.includes(team.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, team.id]
                                        : current.filter((id) => id !== team.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`watcher-team-${team.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {team.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>

                <TabsContent value="squads" className="border rounded-md p-2 mt-2">
                  <FormField
                    control={form.control}
                    name="watcher_squad_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-40">
                        {loadingSquads ? (
                          <div className="space-y-2 p-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        ) : squads.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhuma squad disponível
                          </p>
                        ) : (
                          <div className="space-y-2 p-2">
                            {squads.map((squad) => (
                              <div key={squad.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`watcher-squad-${squad.id}`}
                                  checked={field.value?.includes(squad.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, squad.id]
                                        : current.filter((id) => id !== squad.id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`watcher-squad-${squad.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {squad.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                    />
                  </FormControl>
                  <FormDescription>
                    Menor número = maior prioridade. Usado para resolver conflitos entre regras.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre esta regra de roteamento..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : rule ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
