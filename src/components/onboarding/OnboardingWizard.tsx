import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { cn } from "@/lib/utils";
import { User, Briefcase, MapPin, Building2, ChevronRight, ChevronLeft, Loader2, Check, Sparkles, CalendarIcon, Phone } from "lucide-react";
import logoJetimob from "@/assets/logo-jetimob-branco.svg";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const getDaysInMonth = (month: number) => {
  // Use a non-leap year to get standard days per month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonth[month - 1] || 31;
};

const formatWhatsApp = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const baseOnboardingSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  birth_day: z.number().min(1, "Dia é obrigatório").max(31),
  birth_month: z.number().min(1, "Mês é obrigatório").max(12),
  whatsapp_personal: z.string().trim().min(14, "WhatsApp inválido").max(15),
  job_title: z.string().trim().min(1, "Cargo é obrigatório").max(100),
  start_date: z.date({ required_error: "Data de início é obrigatória" }),
  city: z.string().trim().min(1, "Cidade é obrigatória").max(100),
  state: z.string().trim().min(1, "Estado é obrigatório").max(2),
  work_mode: z.enum(["onsite", "hybrid", "remote"]),
  team_id: z.string().optional().or(z.literal("")),
});

const onboardingSchemaWithTeam = baseOnboardingSchema.extend({
  team_id: z.string().uuid("Selecione um time"),
});

type OnboardingFormData = z.infer<typeof baseOnboardingSchema>;

interface OnboardingWizardProps {
  profileId: string;
  userId: string;
  initialData?: Partial<OnboardingFormData>;
  onComplete: () => void;
}

const STEPS = [
  { id: "personal", title: "Dados Pessoais", icon: User },
  { id: "professional", title: "Profissional", icon: Briefcase },
  { id: "location", title: "Localização", icon: MapPin },
  { id: "team", title: "Time", icon: Building2 },
];

export function OnboardingWizard({ profileId, userId, initialData, onComplete }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    birth_day: initialData?.birth_day || 0,
    birth_month: initialData?.birth_month || 0,
    whatsapp_personal: initialData?.whatsapp_personal || "",
    job_title: initialData?.job_title || "",
    start_date: initialData?.start_date || new Date(),
    city: initialData?.city || "Porto Alegre",
    state: initialData?.state || "RS",
    work_mode: initialData?.work_mode || "hybrid",
    team_id: initialData?.team_id || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingFormData, string>>>({});

  const { data: teams } = useQuery({
    queryKey: ["onboarding-teams"],
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
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.role;
    },
  });

  const isCeo = userRole === "ceo";

  const completeMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const displayName = `${data.first_name} ${data.last_name}`.trim();

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          display_name: displayName,
          birth_day: data.birth_day,
          birth_month: data.birth_month,
          whatsapp_personal: data.whatsapp_personal,
          job_title: data.job_title,
          start_date: format(data.start_date, "yyyy-MM-dd"),
          city: data.city,
          state: data.state,
          work_mode: data.work_mode,
          team_id: data.team_id || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (profileError) throw profileError;

      // Create team membership only if team was selected
      if (data.team_id) {
        const { error: membershipError } = await supabase
          .from("user_team_memberships")
          .upsert({
            user_id: profileId,
            team_id: data.team_id,
            is_primary: true,
          }, {
            onConflict: "user_id,team_id",
          });

        if (membershipError) throw membershipError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Bem-vindo ao Hub Jetimob! 🚀");
      onComplete();
    },
    onError: (error) => {
      console.error("Onboarding error:", error);
      toast.error("Erro ao completar onboarding. Tente novamente.");
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingFormData, string>> = {};

    switch (step) {
      case 0: // Personal
        if (!formData.first_name.trim()) newErrors.first_name = "Nome é obrigatório";
        if (!formData.last_name.trim()) newErrors.last_name = "Sobrenome é obrigatório";
        if (!formData.birth_month) newErrors.birth_month = "Mês é obrigatório";
        if (!formData.birth_day) newErrors.birth_day = "Dia é obrigatório";
        if (formData.birth_month && formData.birth_day) {
          const maxDays = getDaysInMonth(formData.birth_month);
          if (formData.birth_day > maxDays) {
            newErrors.birth_day = `Dia inválido para ${MONTHS[formData.birth_month - 1]?.label}`;
          }
        }
        if (!formData.whatsapp_personal || formData.whatsapp_personal.replace(/\D/g, "").length < 11) {
          newErrors.whatsapp_personal = "WhatsApp inválido";
        }
        break;
      case 1: // Professional
        if (!formData.job_title.trim()) newErrors.job_title = "Cargo é obrigatório";
        if (!formData.start_date) newErrors.start_date = "Data de início é obrigatória";
        break;
      case 2: // Location
        if (!formData.city.trim()) newErrors.city = "Cidade é obrigatória";
        if (!formData.state.trim()) newErrors.state = "Estado é obrigatório";
        break;
      case 3: // Team - required unless CEO
        if (!isCeo && !formData.team_id) newErrors.team_id = "Selecione um time";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    const schema = isCeo ? baseOnboardingSchema : onboardingSchemaWithTeam;
    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof OnboardingFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof OnboardingFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast.error("Por favor, corrija os erros.");
      return;
    }

    completeMutation.mutate(result.data as OnboardingFormData);
  };

  const handleChange = (field: keyof OnboardingFormData, value: string | number | Date) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleWhatsAppChange = (value: string) => {
    const formatted = formatWhatsApp(value);
    handleChange("whatsapp_personal", formatted);
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <Card className="w-full max-w-lg relative z-10 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-primary">
              <img src={logoJetimob} alt="Jetimob" className="h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Hub!</CardTitle>
          <CardDescription>
            Complete seu perfil para começar
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Passo {currentStep + 1} de {STEPS.length}</span>
              <span>{STEPS[currentStep].title}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                    ${isActive ? "bg-primary text-primary-foreground scale-110" : ""}
                    ${isCompleted ? "bg-success text-success-foreground" : ""}
                    ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
              );
            })}
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 min-h-[280px]"
            >
              {currentStep === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Nome *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        placeholder="Seu nome"
                        className={errors.first_name ? "border-destructive" : ""}
                        autoFocus
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
                        placeholder="Seu sobrenome"
                        className={errors.last_name ? "border-destructive" : ""}
                      />
                      {errors.last_name && (
                        <p className="text-xs text-destructive">{errors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Aniversário *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        value={formData.birth_month ? String(formData.birth_month) : ""}
                        onValueChange={(v) => handleChange("birth_month", parseInt(v))}
                      >
                        <SelectTrigger className={errors.birth_month ? "border-destructive" : ""}>
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={String(month.value)}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={formData.birth_day ? String(formData.birth_day) : ""}
                        onValueChange={(v) => handleChange("birth_day", parseInt(v))}
                        disabled={!formData.birth_month}
                      >
                        <SelectTrigger className={errors.birth_day ? "border-destructive" : ""}>
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: getDaysInMonth(formData.birth_month || 1) }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(errors.birth_month || errors.birth_day) && (
                      <p className="text-xs text-destructive">{errors.birth_month || errors.birth_day}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp_personal}
                        onChange={(e) => handleWhatsAppChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className={cn("pl-10", errors.whatsapp_personal ? "border-destructive" : "")}
                        maxLength={15}
                      />
                    </div>
                    {errors.whatsapp_personal && (
                      <p className="text-xs text-destructive">{errors.whatsapp_personal}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Cargo *</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => handleChange("job_title", e.target.value)}
                      placeholder="Ex: Software Engineer"
                      className={errors.job_title ? "border-destructive" : ""}
                      autoFocus
                    />
                    {errors.job_title && (
                      <p className="text-xs text-destructive">{errors.job_title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade de Trabalho *</Label>
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
                    <Label>Data de Início na Jet *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.start_date && "text-muted-foreground",
                            errors.start_date && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? (
                            format(formData.start_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => date && handleChange("start_date", date)}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.start_date && (
                      <p className="text-xs text-destructive">{errors.start_date}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cidade e Estado *</Label>
                    <CityAutocomplete
                      value={formData.city}
                      state={formData.state}
                      onChange={(city, state) => {
                        setFormData({ ...formData, city, state });
                        if (errors.city) setErrors({ ...errors, city: undefined });
                      }}
                      placeholder="Digite sua cidade"
                    />
                    {(errors.city || errors.state) && (
                      <p className="text-xs text-destructive">{errors.city || errors.state}</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Time Principal {isCeo ? <span className="text-muted-foreground text-xs">(opcional)</span> : "*"}
                    </Label>
                    <Select
                      value={formData.team_id}
                      onValueChange={(v) => handleChange("team_id", v)}
                    >
                      <SelectTrigger className={errors.team_id ? "border-destructive" : ""}>
                        <SelectValue placeholder={isCeo ? "Selecione seu time (opcional)" : "Selecione seu time"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.team_id && (
                      <p className="text-xs text-destructive">{errors.team_id}</p>
                    )}
                    {isCeo && (
                      <p className="text-xs text-muted-foreground">
                        Como CEO, você pode deixar este campo em branco
                      </p>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex gap-3">
                      <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Quase lá!</p>
                        <p className="text-xs text-muted-foreground">
                          Após completar, você terá acesso completo ao Hub Jetimob
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || completeMutation.isPending}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              onClick={handleNext}
              disabled={completeMutation.isPending}
              className="gap-2"
            >
              {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentStep === STEPS.length - 1 ? "Finalizar" : "Próximo"}
              {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
