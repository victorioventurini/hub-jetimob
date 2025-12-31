import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Phone, MapPin, Building2, Calendar, Loader2, Save, Camera } from 'lucide-react';

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  last_name: z.string().trim().min(1, 'Sobrenome é obrigatório').max(100),
  display_name: z.string().trim().min(1, 'Nome de exibição é obrigatório').max(150),
  work_phone: z.string().max(20).nullable().optional(),
  whatsapp_personal: z.string().max(20).nullable().optional(),
  city: z.string().trim().min(1, 'Cidade é obrigatória').max(100),
  state: z.string().trim().min(1, 'Estado é obrigatório').max(2),
  birth_day: z.number().min(1).max(31).nullable().optional(),
  birth_month: z.number().min(1).max(12).nullable().optional(),
  slack_id: z.string().max(50).nullable().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface FullProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string;
  photo_url: string | null;
  work_phone: string | null;
  whatsapp_personal: string | null;
  city: string;
  state: string;
  work_mode: 'onsite' | 'remote' | 'hybrid';
  employment_status: 'active' | 'inactive' | 'on_leave';
  start_date: string;
  birth_day: number | null;
  birth_month: number | null;
  slack_id: string | null;
  team_id: string | null;
}

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function Profile() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ProfileFormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as FullProfile | null;
    },
    enabled: !!user?.id,
  });

  const { data: team } = useQuery({
    queryKey: ['profile-team', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return null;
      
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', profile.team_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.team_id,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name,
        work_phone: profile.work_phone,
        whatsapp_personal: profile.whatsapp_personal,
        city: profile.city,
        state: profile.state,
        birth_day: profile.birth_day,
        birth_month: profile.birth_month,
        slack_id: profile.slack_id,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user?.id || !profile?.id) throw new Error('Perfil não encontrado');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          display_name: `${data.first_name} ${data.last_name}`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProfileFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProfileFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast.error('Por favor, corrija os erros no formulário.');
      return;
    }

    setErrors({});
    updateMutation.mutate(result.data);
  };

  const handleChange = (field: keyof ProfileFormData, value: string | number | null) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (r: string | null) => {
    switch (r) {
      case 'ceo': return 'CEO';
      case 'admin': return 'Administrador';
      case 'team_leader': return 'Líder de Time';
      case 'collaborator': return 'Colaborador';
      default: return 'Colaborador';
    }
  };

  const getWorkModeLabel = (mode: string) => {
    switch (mode) {
      case 'onsite': return 'Presencial';
      case 'remote': return 'Remoto';
      case 'hybrid': return 'Híbrido';
      default: return mode;
    }
  };

  if (isLoading) {
    return (
      <HubLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  if (!profile || !formData) {
    return (
      <HubLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Perfil não encontrado.</p>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>

        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.photo_url || undefined} alt={profile.display_name} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(profile.display_name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled
                  title="Em breve"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-2xl font-bold">{profile.display_name}</h2>
                <p className="text-muted-foreground">{profile.job_title}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{getRoleLabel(role)}</Badge>
                  <Badge variant="secondary">{getWorkModeLabel(profile.work_mode)}</Badge>
                  {team && <Badge variant="outline"><Building2 className="w-3 h-3 mr-1" />{team.name}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações de contato e localização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="Seu nome"
                    className={errors.first_name ? 'border-destructive' : ''}
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
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Seu sobrenome"
                    className={errors.last_name ? 'border-destructive' : ''}
                  />
                  {errors.last_name && (
                    <p className="text-xs text-destructive">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="work_email">E-mail corporativo</Label>
                    <Input
                      id="work_email"
                      value={profile.work_email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_phone">Telefone comercial</Label>
                    <Input
                      id="work_phone"
                      value={formData.work_phone || ''}
                      onChange={(e) => handleChange('work_phone', e.target.value || null)}
                      placeholder="(51) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_personal">WhatsApp pessoal</Label>
                    <Input
                      id="whatsapp_personal"
                      value={formData.whatsapp_personal || ''}
                      onChange={(e) => handleChange('whatsapp_personal', e.target.value || null)}
                      placeholder="(51) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slack_id">Slack ID</Label>
                    <Input
                      id="slack_id"
                      value={formData.slack_id || ''}
                      onChange={(e) => handleChange('slack_id', e.target.value || null)}
                      placeholder="@usuario"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Location Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Porto Alegre"
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && (
                      <p className="text-xs text-destructive">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(v) => handleChange('state', v)}
                    >
                      <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {brazilianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-xs text-destructive">{errors.state}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Birthday Section */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Aniversário
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_day">Dia</Label>
                    <Select
                      value={formData.birth_day?.toString() || ''}
                      onValueChange={(v) => handleChange('birth_day', v ? parseInt(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_month">Mês</Label>
                    <Select
                      value={formData.birth_month?.toString() || ''}
                      onValueChange={(v) => handleChange('birth_month', v ? parseInt(v) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Seu aniversário será exibido no Hub para os colegas
                </p>
              </div>

              <Separator />

              {/* Read-only Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Informações gerenciadas pelo RH</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cargo</p>
                    <p className="font-medium">{profile.job_title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data de início</p>
                    <p className="font-medium">
                      {new Date(profile.start_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Modalidade</p>
                    <p className="font-medium">{getWorkModeLabel(profile.work_mode)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          </div>
        </form>
      </div>
    </HubLayout>
  );
}
