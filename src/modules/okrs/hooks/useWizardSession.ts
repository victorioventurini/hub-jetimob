/**
 * useWizardSession - Hook para persistência de sessões de wizard
 * 
 * Gerencia criação, atualização e conclusão de sessões de wizard de OKRs
 * 
 * TCR v2.15.0: Usa cliente BU-scoped, campos explícitos, queryKeys centralizadas
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  WizardPersona, 
  WizardSession,
  TeamCheckinDecision,
  VicInsight,
  KrAction,
} from '../types/wizard';
import type { Json } from '@/integrations/supabase/types';

// ============================================================
// TYPES
// ============================================================

export interface CreateSessionParams {
  wizardType: WizardPersona;
  teamId?: string | null;
  cycleId?: string | null;
}

export interface UpdateSessionParams {
  sessionId: string;
  decisions?: TeamCheckinDecision[];
  actionItems?: { task: string; ownerId: string }[];
  aiInsightsShown?: VicInsight[];
  reflectionData?: Record<string, unknown>;
  meetingNotes?: string;
}

export interface CompleteSessionParams {
  sessionId: string;
  decisions?: TeamCheckinDecision[];
  actionItems?: { task: string; ownerId: string }[];
  aiInsightsShown?: VicInsight[];
  reflectionData?: Record<string, unknown>;
  meetingNotes?: string;
}

export interface SaveKrActionParams {
  sessionId: string;
  krId: string;
  actionType: KrAction['actionType'] | 'checked_in' | 'skipped';
  notes?: string;
}

interface DbWizardSession {
  id: string;
  bu_id: string;
  cycle_id: string | null;
  team_id: string | null;
  wizard_type: string;
  started_by: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  decisions: Json;
  action_items: Json;
  ai_insights_shown: Json;
  reflection_data: Json;
  meeting_notes: string | null;
  created_at: string;
  updated_at: string;
}

// Explicit fields - avoid select('*')
const SESSION_FIELDS = `
  id, bu_id, cycle_id, team_id, wizard_type, started_by, started_at, 
  completed_at, status, decisions, action_items, ai_insights_shown, 
  reflection_data, meeting_notes, created_at, updated_at
`;

// ============================================================
// MAPPERS
// ============================================================

function mapDbToSession(db: DbWizardSession): WizardSession {
  return {
    id: db.id,
    buId: db.bu_id,
    cycleId: db.cycle_id,
    wizardType: db.wizard_type as WizardPersona,
    teamId: db.team_id,
    startedBy: db.started_by,
    startedAt: db.started_at,
    completedAt: db.completed_at,
    decisions: (Array.isArray(db.decisions) ? db.decisions : []) as unknown as TeamCheckinDecision[],
    actionItems: (Array.isArray(db.action_items) ? db.action_items : []) as unknown as { task: string; ownerId: string }[],
    aiInsightsShown: (Array.isArray(db.ai_insights_shown) ? db.ai_insights_shown : []) as unknown as VicInsight[],
  };
}

// ============================================================
// HOOK
// ============================================================

export function useWizardSession() {
  // Para leitura, usa profileId (respeita impersonação)
  // Para escrita, usa realProfileId (sempre o usuário logado)
  const { profileId, realProfileId, isImpersonating } = useIdentity();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();

  // Get active session for current user (in_progress)
  // Durante impersonação, mostra sessões do usuário impersonado
  const activeSessionQuery = useQuery({
    queryKey: isImpersonating 
      ? [...queryKeys.okrs.wizardSession(profileId || ''), 'impersonated']
      : queryKeys.okrs.wizardSession(profileId || ''),
    queryFn: async () => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .select(SESSION_FIELDS)
        .eq('started_by', profileId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? mapDbToSession(data as DbWizardSession) : null;
    },
    enabled: !!profileId,
    staleTime: 30 * 1000, // 30 seconds - session state changes frequently
  });

  // Create new session (SEMPRE usa realProfileId - usuário real)
  const createSessionMutation = useMutation({
    mutationFn: async (params: CreateSessionParams): Promise<WizardSession> => {
      if (!realProfileId || !currentBu?.id) {
        throw new Error('User or BU not available');
      }

      const { data, error } = await supabase
        .from('okr_wizard_sessions')
        .insert({
          bu_id: currentBu.id,
          wizard_type: params.wizardType,
          team_id: params.teamId || null,
          cycle_id: params.cycleId || null,
          started_by: realProfileId, // Sempre o usuário real para escrita
        })
        .select(SESSION_FIELDS)
        .single();

      if (error) throw error;
      return mapDbToSession(data as DbWizardSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.wizardSession(realProfileId || '') });
    },
  });

  // Update session (partial save)
  const updateSessionMutation = useMutation({
    mutationFn: async (params: UpdateSessionParams): Promise<void> => {
      const updateData: Record<string, unknown> = {};
      
      if (params.decisions !== undefined) {
        updateData.decisions = params.decisions;
      }
      if (params.actionItems !== undefined) {
        updateData.action_items = params.actionItems;
      }
      if (params.aiInsightsShown !== undefined) {
        updateData.ai_insights_shown = params.aiInsightsShown;
      }
      if (params.reflectionData !== undefined) {
        updateData.reflection_data = params.reflectionData;
      }
      if (params.meetingNotes !== undefined) {
        updateData.meeting_notes = params.meetingNotes;
      }

      const { error } = await supabase
        .from('okr_wizard_sessions')
        .update(updateData)
        .eq('id', params.sessionId);

      if (error) throw error;
    },
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async (params: CompleteSessionParams): Promise<void> => {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      
      if (params.decisions !== undefined) {
        updateData.decisions = params.decisions;
      }
      if (params.actionItems !== undefined) {
        updateData.action_items = params.actionItems;
      }
      if (params.aiInsightsShown !== undefined) {
        updateData.ai_insights_shown = params.aiInsightsShown;
      }
      if (params.reflectionData !== undefined) {
        updateData.reflection_data = params.reflectionData;
      }
      if (params.meetingNotes !== undefined) {
        updateData.meeting_notes = params.meetingNotes;
      }

      const { error } = await supabase
        .from('okr_wizard_sessions')
        .update(updateData)
        .eq('id', params.sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.wizardSession(realProfileId || '') });
    },
  });

  // Abandon session
  const abandonSessionMutation = useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      const { error } = await supabase
        .from('okr_wizard_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.wizardSession(realProfileId || '') });
    },
  });

  // Save KR action
  const saveKrActionMutation = useMutation({
    mutationFn: async (params: SaveKrActionParams): Promise<void> => {
      const { error } = await supabase
        .from('okr_wizard_kr_actions')
        .insert({
          session_id: params.sessionId,
          kr_id: params.krId,
          action_type: params.actionType,
          notes: params.notes || null,
        });

      if (error) throw error;
    },
  });

  return {
    // Query
    activeSession: activeSessionQuery.data,
    isLoadingSession: activeSessionQuery.isLoading,
    
    // Mutations
    createSession: createSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutateAsync,
    completeSession: completeSessionMutation.mutateAsync,
    abandonSession: abandonSessionMutation.mutateAsync,
    saveKrAction: saveKrActionMutation.mutateAsync,
    
    // States
    isCreating: createSessionMutation.isPending,
    isUpdating: updateSessionMutation.isPending,
    isCompleting: completeSessionMutation.isPending,
  };
}

// ============================================================
// HELPER HOOKS
// ============================================================

/**
 * Get recent completed sessions for analytics
 */
export function useRecentWizardSessions(wizardType?: WizardPersona, limit = 10) {
  const { profileId } = useIdentity();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: [...queryKeys.okrs.wizardSession(profileId || ''), 'recent', wizardType, limit],
    queryFn: async () => {
      if (!profileId) return [];

      let query = supabase
        .from('okr_wizard_sessions')
        .select(SESSION_FIELDS)
        .eq('started_by', profileId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (wizardType) {
        query = query.eq('wizard_type', wizardType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(d => mapDbToSession(d as DbWizardSession));
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
