import { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { DIALOG_SIZES } from '@/lib/dialog-sizes';
import { getShareableUrl } from '@/lib/shareableLinks';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getMentionDisplayText } from '@/components/mentions';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles } from 'lucide-react';
import type { OkrRagStatus } from '../types';
import { useIdentity } from '@/hooks/useIdentity';
import { usePrimaryKpiForKr } from '../hooks/usePrimaryKpiForKr';
import {
  CheckinContextBlock,
  CheckinProgressBlock,
  CheckinStatusSelector,
  CheckinReflectionBlock,
  type CheckinKrData,
  type CheckinStatus,
} from './checkin';

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: CheckinKrData;
}

export function CheckinDialog({ open, onOpenChange, kr }: CheckinDialogProps) {
  const { userId, profileId } = useIdentity();
  const { user } = useAuth();
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString());
  const [status, setStatus] = useState<CheckinStatus>(kr.status === 'not_started' ? 'green' : kr.status as CheckinStatus);
  const [reflection, setReflection] = useState('');
  const [reflectionMentions, setReflectionMentions] = useState<string[]>([]);
  const [nextStep, setNextStep] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check for primary KPI via okr_kr_metrics table (new system)
  const { hasPrimaryKpi, primaryKpi } = usePrimaryKpiForKr(kr.id, 'team');
  
  // Determine if value is automatic (locked) - either via legacy metric_id OR new okr_kr_metrics
  const isAutomatic = !!kr.metric_id || hasPrimaryKpi;

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

  const processMentions = useCallback(async (
    text: string, contextType: 'checkin' | 'comment', contextId: string,
    parentType: 'kr' | 'okr', parentId: string, contextUrl: string
  ) => {
    if (!user?.id || !buId || !supabase) return;
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) mentions.push(match[2]);
    const uniqueMentions = [...new Set(mentions)];
    if (uniqueMentions.length === 0) return;

    const { data: authorProfile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
    const authorName = authorProfile?.display_name || 'Alguém';

    for (const mentionedUserId of uniqueMentions) {
      try {
        await supabase.rpc('emit_notification_event', {
          p_event_slug: 'mention.created', p_bu_id: buId, p_recipient_user_ids: [mentionedUserId],
          p_actor_id: user.id, p_title: `${authorName} mencionou você`,
          p_message: `Você foi mencionado em um ${contextType === 'checkin' ? 'check-in' : 'comentário'}`,
          p_context_type: contextType, p_context_id: contextId, p_context_url: contextUrl,
          p_metadata: { parent_type: parentType, parent_id: parentId, author_name: authorName },
        });
      } catch (error) { console.error('Failed to create mention notification:', error); }
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  }, [user?.id, buId, supabase, queryClient]);

  useDialogFormReset(open, useCallback(() => {
    setCurrentValue(kr.current_value.toString());
    setStatus(kr.status === 'not_started' ? 'green' : kr.status as CheckinStatus);
    setReflection(''); setReflectionMentions([]); setNextStep('');
  }, [kr.current_value, kr.status]));

  const createCheckin = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Cliente não disponível');
      if (!profileId) throw new Error('Perfil não encontrado');
      const confidenceMap: Record<CheckinStatus, 'high' | 'medium' | 'low'> = { green: 'high', yellow: 'medium', red: 'low' };
      const comments = nextStep.trim() ? `${reflection.trim()}\n\n📌 Próximo passo: ${nextStep.trim()}` : reflection.trim();

      // When KR has primary KPI, use KR's current value (which should be synced from KPI)
      const checkinValue = isAutomatic ? kr.current_value : parseFloat(currentValue);

      const { data: checkinData, error } = await supabase.from('okr_checkins').insert({
        kr_id: kr.id, current_value: checkinValue,
        previous_value: kr.current_value, confidence: confidenceMap[status], blockers: null, comments,
        user_id: profileId, team_id: userProfile?.team_id || null,
      } as any).select('id').single();
      if (error) throw error;

      if (reflectionMentions.length > 0 && checkinData) {
        await processMentions(reflection, 'checkin', checkinData.id, 'kr', kr.id, getShareableUrl('okr_team_kr', kr.id));
      }

      // Only update KR value if not automatic
      const { error: updateError } = await supabase.from('okr_team_key_results').update({ 
        status, current_value: checkinValue,
      }).eq('id', kr.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // Use refetchType: 'active' para atualização imediata na UI
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResults(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkins(kr.id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkinSummary(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      toast({ title: '✓ Check-in registrado', description: 'O progresso foi atualizado com sucesso.' });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: 'Erro ao registrar check-in', description: error.message, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAutomatic && isNaN(parseFloat(currentValue))) {
      toast({ title: 'Valor inválido', description: 'Por favor, insira um número válido.', variant: 'destructive' });
      return;
    }
    const displayReflection = getMentionDisplayText(reflection).trim();
    if (!displayReflection) {
      toast({ title: 'Reflexão obrigatória', description: 'Por favor, descreva o que avançou ou merece atenção.', variant: 'destructive' });
      return;
    }
    if (displayReflection.length < 10) {
      toast({ title: 'Reflexão muito curta', description: 'Por favor, adicione mais contexto sobre o progresso.', variant: 'destructive' });
      return;
    }
    createCheckin.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DIALOG_SIZES.md} max-h-[90vh] overflow-y-auto`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />Check-in de Progresso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CheckinContextBlock kr={kr} userTeamName={(userProfile?.team as any)?.name} />
            <Separator />
            <CheckinProgressBlock 
              kr={kr} 
              currentValue={currentValue} 
              status={status} 
              isAutomatic={isAutomatic} 
              onValueChange={setCurrentValue}
              primaryKpi={primaryKpi}
            />
            <Separator />
            <CheckinStatusSelector status={status} onStatusChange={setStatus} />
            <Separator />
            <CheckinReflectionBlock reflection={reflection} nextStep={nextStep} onReflectionChange={(v, m) => { setReflection(v); setReflectionMentions(m); }} onNextStepChange={setNextStep} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createCheckin.isPending || !getMentionDisplayText(reflection).trim()}>
              {createCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
