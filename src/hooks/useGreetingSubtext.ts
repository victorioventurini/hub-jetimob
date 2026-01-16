/**
 * useGreetingSubtext - Hook para subtexto contextualizado da saudação
 * 
 * Usa IA para gerar frases personalizadas baseadas no contexto rico:
 * - Dia da semana e turno
 * - Perfil (executive, leader, collaborator)
 * - Performance de OKRs
 * - Aniversário de nascimento e empresa
 * - Momento do ciclo de OKRs
 * - Atividades pendentes
 * 
 * Cache por turno (máximo 3 chamadas/dia)
 * Fallback robusto com frases estáticas por perfil
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useLeaderTeams } from "@/modules/home/hooks";
import { useVicAgent } from "@/modules/vic/hooks";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "greeting_subtext_ai";

interface GreetingSubtextContext {
  userName?: string | null;
  profile?: "executive" | "leader" | "collaborator" | "external";
  buName?: string;
  teamName?: string;
}

interface UseGreetingSubtextReturn {
  subtext: string;
  isLoading: boolean;
  isFromAI: boolean;
}

interface CachedSubtext {
  subtext: string;
  isFromAI: boolean;
  timestamp: number;
  turno: string;
  date: string;
}

interface SubtextAIContext {
  dayOfWeek: string;
  dayOfWeekIndex: number;
  timeOfDay: string;
  roleCategory: string;
  isLeader: boolean;
  teamsLedCount: number;
  userTeamName: string | null;
  buName: string | null;
  okrStatus: {
    onTrack: number;
    atRisk: number;
    offTrack: number;
    total: number;
  };
  hasPendingActions: boolean;
  focusSummary: string[];
  isBirthday: boolean;
  isWorkAnniversary: boolean;
  workAnniversaryYears: number | null;
  isEndOfMonth: boolean;
  isStartOfMonth: boolean;
  monthWeek: number;
}

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

function getCachedSubtext(buId: string, userId: string): CachedSubtext | null {
  try {
    const key = getCacheKey(buId, userId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedSubtext;
    const today = getDateKey();
    const currentTurno = getTimeOfDay();
    
    if (parsed.date !== today || parsed.turno !== currentTurno) {
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function setCachedSubtext(
  buId: string, 
  userId: string, 
  subtext: string, 
  isFromAI: boolean
): void {
  try {
    const key = getCacheKey(buId, userId);
    const cached: CachedSubtext = {
      subtext,
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

// Static fallback phrases by profile
const FALLBACK_SUBTEXTS: Record<string, string[]> = {
  executive: [
    "Visão estratégica do dia",
    "Acompanhe os resultados",
    "Saúde estratégica em destaque",
    "Panorama da operação",
    "Seu painel executivo",
  ],
  leader: [
    "Acompanhamento do seu time",
    "Seu time em destaque",
    "Gestão e resultados",
    "Foco no desenvolvimento",
    "Performance e alinhamento",
  ],
  collaborator: [
    "Seu dia no Hub",
    "Vamos ao que importa",
    "Foco no que move a agulha",
    "Sua jornada hoje",
    "Produtividade em primeiro lugar",
  ],
  external: [
    "Acompanhe suas demandas",
    "Suas solicitações em dia",
    "Portal de colaboração",
  ],
};

// Birthday and anniversary special phrases
const BIRTHDAY_PHRASES = [
  "Feliz aniversário! 🎂",
  "Hoje é seu dia! Parabéns! 🎉",
  "Que seu dia seja incrível! 🎈",
];

const ANNIVERSARY_PHRASES = (years: number) => [
  `${years} ano${years > 1 ? 's' : ''} de Jet! Parabéns! 🚀`,
  `Celebrando ${years} ano${years > 1 ? 's' : ''} juntos! 🎊`,
  `${years} ano${years > 1 ? 's' : ''} construindo história! ⭐`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useGreetingSubtext({
  userName,
  profile = "collaborator",
  buName,
  teamName,
}: GreetingSubtextContext): UseGreetingSubtextReturn {
  const [subtext, setSubtext] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFromAI, setIsFromAI] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const initializedRef = useRef(false);

  const { currentBuId, currentBu } = useBu();
  const { profile: authProfile } = useAuth();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();
  const { role, okrSummary, focusItems, teamStatus, isLoading: dashboardLoading } = useHomeDashboard();
  const { isLeader, teams, isLoading: teamsLoading } = useLeaderTeams();
  const { invoke, isLoading: vicLoading } = useVicAgent();

  // Fetch impersonated user's profile for birthday/anniversary checks
  const { data: impersonatedProfile } = useQuery({
    queryKey: ['greeting', 'impersonated-profile', impersonatedUserId],
    queryFn: async () => {
      if (!impersonatedUserId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, birth_day, birth_month, start_date")
        .eq("id", impersonatedUserId)
        .maybeSingle();
      
      if (error) {
        console.error("[useGreetingSubtext] Error fetching impersonated profile:", error);
        return null;
      }
      
      return data;
    },
    enabled: isImpersonating && !!impersonatedUserId,
    staleTime: 10 * 60 * 1000,
  });

  // Use impersonated profile when impersonating, otherwise use auth profile
  const effectiveProfile = isImpersonating && impersonatedProfile 
    ? impersonatedProfile 
    : authProfile;
  
  const effectiveUserId = isImpersonating && impersonatedUserId 
    ? impersonatedUserId 
    : authProfile?.id;

  const roleCategory = role || profile || 'collaborator';

  // Check if today is user's birthday
  const isBirthday = useCallback((): boolean => {
    if (!effectiveProfile) return false;
    const birthDay = (effectiveProfile as { birth_day?: number }).birth_day;
    const birthMonth = (effectiveProfile as { birth_month?: number }).birth_month;
    if (!birthDay || !birthMonth) return false;
    
    const today = new Date();
    return today.getDate() === birthDay && (today.getMonth() + 1) === birthMonth;
  }, [effectiveProfile]);

  // Check if today is work anniversary and calculate years
  const getWorkAnniversary = useCallback((): { isAnniversary: boolean; years: number | null } => {
    if (!effectiveProfile) return { isAnniversary: false, years: null };
    const startDate = (effectiveProfile as { start_date?: string }).start_date;
    if (!startDate) return { isAnniversary: false, years: null };
    
    const today = new Date();
    const start = new Date(startDate);
    
    const isSameDay = today.getDate() === start.getDate() && today.getMonth() === start.getMonth();
    if (!isSameDay) return { isAnniversary: false, years: null };
    
    const years = today.getFullYear() - start.getFullYear();
    return { isAnniversary: years > 0, years: years > 0 ? years : null };
  }, [effectiveProfile]);

  const buildContext = useCallback((): SubtextAIContext => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const { isAnniversary, years } = getWorkAnniversary();
    
    const total = (okrSummary?.onTrack || 0) + (okrSummary?.atRisk || 0) + (okrSummary?.offTrack || 0);
    
    return {
      dayOfWeek: DAY_NAMES_DISPLAY[now.getDay()],
      dayOfWeekIndex: now.getDay(),
      timeOfDay: getTimeOfDay(),
      roleCategory,
      isLeader: isLeader || false,
      teamsLedCount: teams?.length || 0,
      userTeamName: teamName || teamStatus?.teamName || null,
      buName: buName || currentBu?.name || null,
      okrStatus: {
        onTrack: okrSummary?.onTrack || 0,
        atRisk: okrSummary?.atRisk || 0,
        offTrack: okrSummary?.offTrack || 0,
        total,
      },
      hasPendingActions: focusItems?.some(item => item.type === 'action') || false,
      focusSummary: focusItems?.slice(0, 3).map(item => item.label) || [],
      isBirthday: isBirthday(),
      isWorkAnniversary: isAnniversary,
      workAnniversaryYears: years,
      isEndOfMonth: dayOfMonth >= daysInMonth - 5,
      isStartOfMonth: dayOfMonth <= 5,
      monthWeek: Math.ceil(dayOfMonth / 7),
    };
  }, [roleCategory, isLeader, teams, teamStatus, okrSummary, focusItems, isBirthday, getWorkAnniversary, buName, currentBu, teamName]);

  const getStaticFallback = useCallback((): string => {
    // Priority: Birthday > Work Anniversary > Profile-based
    if (isBirthday()) {
      return pick(BIRTHDAY_PHRASES);
    }
    
    const { isAnniversary, years } = getWorkAnniversary();
    if (isAnniversary && years) {
      return pick(ANNIVERSARY_PHRASES(years));
    }
    
    const fallbacks = FALLBACK_SUBTEXTS[roleCategory] || FALLBACK_SUBTEXTS.collaborator;
    return pick(fallbacks);
  }, [isBirthday, getWorkAnniversary, roleCategory]);

  const fetchSubtext = useCallback(async () => {
    if (!currentBuId || !effectiveUserId) {
      const fallback = getStaticFallback();
      setSubtext(fallback);
      setIsFromAI(false);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedSubtext(currentBuId, effectiveUserId);
    if (cached) {
      setSubtext(cached.subtext);
      setIsFromAI(cached.isFromAI);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const contextData = buildContext();
      
      // If it's birthday or anniversary, prioritize those messages
      if (contextData.isBirthday || contextData.isWorkAnniversary) {
        const specialMessage = getStaticFallback();
        setSubtext(specialMessage);
        setIsFromAI(false);
        setCachedSubtext(currentBuId, effectiveUserId!, specialMessage, false);
        setIsLoading(false);
        return;
      }
      
      const response = await invoke(
        "cultura",
        "dashboard-culture",
        {
          type: "greeting_subtext",
          additionalData: contextData as unknown as Record<string, unknown>,
        },
        undefined,
        { silent: true }
      );

      if (response?.response) {
        // Ensure the response is short (max 60 chars)
        let aiSubtext = response.response.trim();
        if (aiSubtext.length > 60) {
          aiSubtext = aiSubtext.substring(0, 57) + "...";
        }
        setSubtext(aiSubtext);
        setIsFromAI(true);
        setCachedSubtext(currentBuId, effectiveUserId!, aiSubtext, true);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.warn('[useGreetingSubtext] AI failed, using fallback:', error);
      const fallback = getStaticFallback();
      setSubtext(fallback);
      setIsFromAI(false);
      setCachedSubtext(currentBuId, effectiveUserId!, fallback, false);
    } finally {
      setIsLoading(false);
    }
  }, [currentBuId, effectiveUserId, buildContext, invoke, getStaticFallback]);

  // Initial fetch when data is ready
  useEffect(() => {
    if (hasFetched) return;
    if (dashboardLoading || teamsLoading) return;
    if (initializedRef.current) return;
    
    initializedRef.current = true;
    setHasFetched(true);
    fetchSubtext();
  }, [hasFetched, dashboardLoading, teamsLoading, fetchSubtext]);

  return { 
    subtext, 
    isLoading: isLoading || vicLoading,
    isFromAI,
  };
}
