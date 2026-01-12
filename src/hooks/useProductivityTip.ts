/**
 * useProductivityTip - Hook para dicas de produtividade personalizadas
 * 
 * Coleta dados contextuais do usuário e invoca o agente coach-produtividade
 * para gerar dicas altamente personalizadas.
 * 
 * Features:
 * - Cache inteligente por turno (máximo 3 chamadas/dia)
 * - Fallback robusto com dicas estáticas por perfil
 * - Coleta contexto rico: temporal, identidade e performance
 */

import { useState, useEffect, useCallback } from 'react';
import { useBu } from '@/contexts/BuContext';
import { useAuth } from '@/hooks/useAuth';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { useVicAgent } from '@/modules/vic/hooks/useVicAgent';

interface ProductivityContext {
  dayOfWeek: string;
  timeOfDay: string;
  roleCategory: string;
  isLeader: boolean;
  teamsLedCount: number;
  userTeamName: string | null;
  okrStatus: {
    onTrack: number;
    atRisk: number;
    offTrack: number;
  };
  pendingCheckins: number;
  hasOverdueItems: boolean;
  focusSummary: string[];
}

interface CachedTip {
  tip: string;
  isFromAI: boolean;
  timestamp: number;
  turno: string;
}

const STATIC_FALLBACKS: Record<string, string[]> = {
  executive: [
    "Reserve 15 minutos para revisar o dashboard de times antes das reuniões.",
    "Decisões estratégicas rendem mais pela manhã. Priorize!",
    "Compartilhe uma vitória do time essa semana - motivação é contagiosa.",
    "Agende tempo para pensar estrategicamente, sem interrupções.",
    "Revise os OKRs em risco antes da próxima reunião de liderança.",
  ],
  leader: [
    "Check-in rápido com o time pela manhã alinha expectativas do dia.",
    "OKRs em risco? 15 min de conversa individual pode destravar.",
    "Reconheça publicamente quem entregou bem essa semana.",
    "Delegue uma tarefa hoje e acompanhe o progresso amanhã.",
    "Bloqueie 30 min para feedback 1:1 com alguém do time.",
  ],
  collaborator: [
    "Atualize seus KRs semanalmente para manter o progresso visível.",
    "Defina seu foco do dia logo cedo - clareza aumenta produtividade.",
    "Documente um aprendizado da semana - conhecimento compartilhado multiplica.",
    "Peça feedback sobre uma entrega recente - cresce quem busca melhorar.",
    "Conecte-se com alguém de outro time hoje - networking interno fortalece.",
  ],
};

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'manhã';
  if (hour < 18) return 'tarde';
  return 'noite';
}

function getCacheKey(buId: string, userId: string): string {
  const today = new Date().toISOString().split('T')[0];
  const turno = getTimeOfDay();
  return `productivity_tip_${buId}_${userId}_${today}_${turno}`;
}

function getCachedTip(buId: string, userId: string): CachedTip | null {
  try {
    const key = getCacheKey(buId, userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedTip;
    // Verify it's from the same turno
    if (parsed.turno !== getTimeOfDay()) return null;
    
    return parsed;
  } catch {
    return null;
  }
}

function setCachedTip(buId: string, userId: string, tip: string, isFromAI: boolean): void {
  try {
    const key = getCacheKey(buId, userId);
    const cached: CachedTip = {
      tip,
      isFromAI,
      timestamp: Date.now(),
      turno: getTimeOfDay(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export function useProductivityTip() {
  const [tip, setTip] = useState<string | null>(null);
  const [isFromAI, setIsFromAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const { role, okrSummary, focusItems, teamStatus, isLoading: dashboardLoading } = useHomeDashboard();
  const { isLeader, teams, isLoading: teamsLoading } = useLeaderTeams();
  const { invoke, isLoading: vicLoading } = useVicAgent();

  // Map role for fallback selection
  const roleCategory = role || 'collaborator';

  const getStaticFallback = useCallback((role: string): string => {
    const fallbacks = STATIC_FALLBACKS[role] || STATIC_FALLBACKS.collaborator;
    // Rotate based on day + time for variety
    const index = (new Date().getDay() + new Date().getHours()) % fallbacks.length;
    return fallbacks[index];
  }, []);

  const buildContext = useCallback((): ProductivityContext => {
    const now = new Date();
    
    return {
      dayOfWeek: DAY_NAMES[now.getDay()],
      timeOfDay: getTimeOfDay(),
      roleCategory: roleCategory,
      isLeader: isLeader || false,
      teamsLedCount: teams?.length || 0,
      userTeamName: teamStatus?.teamName || null,
      okrStatus: {
        onTrack: okrSummary?.onTrack || 0,
        atRisk: okrSummary?.atRisk || 0,
        offTrack: okrSummary?.offTrack || 0,
      },
      pendingCheckins: focusItems?.filter(item => item.type === 'action').length || 0,
      hasOverdueItems: focusItems?.some(item => item.type === 'warning') || false,
      focusSummary: focusItems?.slice(0, 3).map(item => item.label) || [],
    };
  }, [roleCategory, isLeader, teams, teamStatus, okrSummary, focusItems]);

  const fetchTip = useCallback(async (forceRefresh = false) => {
    if (!currentBuId || !profile?.id) {
      setTip(getStaticFallback('collaborator'));
      setIsFromAI(false);
      setIsLoading(false);
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedTip(currentBuId, profile.id);
      if (cached) {
        setTip(cached.tip);
        setIsFromAI(cached.isFromAI);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);

    try {
      const contextData = buildContext();
      
      const response = await invoke(
        "coach-produtividade",
        "dashboard-productivity",
        {
          type: "productivity_tip",
          additionalData: contextData as unknown as Record<string, unknown>,
        },
        undefined,
        { silent: true }
      );

      if (response?.response) {
        const aiTip = response.response.trim();
        setTip(aiTip);
        setIsFromAI(true);
        setCachedTip(currentBuId, profile.id, aiTip, true);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.warn('[useProductivityTip] AI failed, using fallback:', error);
      const fallback = getStaticFallback(roleCategory || 'collaborator');
      setTip(fallback);
      setIsFromAI(false);
      setCachedTip(currentBuId, profile.id, fallback, false);
    } finally {
      setIsLoading(false);
    }
  }, [currentBuId, profile?.id, buildContext, invoke, getStaticFallback, roleCategory]);

  const refresh = useCallback(() => {
    setHasFetched(false);
    fetchTip(true);
  }, [fetchTip]);

  // Initial fetch when data is ready
  useEffect(() => {
    if (hasFetched) return;
    if (dashboardLoading || teamsLoading) return;
    
    setHasFetched(true);
    fetchTip();
  }, [hasFetched, dashboardLoading, teamsLoading, fetchTip]);

  return {
    tip,
    isLoading: isLoading || vicLoading,
    isFromAI,
    refresh,
  };
}
