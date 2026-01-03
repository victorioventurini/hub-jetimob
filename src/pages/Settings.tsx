import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
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
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Settings() {
  const { isAdmin, isLoading } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSaveAppearance = () => {
    toast.success("Preferências de aparência salvas!");
  };

  const handleSaveNotifications = () => {
    toast.success("Preferências de notificações salvas!");
  };

  const handleSaveSecurity = () => {
    toast.success("Configurações de segurança salvas!");
  };

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
                  Personalize a aparência do Hub para todos os usuários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Tema</Label>
                  <RadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(value as typeof theme)}
                    className="grid grid-cols-3 gap-4"
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

                <div className="flex justify-end">
                  <Button onClick={handleSaveAppearance}>
                    Salvar preferências
                  </Button>
                </div>
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
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
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
                    checked={slackNotifications}
                    onCheckedChange={setSlackNotifications}
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
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>
                    Salvar preferências
                  </Button>
                </div>
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
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
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

                <div className="flex justify-end">
                  <Button onClick={handleSaveSecurity}>
                    Salvar configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
