import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { cn } from "@/lib/utils";
import { User, MapPin, ChevronRight, ChevronLeft, Loader2, Check, Sparkles, Phone, Camera } from "lucide-react";

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
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonth[month - 1] || 31;
};

const formatWhatsApp = (value: string) => {
  let digits = value.replace(/\D/g, "");

  // Allow users to paste/type without DDI (DDD + number)
  // If we have 10/11 digits, assume Brazil (+55)
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;

  // Brazilian landline with DDI: 55 + DDD (2) + number (8)
  if (digits.length <= 12) {
    const areaCode = digits.slice(2, 4);
    const firstPart = digits.slice(4, 8);
    const secondPart = digits.slice(8, 12);
    return `+${digits.slice(0, 2)} (${areaCode}) ${firstPart}${secondPart ? "-" + secondPart : ""}`;
  }

  // Brazilian mobile with DDI: 55 + DDD (2) + number (9)
  const areaCode = digits.slice(2, 4);
  const firstPart = digits.slice(4, 9);
  const secondPart = digits.slice(9, 13);
  return `+${digits.slice(0, 2)} (${areaCode}) ${firstPart}${secondPart ? "-" + secondPart : ""}`;
};

const onboardingSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  last_name: z.string().trim().min(1, "Sobrenome é obrigatório").max(100),
  photo_url: z.string().optional(),
  birth_day: z.number().min(1, "Dia é obrigatório").max(31),
  birth_month: z.number().min(1, "Mês é obrigatório").max(12),
  whatsapp_personal: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
    }, "WhatsApp inválido"),
  discord_id: z.string().trim().optional(),
  instagram_id: z.string().trim().optional(),
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
  { id: "contact", title: "Contato & Redes", icon: Phone },
  { id: "location", title: "Localização", icon: MapPin },
];

export function OnboardingWizard({ profileId, initialData, onComplete }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    photo_url: initialData?.photo_url || "",
    birth_day: initialData?.birth_day || 0,
    birth_month: initialData?.birth_month || 0,
    whatsapp_personal: initialData?.whatsapp_personal || "",
    discord_id: initialData?.discord_id || "",
    instagram_id: initialData?.instagram_id || "",
    city: initialData?.city || "Porto Alegre",
    state: initialData?.state || "RS",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingFormData, string>>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profileId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      setFormData({ ...formData, photo_url: publicUrl });
      toast.success("Foto carregada!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const displayName = `${data.first_name} ${data.last_name}`.trim();

      // Build update object, only including fields that have values
      // This preserves existing data for optional fields not filled in onboarding
      const updateData: Record<string, unknown> = {
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
      };

      // Only update optional fields if they have new values
      if (data.photo_url) updateData.photo_url = data.photo_url;
      if (data.discord_id) updateData.discord_id = data.discord_id;
      if (data.instagram_id) updateData.instagram_id = data.instagram_id;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
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
      case 0: // Personal + Photo
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
        break;
      case 1: // Contact & Social
        {
          const digits = (formData.whatsapp_personal || "").replace(/\D/g, "");
          const isValid = digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
          if (!isValid) newErrors.whatsapp_personal = "WhatsApp inválido";
        }
        break;
      case 2: // Location
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

      // Levar o usuário até o primeiro passo com erro (ex.: WhatsApp no passo 2)
      const stepByField: Partial<Record<keyof OnboardingFormData, number>> = {
        first_name: 0,
        last_name: 0,
        photo_url: 0,
        birth_day: 0,
        birth_month: 0,
        whatsapp_personal: 1,
        discord_id: 1,
        instagram_id: 1,
        city: 2,
        state: 2,
      };

      const stepsWithError = Object.keys(fieldErrors)
        .map((k) => stepByField[k as keyof OnboardingFormData])
        .filter((v): v is number => typeof v === "number");

      if (stepsWithError.length > 0) {
        setCurrentStep(Math.min(...stepsWithError));
      }

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

  const getInitials = () => {
    const first = formData.first_name?.[0] || "";
    const last = formData.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
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
          <CardTitle className="text-2xl">
            {initialData?.first_name 
              ? `Olá, ${initialData.first_name}! 👋` 
              : "Bem-vindo ao Hub!"}
          </CardTitle>
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
              className="space-y-4 min-h-[320px]"
            >
              {currentStep === 0 && (
                <>
                  {/* Photo Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 border-2 border-primary/20">
                        <AvatarImage src={formData.photo_url} alt="Foto" />
                        <AvatarFallback className="text-xl bg-primary/10">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                          <Camera className="w-6 h-6 text-primary" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">Clique para adicionar foto</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Nome *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        placeholder="Seu nome"
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
                </>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp_personal}
                        onChange={(e) => handleWhatsAppChange(e.target.value)}
                      placeholder="+55 (51) 99999-9999"
                      className={cn("pl-10", errors.whatsapp_personal ? "border-destructive" : "")}
                      maxLength={19}
                        autoFocus
                      />
                    </div>
                    {errors.whatsapp_personal && (
                      <p className="text-xs text-destructive">{errors.whatsapp_personal}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord_id">Discord</Label>
                    <Input
                      id="discord_id"
                      value={formData.discord_id || ""}
                      onChange={(e) => handleChange("discord_id", e.target.value)}
                      placeholder="usuario#1234 ou username"
                    />
                    <p className="text-xs text-muted-foreground">Seu nome de usuário do Discord</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram_id">Instagram</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="instagram_id"
                        value={formData.instagram_id || ""}
                        onChange={(e) => handleChange("instagram_id", e.target.value.replace("@", ""))}
                        placeholder="seu.usuario"
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Localização *</Label>
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
              disabled={completeMutation.isPending || isUploading}
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
