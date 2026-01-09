import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight, UserPlus, ArrowLeft } from "lucide-react";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { TeamSelect, SimpleSelect } from "@/components/selects";
import { JobTitleSelect } from "@/modules/settings/components/JobTitleSelect";

const emailSchema = z.object({
  work_email: z.string().trim().email("E-mail inválido"),
});

const jetimoberSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  work_email: z.string().trim().email("E-mail inválido"),
  job_title_id: z.string().uuid("Cargo é obrigatório").nullable(),
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
  job_title_name?: string;  // Wave 3: nome do cargo via join
  job_title_id: string | null;
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
  job_title_name: string;  // Wave 3: nome via join
  bu_name?: string;
}

interface JetimoberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
}

type Step = "email" | "form" | "existing";

const defaultFormData: JetimoberFormData = {
  first_name: "",
  last_name: "",
  work_email: "",
  job_title_id: null,
  city: "Porto Alegre",
  state: "RS",
  work_mode: "hybrid",
  employment_status: "active",
  team_id: null,
  manager_user_id: null,
  start_date: new Date().toISOString().split("T")[0],
};

const ROLE_OPTIONS = [
  { value: "collaborator", label: "Colaborador" },
  { value: "admin", label: "Administrador" },
];

export function JetimoberDialog({ open, onOpenChange, profile }: JetimoberDialogProps) {
  const queryClient = useQueryClient();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const isEditing = !!profile;
  
  const [step, setStep] = useState<Step>("email");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  const [formData, setFormData] = useState<JetimoberFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof JetimoberFormData, string>>>({});
  
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);
  const [roleInBu, setRoleInBu] = useState<string>("collaborator");
  const [teamIdForExisting, setTeamIdForExisting] = useState<string | undefined>(undefined);

  // Use canonical view for managers select
  const { data: managers } = useQuery({
    queryKey: ["managers-select", currentBu?.id],
    queryFn: async () => {
      if (!currentBu?.id) return [];
      const { data, error } = await supabase
        .from("v_bu_active_profiles")
        .select("id, display_name")
        .eq("bu_id", currentBu.id)
        .order("display_name");
      if (error) throw error;
      return data;
    },
    enabled: open && !!currentBu?.id,
  });

  // Reset form quando dialog abre
  useDialogFormReset(open, useCallback(() => {
    if (profile) {
      // Modo edição: vai direto pro form
      setStep("form");
      supabase
        .from("profiles")
        .select("*, team_id, manager_user_id, start_date, job_title_id")
        .eq("id", profile.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFormData({
              first_name: data.first_name,
              last_name: data.last_name,
              work_email: data.work_email,
              job_title_id: data.job_title_id,
              city: data.city,
              state: data.state,
              work_mode: data.work_mode,
              employment_status: data.employment_status,
              team_id: data.team_id,
              manager_user_id: data.manager_user_id,
              start_date: data.start_date,
            });
            setEmailInput(data.work_email);
          }
        });
    } else {
      // Modo criação: começa pelo email
      setStep("email");
      setEmailInput("");
      setFormData(defaultFormData);
    }
    setErrors({});
    setEmailError(null);
    setExistingProfile(null);
    setRoleInBu("collaborator");
    setTeamIdForExisting(undefined);
  }, [profile]));

  // Verificar email e decidir próximo passo
  const handleCheckEmail = async () => {
    const result = emailSchema.safeParse({ work_email: emailInput });
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }
    
    setEmailError(null);
    setIsCheckingEmail(true);
    
    try {
      const normalizedEmail = emailInput.toLowerCase().trim();
      const emailDomain = normalizedEmail.split("@")[1];
      
      // Verificar se o domínio está autorizado na BU atual
      if (currentBu?.id) {
        const { data: buData } = await supabase
          .from("bu_units")
          .select("allowed_email_domains")
          .eq("id", currentBu.id)
          .single();
        
        const allowedDomains = buData?.allowed_email_domains || [];
        if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
          setEmailError(`Domínio "${emailDomain}" não autorizado para esta BU. Domínios permitidos: ${allowedDomains.join(", ")}`);
          setIsCheckingEmail(false);
          return;
        }
      }
      
      const { data } = await supabase
        .from("profiles")
        .select(`
          id, 
          user_id,
          display_name, 
          work_email, 
          photo_url, 
          job_title_id,
          job_title_rel:job_titles!job_title_id(name),
          bu_id,
          bu:bu_units!profiles_bu_id_fkey(name)
        `)
        .eq("work_email", normalizedEmail)
        .is("deleted_at", null)
        .maybeSingle();
      
      if (data) {
        // Verificar se já está na BU atual
        if (data.user_id) {
          const { data: membershipExists } = await supabase
            .from("bu_user_memberships")
            .select("id")
            .eq("user_id", data.user_id)
            .eq("bu_id", currentBu?.id)
            .maybeSingle();
          
          if (membershipExists) {
            toast.error("Este Jetimober já faz parte desta BU.");
            return;
          }
        }
        
        // Perfil existe, mostrar opção de adicionar à BU
        setExistingProfile({
          id: data.id,
          user_id: data.user_id,
          display_name: data.display_name,
          work_email: data.work_email,
          photo_url: data.photo_url,
          job_title_name: (data.job_title_rel as { name: string } | null)?.name || "Sem cargo",
          bu_name: (data.bu as { name: string } | null)?.name || undefined,
        });
        setStep("existing");
      } else {
        // Email não existe, prosseguir com cadastro
        setFormData({ ...defaultFormData, work_email: normalizedEmail });
        setStep("form");
      }
    } catch (error) {
      console.error("Error checking email:", error);
      toast.error("Erro ao verificar e-mail. Tente novamente.");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Adicionar perfil existente à BU
  const addToBuMutation = useMutation({
    mutationFn: async () => {
      if (!currentBu?.id) {
        throw new Error("Nenhuma BU selecionada");
      }
      
      if (!existingProfile?.user_id) {
        throw new Error("Este Jetimober ainda não possui um usuário vinculado. Ele precisa fazer login pelo menos uma vez.");
      }
      
      const { error: membershipError } = await supabase
        .from("bu_user_memberships")
        .insert({
          user_id: existingProfile.user_id,
          bu_id: currentBu.id,
          role_in_bu: roleInBu as "super_admin" | "admin" | "collaborator",
          is_default: false,
        });
      
      if (membershipError) throw membershipError;

      if (teamIdForExisting) {
        const { error: teamError } = await supabase
          .from("user_team_memberships")
          .insert({
            user_id: existingProfile.id,
            team_id: teamIdForExisting,
            is_primary: true,
          });
        
        if (teamError && !teamError.message?.includes("duplicate")) {
          console.warn("Erro ao vincular ao time:", teamError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all(currentBu?.id ?? null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.buMembers(currentBu?.id ?? null) });
      toast.success(`${existingProfile?.display_name} adicionado à ${currentBu?.name}!`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error adding to BU:", error);
      if (error.message?.includes("bu_user_memberships_bu_user_unique")) {
        toast.error("Este Jetimober já faz parte desta BU.");
      } else if (error.message?.includes("não possui um usuário vinculado")) {
        toast.error(error.message);
      } else {
        toast.error("Erro ao adicionar à BU. Tente novamente.");
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: JetimoberFormData) => {
      if (!currentBu?.id) throw new Error("BU não selecionada");
      
      const display_name = `${data.first_name} ${data.last_name}`.trim();
      
      const { error } = await supabase.from("profiles").insert([{
        first_name: data.first_name,
        last_name: data.last_name,
        display_name,
        work_email: data.work_email.toLowerCase().trim(),
        job_title: "", // Deprecated: usando job_title_id
        job_title_id: data.job_title_id,
        city: data.city,
        state: data.state,
        work_mode: data.work_mode,
        employment_status: data.employment_status,
        team_id: data.team_id,
        manager_user_id: data.manager_user_id,
        start_date: data.start_date,
        bu_id: currentBu.id,
      }]);
      
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
          job_title_id: data.job_title_id,
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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const isPending = createMutation.isPending || updateMutation.isPending || addToBuMutation.isPending;

  // ===== STEP: EMAIL =====
  const renderEmailStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Qual o e-mail corporativo?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Vamos verificar se já existe cadastro no Hub
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <Input
          type="email"
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            setEmailError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCheckEmail();
            }
          }}
          placeholder="nome@empresa.com"
          className={emailError ? "border-destructive" : ""}
          autoFocus
        />
        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleCheckEmail} 
          disabled={isCheckingEmail || !emailInput}
        >
          {isCheckingEmail ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Continuar
        </Button>
      </DialogFooter>
    </div>
  );

  // ===== STEP: EXISTING PROFILE =====
  const renderExistingStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-accent/10 p-4">
          <UserPlus className="h-8 w-8 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Jetimober já cadastrado!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Deseja adicioná-lo à <strong>{currentBu?.name}</strong>?
          </p>
        </div>
      </div>

      {existingProfile && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
          <Avatar className="h-12 w-12">
            <AvatarImage src={existingProfile.photo_url || undefined} />
            <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
              {getInitials(existingProfile.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-foreground">{existingProfile.display_name}</p>
            <p className="text-sm text-muted-foreground">{existingProfile.work_email}</p>
            <p className="text-xs text-muted-foreground">{existingProfile.job_title_name}</p>
          </div>
          {existingProfile.bu_name && (
            <Badge variant="secondary" className="text-xs">
              {existingProfile.bu_name}
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Papel nesta BU *</Label>
          <SimpleSelect
            value={roleInBu}
            onValueChange={setRoleInBu}
            options={ROLE_OPTIONS}
            triggerClassName="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Time nesta BU</Label>
          <TeamSelect
            value={teamIdForExisting}
            onValueChange={setTeamIdForExisting}
            includeNone
            noneLabel="Nenhum"
            placeholder="Selecione um time"
            triggerClassName="w-full"
          />
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setStep("email");
            setExistingProfile(null);
          }}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button 
          type="button" 
          onClick={() => addToBuMutation.mutate()} 
          disabled={addToBuMutation.isPending}
          className="w-full sm:w-auto"
        >
          {addToBuMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Adicionar à BU
        </Button>
      </DialogFooter>
    </div>
  );

  // ===== STEP: FORM =====
  const renderFormStep = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email confirmado (readonly se novo) */}
      {!isEditing && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">E-mail:</span>
          <span className="font-medium">{formData.work_email}</span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => setStep("email")}
          >
            Alterar
          </Button>
        </div>
      )}

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

      {/* Email (só em edição) e Cargo */}
      <div className="grid grid-cols-2 gap-4">
        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="work_email">E-mail corporativo *</Label>
            <Input
              id="work_email"
              type="email"
              value={formData.work_email}
              onChange={(e) => handleChange("work_email", e.target.value)}
              placeholder="nome@empresa.com"
              className={errors.work_email ? "border-destructive" : ""}
            />
            {errors.work_email && (
              <p className="text-xs text-destructive">{errors.work_email}</p>
            )}
          </div>
        )}
        <div className={`space-y-2 ${!isEditing ? "col-span-2" : ""}`}>
          <Label>Cargo *</Label>
          <JobTitleSelect
            value={formData.job_title_id || undefined}
            onValueChange={(v) => handleChange("job_title_id", v || null)}
            placeholder="Selecione o cargo"
            className={errors.job_title_id ? "border-destructive" : ""}
          />
          {errors.job_title_id && (
            <p className="text-xs text-destructive">{errors.job_title_id}</p>
          )}
        </div>
      </div>

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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Jetimober" : step === "existing" ? "Adicionar à BU" : "Novo Jetimober"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do colaborador"
              : step === "email"
              ? "Informe o e-mail para verificar se já existe cadastro"
              : step === "existing"
              ? "Adicione este colaborador à sua Business Unit"
              : "Preencha as informações do novo colaborador"}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && !isEditing && renderEmailStep()}
        {step === "existing" && renderExistingStep()}
        {step === "form" && renderFormStep()}
      </DialogContent>
    </Dialog>
  );
}
