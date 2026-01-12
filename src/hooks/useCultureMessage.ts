/**
 * useCultureMessage - Hook para mensagens de cultura personalizadas
 * 
 * Usa o agente "Guardião da Cultura" via IA para gerar mensagens
 * contextualizadas. Fallback robusto com pool de 1000+ mensagens.
 * 
 * Features:
 * - IA em tempo real para mensagens inteligentes
 * - Cache por turno (máximo 3 chamadas/dia)
 * - Contexto rico: dia, turno, role, performance, ciclo
 * - Fallback com seleção contextualizada do pool
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useLeaderTeams } from "@/modules/home/hooks/useLeaderTeams";
import { useVicAgent } from "@/modules/vic/hooks/useVicAgent";
import { getContextualCultureMessage } from "@/data/cultureMessages";

const CACHE_KEY = "culture_message_ai";
const USED_MESSAGES_KEY = "culture_messages_used";
const MAX_RECENTLY_USED = 30;

interface UseCultureMessageReturn {
  message: string | null;
  isLoading: boolean;
  error: string | null;
  isFromAI: boolean;
  refresh: () => Promise<void>;
}

interface CachedMessage {
  message: string;
  isFromAI: boolean;
  timestamp: number;
  turno: string;
  date: string;
}

interface CultureContext {
  dayOfWeek: string;
  dayOfWeekIndex: number;
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
  hasOverdueItems: boolean;
  focusSummary: string[];
  isEndOfMonth: boolean;
  isStartOfMonth: boolean;
  monthWeek: number; // 1-4
}

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const DAY_NAMES_DISPLAY = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function getTimeOfDay(): 'manha' | 'tarde' | 'noite' {
  const hour = new Date().getHours();
  if (hour < 12) return 'manha';
  if (hour < 18) return 'tarde';
  return 'noite';
}

function getDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getCacheKey(buId: string, userId: string): string {
  return `${CACHE_KEY}_${buId}_${userId}`;
}

function getCachedMessage(buId: string, userId: string): CachedMessage | null {
  try {
    const key = getCacheKey(buId, userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedMessage;
    const today = getDateKey();
    const currentTurno = getTimeOfDay();
    
    // Só usar cache se for mesmo dia E mesmo turno
    if (parsed.date !== today || parsed.turno !== currentTurno) {
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function setCachedMessage(
  buId: string, 
  userId: string, 
  message: string, 
  isFromAI: boolean
): void {
  try {
    const key = getCacheKey(buId, userId);
    const cached: CachedMessage = {
      message,
      isFromAI,
      timestamp: Date.now(),
      turno: getTimeOfDay(),
      date: getDateKey(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

function getRecentlyUsed(): string[] {
  try {
    const cached = localStorage.getItem(USED_MESSAGES_KEY);
    if (!cached) return [];
    return JSON.parse(cached);
  } catch {
    localStorage.removeItem(USED_MESSAGES_KEY);
    return [];
  }
}

function markAsUsed(msg: string): void {
  const recent = getRecentlyUsed();
  const updated = [msg, ...recent.filter((m) => m !== msg)].slice(0, MAX_RECENTLY_USED);
  localStorage.setItem(USED_MESSAGES_KEY, JSON.stringify(updated));
}

export function useCultureMessage(): UseCultureMessageReturn {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromAI, setIsFromAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const initializedRef = useRef(false);

  const { currentBuId } = useBu();
  const { profile } = useAuth();
  const { role, okrSummary, focusItems, teamStatus, isLoading: dashboardLoading } = useHomeDashboard();
  const { isLeader, teams, isLoading: teamsLoading } = useLeaderTeams();
  const { invoke, isLoading: vicLoading } = useVicAgent();

  const roleCategory = role || 'collaborator';

  const buildContext = useCallback((): CultureContext => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    return {
      dayOfWeek: DAY_NAMES_DISPLAY[now.getDay()],
      dayOfWeekIndex: now.getDay(),
      timeOfDay: getTimeOfDay(),
      roleCategory,
      isLeader: isLeader || false,
      teamsLedCount: teams?.length || 0,
      userTeamName: teamStatus?.teamName || null,
      okrStatus: {
        onTrack: okrSummary?.onTrack || 0,
        atRisk: okrSummary?.atRisk || 0,
        offTrack: okrSummary?.offTrack || 0,
      },
      hasOverdueItems: focusItems?.some(item => item.type === 'warning') || false,
      focusSummary: focusItems?.slice(0, 3).map(item => item.label) || [],
      isEndOfMonth: dayOfMonth >= daysInMonth - 5,
      isStartOfMonth: dayOfMonth <= 5,
      monthWeek: Math.ceil(dayOfMonth / 7),
    };
  }, [roleCategory, isLeader, teams, teamStatus, okrSummary, focusItems]);

  const getStaticFallback = useCallback((): string => {
    const context = buildContext();
    const recentlyUsed = getRecentlyUsed();
    
    const dayKey = DAY_NAMES[context.dayOfWeekIndex] as 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta';
    
    let selected = getContextualCultureMessage(
      {
        role: roleCategory as 'executive' | 'leader' | 'collaborator',
        dayOfWeek: dayKey,
        timeOfDay: context.timeOfDay as 'manha' | 'tarde' | 'noite',
        isEndOfCycle: context.isEndOfMonth,
        isStartOfCycle: context.isStartOfMonth,
      },
      recentlyUsed,
      20
    );
    
    // Limitar a 60 caracteres
    if (selected.length > 60) {
      selected = selected.substring(0, 57) + '...';
    }
    
    markAsUsed(selected);
    return selected;
  }, [buildContext, roleCategory]);

  const fetchMessage = useCallback(async (forceRefresh = false) => {
    // Se não tem contexto, usar fallback
    if (!currentBuId || !profile?.id) {
      const fallback = getStaticFallback();
      setMessage(fallback);
      setIsFromAI(false);
      setIsLoading(false);
      return;
    }

    // Verificar cache (exceto se forçando refresh)
    if (!forceRefresh) {
      const cached = getCachedMessage(currentBuId, profile.id);
      if (cached) {
        setMessage(cached.message);
        setIsFromAI(cached.isFromAI);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const contextData = buildContext();
      
      const response = await invoke(
        "cultura",
        "dashboard-culture",
        {
          type: "culture_message",
          additionalData: contextData as unknown as Record<string, unknown>,
        },
        undefined,
        { silent: true }
      );

      if (response?.response) {
        // Limitar a 60 caracteres
        let aiMessage = response.response.trim();
        if (aiMessage.length > 60) {
          aiMessage = aiMessage.substring(0, 57) + '...';
        }
        setMessage(aiMessage);
        setIsFromAI(true);
        setCachedMessage(currentBuId, profile.id, aiMessage, true);
        markAsUsed(aiMessage);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      console.warn('[useCultureMessage] AI failed, using contextual fallback:', err);
      const fallback = getStaticFallback();
      setMessage(fallback);
      setIsFromAI(false);
      setCachedMessage(currentBuId, profile.id, fallback, false);
      setError('Usando mensagem do pool');
    } finally {
      setIsLoading(false);
    }
  }, [currentBuId, profile?.id, buildContext, invoke, getStaticFallback]);

  const refresh = useCallback(async () => {
    setHasFetched(false);
    await fetchMessage(true);
  }, [fetchMessage]);

  // Fetch inicial quando dados estão prontos
  useEffect(() => {
    if (hasFetched) return;
    if (dashboardLoading || teamsLoading) return;
    if (initializedRef.current) return;
    
    initializedRef.current = true;
    setHasFetched(true);
    fetchMessage();
  }, [hasFetched, dashboardLoading, teamsLoading, fetchMessage]);

  return { 
    message, 
    isLoading: isLoading || vicLoading, 
    error,
    isFromAI,
    refresh 
  };
}
