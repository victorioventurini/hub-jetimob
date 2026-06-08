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
import { Sparkles, Building2 } from 'lucide-react';
import { useIdentity } from '@/hooks/useIdentity';
import { usePrimaryKpiForKr } from '../hooks/usePrimaryKpiForKr';
import { useOrgKrCascadeSources } from '../hooks/useOrgKrCascadeSources';
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
  const scope = kr.scope ?? 'team';
  const isOrg = scope === 'org';

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

  // KPI primária (mesma fonte para team & org)
  const { hasPrimaryKpi, primaryKpi } = usePrimaryKpiForKr(kr.id, scope);

  // Cascade (apenas relevante para Org KR)
  const { hasCascade, linkedCount } = useOrgKrCascadeSources(isOrg ? kr.id : null);

  // Lock manual input quando há fonte derivada
  const isAutomatic = !!kr.metric_id || hasPrimaryKpi || (isOrg && hasCascade);

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
      const checkinValue = isAutomatic ? kr.current_value : parseFloat(currentValue);

      if (isOrg) {
        // ===== Org KR =====
        const { data: checkinData, error } = await supabase
          .from('okr_org_checkins' as any)
          .insert({
            kr_id: kr.id,
            current_value: checkinValue,
            previous_value: kr.current_value,
            confidence: confidenceMap[status],
            blockers: null,
            comments,
            user_id: profileId,
          })
          .select('id')
          .single();
        if (error) throw error;

        if (reflectionMentions.length > 0 && checkinData) {
          await processMentions(
            reflection, 'checkin', (checkinData as any).id,
            'kr', kr.id, getShareableUrl('okr_org_kr', kr.id),
          );
        }

        if (!isAutomatic) {
          const { error: updateError } = await supabase
            .from('okr_org_key_results')
            .update({ status, current_value: checkinValue })
            .eq('id', kr.id);
          if (updateError) throw updateError;
        } else {
          // Quando automático, sincroniza apenas o status RAG
          const { error: updateError } = await supabase
            .from('okr_org_key_results')
            .update({ status })
            .eq('id', kr.id);
          if (updateError) throw updateError;
        }
      } else {
        // ===== Team KR (comportamento original) =====
        const { data: checkinData, error } = await supabase.from('okr_checkins').insert({
          kr_id: kr.id, current_value: checkinValue,
          previous_value: kr.current_value, confidence: confidenceMap[status], blockers: null, comments,
          user_id: profileId, team_id: userProfile?.team_id || null,
        } as any).select('id').single();
        if (error) throw error;

        if (reflectionMentions.length > 0 && checkinData) {
          await processMentions(reflection, 'checkin', checkinData.id, 'kr', kr.id, getShareableUrl('okr_team_kr', kr.id));
        }

        const { error: updateError } = await supabase.from('okr_team_key_results').update({
          status, current_value: checkinValue,
        }).eq('id', kr.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      if (isOrg) {
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsPrefix(), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgCheckins(kr.id), refetchType: 'active' });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResults(null), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkins(kr.id), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null), refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: queryKeys.okrs.checkinSummary(null), refetchType: 'active' });
      }
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

  const TitleIcon = isOrg ? Building2 : Sparkles;
  const dialogTitle = isOrg ? 'Atualizar KR Organizacional' : 'Check-in de Progresso';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${DIALOG_SIZES.md} max-h-[90vh] overflow-y-auto`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <TitleIcon className="w-5 h-5 text-primary" />{dialogTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CheckinContextBlock kr={kr} userTeamName={isOrg ? undefined : (userProfile?.team as any)?.name} />
            {isOrg && hasCascade && !hasPrimaryKpi && (
              <div className="rounded-md border border-info/30 bg-info-muted/40 p-3 text-xs text-muted-foreground">
                Valor derivado automaticamente de <strong>{linkedCount}</strong>{' '}
                KR{linkedCount === 1 ? '' : 's'} de time vinculada{linkedCount === 1 ? '' : 's'} a este KR organizacional.
                Você ainda pode registrar reflexão e atualizar o status RAG.
              </div>
            )}
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
