import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import { useBu } from "@/contexts/BuContext";
import { z } from "zod";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { AddToBuDialog } from "./AddToBuDialog";
import { TeamSelect, SimpleSelect } from "@/components/selects";

const jetimoberSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  work_email: z.string().trim().email("E-mail inválido"),
  job_title: z.string().trim().min(1, "Cargo é obrigatório").max(100),
  city: z.string().trim().min(1, "Cidade é obrigatória").max(100),
  state: z.string().trim().min(1, "Estado é obrigatório").max(2),
  work_mode: z.enum(["onsite", "hybrid", "remote"]),
  employment_status: z.enum(["active", "vacation", "terminated"]),
  team_id: z.string().uuid().nullable(),
  manager_user_id: z.string().uuid().nullable(),
  start_date: z.string().min(1, "Data de início é obrigatória"),
});

type JetimoberFormData = z.infer<typeof jetimoberSchema>;

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  job_title: string;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated";
  team?: { id: string; name: string } | null;
  manager?: { id: string; display_name: string } | null;
}

interface ExistingProfile {
  id: string;
  user_id: string | null;
  display_name: string;
  work_email: string;
  photo_url: string | null;
  job_title: string;
  bu_name?: string;
}

interface JetimoberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
}

const defaultFormData: JetimoberFormData = {
  first_name: "",
  last_name: "",
  work_email: "",
  job_title: "",
  city: "Porto Alegre",
  state: "RS",
  work_mode: "hybrid",
  employment_status: "active",
  team_id: null,
  manager_user_id: null,
  start_date: new Date().toISOString().split("T")[0],
};

export function JetimoberDialog({ open, onOpenChange, profile }: JetimoberDialogProps) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const isEditing = !!profile;
  
  const [formData, setFormData] = useState<JetimoberFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof JetimoberFormData, string>>>({});
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);
  const [showAddToBuDialog, setShowAddToBuDialog] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);


  const { data: managers } = useQuery({
    queryKey: ["managers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .is("deleted_at", null)
        .neq("employment_status", "terminated")
        .order("display_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Verificar se email já existe quando campo perde o foco
  const checkExistingProfile = async (email: string) => {
    if (!email || isEditing) return;
    
    setIsCheckingEmail(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select(`
          id, 
          user_id,
          display_name, 
          work_email, 
          photo_url, 
          job_title,
          bu_id,
          bu:bu_units!profiles_bu_id_fkey(name)
        `)
        .eq("work_email", email.toLowerCase().trim())
        .is("deleted_at", null)
        .maybeSingle();
      
      if (data) {
        // Verificar se já está na BU atual
        const { data: membershipExists } = await supabase
          .from("bu_user_memberships")
          .select("id")
          .eq("user_id", data.user_id)
          .eq("bu_id", currentBu?.id)
          .maybeSingle();
        
        if (membershipExists) {
          toast.error("Este Jetimober já faz parte desta BU.");
          setExistingProfile(null);
        } else {
          setExistingProfile({
            ...data,
            bu_name: (data.bu as any)?.name || undefined,
          });
        }
      } else {
        setExistingProfile(null);
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    if (profile) {
      // Load existing profile data for editing
      supabase
        .from("profiles")
        .select("*, team_id, manager_user_id, start_date")
        .eq("id", profile.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFormData({
              first_name: data.first_name,
              last_name: data.last_name,
              work_email: data.work_email,
              job_title: data.job_title,
              city: data.city,
              state: data.state,
              work_mode: data.work_mode,
              employment_status: data.employment_status,
              team_id: data.team_id,
              manager_user_id: data.manager_user_id,
              start_date: data.start_date,
            });
          }
        });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
    setExistingProfile(null);
  }, [profile]));

  const createMutation = useMutation({
    mutationFn: async (data: JetimoberFormData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");
      
      const display_name = `${data.first_name} ${data.last_name}`.trim();
      
      const { data: newProfile, error } = await supabase.from("profiles").insert({
        first_name: data.first_name,
        last_name: data.last_name,
        display_name,
        work_email: data.work_email.toLowerCase().trim(),
        job_title: data.job_title,
        city: data.city,
        state: data.state,
        work_mode: data.work_mode,
        employment_status: data.employment_status,
        team_id: data.team_id,
        manager_user_id: data.manager_user_id,
        start_date: data.start_date,
        bu_id: currentBu.id,
      }).select("id").single();
      
      if (error) throw error;
      
      // Nota: O user_id será preenchido quando a pessoa fizer login pela primeira vez
      // A membership será criada pelo trigger handle_new_user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Jetimober cadastrado com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating profile:", error);
      if (error.message?.includes("profiles_work_email_unique")) {
        toast.error("Este e-mail já está cadastrado. Verifique se deseja adicionar a esta BU.");
      } else {
        toast.error("Erro ao cadastrar. Tente novamente.");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: JetimoberFormData) => {
      if (!profile) throw new Error("Profile not found");
      
      const display_name = `${data.first_name} ${data.last_name}`.trim();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          display_name,
          work_email: data.work_email,
          job_title: data.job_title,
          city: data.city,
          state: data.state,
          work_mode: data.work_mode,
          employment_status: data.employment_status,
          team_id: data.team_id,
          manager_user_id: data.manager_user_id,
          start_date: data.start_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Jetimober atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error updating profile:", error);
      if (error.message?.includes("profiles_work_email_unique")) {
        toast.error("Este e-mail já está cadastrado.");
      } else {
        toast.error("Erro ao atualizar. Tente novamente.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = jetimoberSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof JetimoberFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof JetimoberFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    setErrors({});
    if (isEditing) {
      updateMutation.mutate(result.data);
    } else {
      createMutation.mutate(result.data);
    }
  };

  const handleChange = (field: keyof JetimoberFormData, value: string | null) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Jetimober" : "Novo Jetimober"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do colaborador"
              : "Preencha as informações para cadastrar um novo colaborador"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="Nome"
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Sobrenome *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Sobrenome"
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Email e Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work_email">E-mail corporativo *</Label>
              <Input
                id="work_email"
                type="email"
                value={formData.work_email}
                onChange={(e) => handleChange("work_email", e.target.value)}
                onBlur={(e) => checkExistingProfile(e.target.value)}
                placeholder="nome@jetimob.com"
                className={errors.work_email ? "border-destructive" : ""}
                disabled={isEditing || isCheckingEmail}
              />
              {errors.work_email && (
                <p className="text-xs text-destructive">{errors.work_email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo *</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleChange("job_title", e.target.value)}
                placeholder="Ex: Software Engineer"
                className={errors.job_title ? "border-destructive" : ""}
              />
              {errors.job_title && (
                <p className="text-xs text-destructive">{errors.job_title}</p>
              )}
            </div>
          </div>

          {/* Alerta de perfil existente */}
          {existingProfile && !isEditing && (
            <Alert className="border-accent/50 bg-accent/5">
              <UserCheck className="h-4 w-4 text-accent" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>{existingProfile.display_name}</strong> já está cadastrado
                  {existingProfile.bu_name && ` na BU ${existingProfile.bu_name}`}.
                </span>
                <Button 
                  type="button"
                  size="sm" 
                  variant="accent"
                  onClick={() => setShowAddToBuDialog(true)}
                >
                  Adicionar a esta BU
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Time e Gestor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time</Label>
              <TeamSelect
                value={formData.team_id || undefined}
                onValueChange={(v) => handleChange("team_id", v || null)}
                includeNone
                noneLabel="Nenhum"
                placeholder="Selecione"
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Gestor</Label>
              <SimpleSelect
                value={formData.manager_user_id || "none"}
                onValueChange={(v) => handleChange("manager_user_id", v === "none" ? null : v)}
                options={[
                  { value: "none", label: "Nenhum" },
                  ...(managers?.map((m) => ({ value: m.id, label: m.display_name })) || []),
                ]}
                placeholder="Selecione"
                triggerClassName="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Localização */}
          <div className="space-y-2">
            <Label>Localização *</Label>
            <CityAutocomplete
              value={formData.city}
              state={formData.state}
              onChange={(city, state) => {
                setFormData({ ...formData, city, state });
                if (errors.city) setErrors({ ...errors, city: undefined });
              }}
              placeholder="Digite a cidade"
            />
            {(errors.city || errors.state) && (
              <p className="text-xs text-destructive">{errors.city || errors.state}</p>
            )}
          </div>

          {/* Modalidade e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modalidade *</Label>
              <SimpleSelect
                value={formData.work_mode}
                onValueChange={(v) => handleChange("work_mode", v)}
                options={[
                  { value: "onsite", label: "Presencial" },
                  { value: "hybrid", label: "Híbrido" },
                  { value: "remote", label: "Remoto" },
                ]}
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <SimpleSelect
                value={formData.employment_status}
                onValueChange={(v) => handleChange("employment_status", v)}
                options={[
                  { value: "active", label: "Ativo" },
                  { value: "vacation", label: "Férias" },
                  { value: "terminated", label: "Desligado" },
                ]}
                triggerClassName="w-full"
              />
            </div>
          </div>

          {/* Data de Início */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Data de início na Jet *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className={errors.start_date ? "border-destructive" : ""}
            />
            {errors.start_date && (
              <p className="text-xs text-destructive">{errors.start_date}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AddToBuDialog
        open={showAddToBuDialog}
        onOpenChange={(open) => {
          setShowAddToBuDialog(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
        existingProfile={existingProfile}
      />
    </Dialog>
  );
}
