import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { cn } from "@/lib/utils";
import { User, MapPin, ChevronRight, ChevronLeft, Loader2, Check, Sparkles, Phone } from "lucide-react";


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

const onboardingSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  birth_day: z.number().min(1, "Dia é obrigatório").max(31),
  birth_month: z.number().min(1, "Mês é obrigatório").max(12),
  whatsapp_personal: z.string().trim().min(14, "WhatsApp inválido").max(15),
  city: z.string().trim().min(1, "Cidade é obrigatória").max(100),
  state: z.string().trim().min(1, "Estado é obrigatório").max(2),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingWizardProps {
  profileId: string;
  initialData?: Partial<OnboardingFormData>;
  onComplete: () => void;
}

const STEPS = [
  { id: "personal", title: "Dados Pessoais", icon: User },
  { id: "location", title: "Localização", icon: MapPin },
];

export function OnboardingWizard({ profileId, initialData, onComplete }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    birth_day: initialData?.birth_day || 0,
    birth_month: initialData?.birth_month || 0,
    whatsapp_personal: initialData?.whatsapp_personal || "",
    city: initialData?.city || "Porto Alegre",
    state: initialData?.state || "RS",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingFormData, string>>>({});


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
          city: data.city,
          state: data.state,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (profileError) throw profileError;
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
      case 1: // Location
        if (!formData.city.trim()) newErrors.city = "Cidade é obrigatória";
        if (!formData.state.trim()) newErrors.state = "Estado é obrigatório";
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
    const result = onboardingSchema.safeParse(formData);
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
              <Sparkles className="h-8 w-8 text-primary-foreground" />
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
                        value={formData.birth_day ? String(formData.birth_day) : ""}
                        onValueChange={(v) => handleChange("birth_day", parseInt(v))}
                      >
                        <SelectTrigger className={errors.birth_day ? "border-destructive" : ""}>
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={formData.birth_month ? String(formData.birth_month) : ""}
                        onValueChange={(v) => {
                          const newMonth = parseInt(v);
                          handleChange("birth_month", newMonth);
                          // Ajusta o dia se exceder o máximo do novo mês
                          const maxDays = getDaysInMonth(newMonth);
                          if (formData.birth_day > maxDays) {
                            handleChange("birth_day", maxDays);
                          }
                        }}
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
