/**
 * useQbrExecutiveReport
 * 
 * Hook for fetching and generating AI-powered QBR executive reports.
 * Reports are persisted in okr_wizard_sessions with wizard_type = 'qbr-executive-report'.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface QbrExecutiveReportData {
  quarterNarrative: string;
  proposalsAnalysis: string;
  kpiInsights: {
    healthy: string;
    atRisk: string;
    critical: string;
  };
  decisionsNeeded: string[];
  teamProposals: Array<{
    teamName: string;
    objectiveTitle: string;
    krCount: number;
  }>;
}

export function useQbrExecutiveReport(cycleId: string | null) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = okrsKeys.qbrExecutiveReport(currentBuId, cycleId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select('reflection_data, completed_at')
        .eq('wizard_type', 'qbr-executive-report')
        .eq('cycle_id', cycleId!)
        .eq('bu_id', currentBuId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        report: data.reflection_data as unknown as QbrExecutiveReportData,
        generatedAt: data.completed_at,
      };
    },
    enabled: !!cycleId && !!currentBuId,
    staleTime: 5 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      // 1. Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'qbr-executive-report',
        { body: { cycleId, bu_id: currentBuId } }
      );

      if (fnError) throw fnError;

      const reportData = fnData?.data || fnData;
      if (!reportData?.quarterNarrative) {
        throw new Error('Invalid report response');
      }

      // 2. Persist as wizard session
      const { error: upsertError } = await supabase
        .from('okr_wizard_sessions')
        .upsert(
          {
            wizard_type: 'qbr-executive-report',
            cycle_id: cycleId!,
            bu_id: currentBuId!,
            user_id: profile?.user_id || profile?.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
            reflection_data: reportData,
          },
          {
            onConflict: 'wizard_type,cycle_id,bu_id,user_id',
            ignoreDuplicates: false,
          }
        );

      // If upsert with onConflict fails (no unique constraint), fallback to insert
      if (upsertError) {
        // Delete old report for this cycle first
        await supabase
          .from('okr_wizard_sessions')
          .delete()
          .eq('wizard_type', 'qbr-executive-report')
          .eq('cycle_id', cycleId!)
          .eq('bu_id', currentBuId!);

        const { error: insertError } = await supabase
          .from('okr_wizard_sessions')
          .insert({
            wizard_type: 'qbr-executive-report',
            cycle_id: cycleId!,
            bu_id: currentBuId!,
            user_id: profile?.user_id || profile?.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
            reflection_data: reportData,
          });

        if (insertError) {
          console.warn('Failed to persist report, displaying without persistence:', insertError);
        }
      }

      return reportData as QbrExecutiveReportData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      console.error('Failed to generate QBR report:', error);

      // Handle rate limit / credits errors from edge function
      const message = error?.message || '';
      if (message.includes('429') || message.includes('Rate limit')) {
        toast.error('Limite de requisições atingido. Tente novamente em alguns minutos.');
      } else if (message.includes('402') || message.includes('credits')) {
        toast.error('Créditos de IA esgotados. Contate o administrador.');
      } else {
        toast.error('Erro ao gerar o relatório executivo. Tente novamente.');
      }
    },
  });

  return {
    report: query.data?.report ?? null,
    generatedAt: query.data?.generatedAt ?? null,
    isLoading: query.isLoading,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
