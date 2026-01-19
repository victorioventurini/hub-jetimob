import { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { OkrProgressBar } from './OkrProgressBar';
import { InternalMentionInput, getMentionDisplayText } from '@/components/mentions';
import { useAuth } from '@/hooks/useAuth';
import { 
  Target, 
  User, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ArrowRight,
  Lock,
  Sparkles,
  Users,
  AtSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OkrRagStatus, calculateProgress } from '../types';
import { useIdentity } from '@/hooks/useIdentity';
import { RAG_STATUS_COLORS } from '@/lib/colors';

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: {
    id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    direction: 'up' | 'down' | 'maintain';
    unit: string;
    status: OkrRagStatus;
    team_id: string;
    owner?: {
      display_name: string;
      photo_url?: string | null;
    };
    team_objective?: {
      title: string;
      cycle_id?: string | null;
    };
    last_checkin_at?: string | null;
    metric_id?: string | null; // If linked to KPI, it's automatic
    is_shared?: boolean; // If part of a shared OKR
    team_name?: string; // Team name for shared OKR context
  };
}

type Status = 'green' | 'yellow' | 'red';

const statusConfig: Record<Status, { 
  label: string; 
  description: string; 
  icon: typeof CheckCircle2; 
  colorClass: string;
  bgClass: string;
}> = {
  green: {
    label: 'On Track',
    description: 'Progresso conforme esperado',
    icon: CheckCircle2,
    colorClass: RAG_STATUS_COLORS.green.text,
    bgClass: `${RAG_STATUS_COLORS.green.badge} ${RAG_STATUS_COLORS.green.border}`,
  },
  yellow: {
    label: 'At Risk',
    description: 'Risco de não atingir a meta',
    icon: AlertTriangle,
    colorClass: RAG_STATUS_COLORS.yellow.text,
    bgClass: `${RAG_STATUS_COLORS.yellow.badge} ${RAG_STATUS_COLORS.yellow.border}`,
  },
  red: {
    label: 'Off Track',
    description: 'Meta não será atingida sem mudança clara',
    icon: XCircle,
    colorClass: RAG_STATUS_COLORS.red.text,
    bgClass: `${RAG_STATUS_COLORS.red.badge} ${RAG_STATUS_COLORS.red.border}`,
  },
};

export function CheckinDialog({ open, onOpenChange, kr }: CheckinDialogProps) {
  const { userId, profileId, isReady: identityReady } = useIdentity();
  const { user } = useAuth();
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString());
  const [status, setStatus] = useState<Status>(kr.status === 'not_started' ? 'green' : kr.status as Status);
  const [reflection, setReflection] = useState('');
  const [reflectionMentions, setReflectionMentions] = useState<string[]>([]);
  const [nextStep, setNextStep] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAutomatic = !!kr.metric_id;

  // Fetch user's team for check-in context (uses auth.users.id to find profile)
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.okrs.userProfileForCheckin(userId ?? null, buId ?? null),
    queryFn: async () => {
      if (!supabase || !userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, team_id, display_name, team:teams(id, name)')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && open && isReady && !!supabase,
  });

  // Inlined processMentions logic (consolidado de useNotifications)
  const processMentions = useCallback(async (
    text: string,
    contextType: 'checkin' | 'comment',
    contextId: string,
    parentType: 'kr' | 'okr',
    parentId: string,
    contextUrl: string
  ) => {
    if (!user?.id || !buId || !supabase) return;

    // Extract user IDs from mention format: @[Name](user_id)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]);
    }
    
    const uniqueMentions = [...new Set(mentions)];
    if (uniqueMentions.length === 0) return;

    // Get author name
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();
    const authorName = authorProfile?.display_name || 'Alguém';

    // Create notifications for each mention
    for (const mentionedUserId of uniqueMentions) {
      try {
        await supabase.rpc('emit_notification_event', {
          p_event_slug: 'mention.created',
          p_bu_id: buId,
          p_recipient_user_ids: [mentionedUserId],
          p_actor_id: user.id,
          p_title: `${authorName} mencionou você`,
          p_message: `Você foi mencionado em um ${contextType === 'checkin' ? 'check-in' : 'comentário'}`,
          p_context_type: contextType,
          p_context_id: contextId,
          p_context_url: contextUrl,
          p_metadata: {
            parent_type: parentType,
            parent_id: parentId,
            author_name: authorName,
          },
        });
      } catch (error) {
        console.error('Failed to create mention notification:', error);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  }, [user?.id, buId, supabase, queryClient]);

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    setCurrentValue(kr.current_value.toString());
    setStatus(kr.status === 'not_started' ? 'green' : kr.status as Status);
    setReflection('');
    setReflectionMentions([]);
    setNextStep('');
  }, [kr.current_value, kr.status]));

  const createCheckin = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!profileId) throw new Error('Perfil não encontrado');

      // Map status to confidence for database compatibility
      const confidenceMap: Record<Status, 'high' | 'medium' | 'low'> = {
        green: 'high',
        yellow: 'medium',
        red: 'low',
      };

      // Combine reflection and next step for comments (store raw with mentions)
      const comments = nextStep.trim() 
        ? `${reflection.trim()}\n\n📌 Próximo passo: ${nextStep.trim()}`
        : reflection.trim();

      // Include team_id for shared OKR context
      // bu_id is auto-filled by enforce_bu_scope trigger via x-current-bu-id header
      const { data: checkinData, error } = await supabase
        .from('okr_checkins')
        .insert({
          kr_id: kr.id,
          current_value: isAutomatic ? kr.current_value : parseFloat(currentValue),
          previous_value: kr.current_value,
          confidence: confidenceMap[status],
          blockers: null, // Not using blockers separately anymore
          comments,
          user_id: profileId, // PROFILE_ID: Conforme IDENTITY_CONVENTION.md
          team_id: userProfile?.team_id || null, // NEW: capture user's team for context
        } as any) // Type assertion needed because bu_id is auto-filled by trigger
        .select('id')
        .single();

      if (error) throw error;

      // Process mentions and create notifications
      if (reflectionMentions.length > 0 && checkinData) {
        await processMentions(
          reflection,
          'checkin',
          checkinData.id,
          'kr',
          kr.id,
          `/okrs?kr=${kr.id}`
        );
      }

      // Update KR status
      const { error: updateError } = await supabase
        .from('okr_team_key_results')
        .update({ 
          status,
          current_value: isAutomatic ? kr.current_value : parseFloat(currentValue),
        })
        .eq('id', kr.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResults(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkins(kr.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkinSummary(null) });
      
      toast({
        title: '✓ Check-in registrado',
        description: 'O progresso foi atualizado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar check-in',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate value
    if (!isAutomatic) {
      const value = parseFloat(currentValue);
      if (isNaN(value)) {
        toast({
          title: 'Valor inválido',
          description: 'Por favor, insira um número válido.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate reflection (required) - use display text for validation
    const displayReflection = getMentionDisplayText(reflection).trim();
    if (!displayReflection) {
      toast({
        title: 'Reflexão obrigatória',
        description: 'Por favor, descreva o que avançou ou merece atenção.',
        variant: 'destructive',
      });
      return;
    }

    if (displayReflection.length < 10) {
      toast({
        title: 'Reflexão muito curta',
        description: 'Por favor, adicione mais contexto sobre o progresso.',
        variant: 'destructive',
      });
      return;
    }

    createCheckin.mutate();
  };

  // Calculate preview progress
  const previewValue = isAutomatic ? kr.current_value : (parseFloat(currentValue) || kr.current_value);
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;
  const newProgress = calculateProgress(kr.baseline, previewValue, kr.target, kr.direction);

  const getStatusLabel = (s: OkrRagStatus) => {
    switch (s) {
      case 'green': return 'On Track';
      case 'yellow': return 'At Risk';
      case 'red': return 'Off Track';
      default: return 'Não iniciado';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Check-in de Progresso
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* BLOCO 1 — CONTEXTO (READ-ONLY) */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              {/* Objective */}
              {kr.team_objective && (
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                    <p className="text-sm font-medium line-clamp-1">{kr.team_objective.title}</p>
                  </div>
                </div>
              )}

              {/* KR Title */}
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Key Result</p>
                  <p className="text-sm font-medium">{kr.title}</p>
                </div>
              </div>

              {/* Shared OKR context */}
              {kr.is_shared && (
                <div className="flex items-center gap-2 p-2 bg-accent/50 border border-accent rounded-md">
                  <Users className="w-4 h-4 text-accent-foreground" />
                  <span className="text-xs text-accent-foreground">
                    OKR Compartilhada {kr.team_name && `• ${kr.team_name}`}
                  </span>
                </div>
              )}

              {/* User's team context for check-in */}
              {userProfile?.team && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>Check-in será registrado como: <span className="font-medium">{(userProfile.team as any).name}</span></span>
                </div>
              )}

              {/* Meta info row */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                {kr.owner && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>{kr.owner.display_name}</span>
                  </div>
                )}
                {kr.last_checkin_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>Último: {format(new Date(kr.last_checkin_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-1.5 py-0",
                    kr.status === 'green' && `${RAG_STATUS_COLORS.green.border} ${RAG_STATUS_COLORS.green.text}`,
                    kr.status === 'yellow' && `${RAG_STATUS_COLORS.yellow.border} ${RAG_STATUS_COLORS.yellow.text}`,
                    kr.status === 'red' && `${RAG_STATUS_COLORS.red.border} ${RAG_STATUS_COLORS.red.text}`,
                    kr.status === 'not_started' && 'border-muted-foreground/30'
                  )}
                >
                  {getStatusLabel(kr.status)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* BLOCO 2 — PROGRESSO */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Progresso
              </Label>

              {/* Progress bar preview */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <OkrProgressBar
                  baseline={kr.baseline}
                  current={previewValue}
                  target={kr.target}
                  direction={kr.direction}
                  status={status}
                  unit={kr.unit}
                  size="md"
                />
              </div>

              {/* Value comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Anterior</p>
                  <p className="font-semibold text-sm">{kr.current_value} {kr.unit}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="font-semibold text-sm text-primary">{kr.target} {kr.unit}</p>
                </div>
              </div>

              {/* Value input */}
              {isAutomatic ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Este KR é atualizado automaticamente pela KPI vinculada
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Valor atual *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="currentValue"
                      type="number"
                      step="any"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <span className="text-sm text-muted-foreground font-medium w-16">{kr.unit}</span>
                  </div>
                  {valueDiff !== 0 && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isPositiveChange ? 'text-green-600' : 'text-red-600'
                    )}>
                      {isPositiveChange ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {valueDiff > 0 ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit} ({newProgress.toFixed(0)}% da meta)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* BLOCO 3 — STATUS */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status atual *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['green', 'yellow', 'red'] as Status[]).map((s) => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  const isSelected = status === s;
                  
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? cn(config.bgClass, 'border-current', config.colorClass)
                          : 'border-border hover:border-muted-foreground/50 bg-background'
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-1", isSelected && config.colorClass)} />
                      <p className={cn("text-sm font-medium", isSelected && config.colorClass)}>
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* BLOCO 4 — REFLEXÃO (OBRIGATÓRIO) */}
            <div className="space-y-2">
              <Label htmlFor="reflection" className="text-sm font-semibold flex items-center gap-2">
                O que avançou e o que merece atenção? *
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  Use @ para mencionar pessoas
                </span>
              </Label>
              <InternalMentionInput
                id="reflection"
                placeholder="Avançamos em X, mas estamos travados em Y. Use @nome para mencionar colegas."
                value={reflection}
                onChange={(value, mentions) => {
                  setReflection(value);
                  setReflectionMentions(mentions);
                }}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Foco em fatos, não justificativas longas. 1 a 3 frases.
              </p>
            </div>

            {/* BLOCO 5 — PRÓXIMO PASSO (OPCIONAL) */}
            <div className="space-y-2">
              <Label htmlFor="nextStep" className="text-sm font-medium text-muted-foreground">
                Próximo passo concreto (recomendado)
              </Label>
              <Input
                id="nextStep"
                placeholder="Ex: Reunir com time de vendas para alinhar..."
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
          </div>

          {/* BLOCO 6 — CONFIRMAÇÃO */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createCheckin.isPending || !getMentionDisplayText(reflection).trim()}
            >
              {createCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
