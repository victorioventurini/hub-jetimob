import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings as SettingsIcon, 
  Palette, 
  Shield, 
  Bell, 
  Moon, 
  Sun, 
  Monitor,
  Lock,
  Key,
  Mail,
  Smartphone,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Theme = "light" | "dark" | "system";

interface UserPreferences {
  theme: Theme;
  email_notifications: boolean;
  slack_notifications: boolean;
  weekly_digest: boolean;
  two_factor_enabled: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  email_notifications: true,
  slack_notifications: false,
  weekly_digest: true,
  two_factor_enabled: false,
};

export default function Settings() {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar preferências do usuário
  useEffect(() => {
    async function loadPreferences() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            theme: data.theme as Theme,
            email_notifications: data.email_notifications,
            slack_notifications: data.slack_notifications,
            weekly_digest: data.weekly_digest,
            two_factor_enabled: data.two_factor_enabled,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar preferências:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [user?.id]);

  const savePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const newPreferences = { ...preferences, ...updates };
      
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success("Preferências salvas!");
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Configurações do Hub
            </h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie as configurações globais do Hub Jet
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do Hub
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Theme Selection */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Tema</Label>
                      <RadioGroup
                        value={preferences.theme}
                        onValueChange={(value) => savePreferences({ theme: value as Theme })}
                        className="grid grid-cols-3 gap-4"
                        disabled={isSaving}
                      >
                        <Label
                          htmlFor="light"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value="light" id="light" className="sr-only" />
                          <Sun className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Claro</span>
                        </Label>
                        <Label
                          htmlFor="dark"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value="dark" id="dark" className="sr-only" />
                          <Moon className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Escuro</span>
                        </Label>
                        <Label
                          htmlFor="system"
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-primary"
                        >
                          <RadioGroupItem value="system" id="system" className="sr-only" />
                          <Monitor className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Sistema</span>
                        </Label>
                      </RadioGroup>
                    </div>

                    <Separator />

                    {/* Additional appearance settings placeholder */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Densidade</Label>
                      <p className="text-sm text-muted-foreground">
                        Ajuste a densidade visual da interface (em breve)
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como e quando você recebe notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-4 w-60" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-11" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Notificações por e-mail</Label>
                          <p className="text-sm text-muted-foreground">
                            Receba atualizações importantes por e-mail
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.email_notifications}
                        onCheckedChange={(checked) => savePreferences({ email_notifications: checked })}
                        disabled={isSaving}
                      />
                    </div>

                    <Separator />

                    {/* Slack Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Notificações no Slack</Label>
                          <p className="text-sm text-muted-foreground">
                            Receba notificações diretamente no Slack
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.slack_notifications}
                        onCheckedChange={(checked) => savePreferences({ slack_notifications: checked })}
                        disabled={isSaving}
                      />
                    </div>

                    <Separator />

                    {/* Weekly Digest */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Bell className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Resumo semanal</Label>
                          <p className="text-sm text-muted-foreground">
                            Receba um resumo semanal das atividades do Hub
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.weekly_digest}
                        onCheckedChange={(checked) => savePreferences({ weekly_digest: checked })}
                        disabled={isSaving}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Gerencie as configurações de segurança do Hub
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-4 w-60" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-11" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Two-Factor Authentication */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Autenticação em dois fatores</Label>
                          <p className="text-sm text-muted-foreground">
                            Adicione uma camada extra de segurança à sua conta
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.two_factor_enabled}
                        onCheckedChange={(checked) => savePreferences({ two_factor_enabled: checked })}
                        disabled={isSaving}
                      />
                    </div>

                    <Separator />

                    {/* Session Management */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Key className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Sessões ativas</Label>
                          <p className="text-sm text-muted-foreground">
                            Gerencie os dispositivos conectados à sua conta
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="ml-14">
                        Ver sessões ativas
                      </Button>
                    </div>

                    <Separator />

                    {/* Password Policy */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-base font-medium">Política de senhas</Label>
                          <p className="text-sm text-muted-foreground">
                            Configure requisitos mínimos de segurança para senhas
                          </p>
                        </div>
                      </div>
                      <div className="ml-14 text-sm text-muted-foreground">
                        <p>• Mínimo de 8 caracteres</p>
                        <p>• Pelo menos uma letra maiúscula</p>
                        <p>• Pelo menos um número</p>
                        <p>• Pelo menos um caractere especial</p>
                      </div>
                    </div>
                  </>
                )}

                {isSaving && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
