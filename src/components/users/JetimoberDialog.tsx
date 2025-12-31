import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CityAutocomplete } from "@/components/CityAutocomplete";

const jetimoberSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  work_email: z.string().trim().email("E-mail inválido").endsWith("@jetimob.com", "Apenas e-mails @jetimob.com"),
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
  const isEditing = !!profile;
  
  const [formData, setFormData] = useState<JetimoberFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof JetimoberFormData, string>>>({});

  const { data: teams } = useQuery({
    queryKey: ["teams-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

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

  useEffect(() => {
    if (open) {
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
    }
  }, [open, profile]);

  const createMutation = useMutation({
    mutationFn: async (data: JetimoberFormData) => {
      const display_name = `${data.first_name} ${data.last_name}`.trim();
      
      const { error } = await supabase.from("profiles").insert({
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
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Jetimober cadastrado com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating profile:", error);
      if (error.message?.includes("profiles_work_email_unique")) {
        toast.error("Este e-mail já está cadastrado.");
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
                placeholder="nome@jetimob.com"
                className={errors.work_email ? "border-destructive" : ""}
                disabled={isEditing}
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

          <Separator />

          {/* Time e Gestor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time</Label>
              <Select
                value={formData.team_id || "none"}
                onValueChange={(v) => handleChange("team_id", v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gestor</Label>
              <Select
                value={formData.manager_user_id || "none"}
                onValueChange={(v) => handleChange("manager_user_id", v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {managers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={formData.work_mode}
                onValueChange={(v) => handleChange("work_mode", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">Presencial</SelectItem>
                  <SelectItem value="hybrid">Híbrido</SelectItem>
                  <SelectItem value="remote">Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={formData.employment_status}
                onValueChange={(v) => handleChange("employment_status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                  <SelectItem value="terminated">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de Início */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Data de início *</Label>
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
    </Dialog>
  );
}
