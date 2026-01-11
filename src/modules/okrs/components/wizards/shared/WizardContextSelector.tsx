/**
 * WizardContextSelector - Componente para seleção de time/usuário nos wizards
 * 
 * Regras de permissão:
 * - Colaborador: exibe seu nome (não pode alterar)
 * - Líder: pode selecionar apenas times que lidera
 * - Admin/Super Admin: pode selecionar qualquer time e usuário
 */

import { useMemo } from 'react';
import { Users, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderTeams } from '@/modules/home/hooks/useLeaderTeams';
import { cn } from '@/lib/utils';
import type { FlatTeamItem } from '@/modules/teams/hooks/useTeams';

// ============================================================
// TYPES
// ============================================================

export type WizardContextMode = 'team' | 'user' | 'both';

export interface WizardContextSelectorProps {
  /** Display mode: team selector, user selector, or both */
  mode: WizardContextMode;
  /** Current team ID (for team/both modes) */
  teamId?: string;
  /** Current team name (for display) */
  teamName?: string;
  /** Callback when team changes */
  onTeamChange?: (teamId: string, teamName: string) => void;
  /** Current user ID (for user/both modes) */
  userId?: string;
  /** Callback when user changes */
  onUserChange?: (userId: string) => void;
  /** Additional className */
  className?: string;
  /** Compact display mode */
  compact?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function WizardContextSelector({
  mode,
  teamId,
  teamName,
  onTeamChange,
  userId,
  onUserChange,
  className,
  compact = false,
}: WizardContextSelectorProps) {
  const { profile, isAdmin } = useAuth();
  const { teams: leaderTeams, isLeader } = useLeaderTeams();
  
  // Permission checks - isAdmin already includes super_admin
  const canSelectAnyTeam = isAdmin;
  const canSelectAnyUser = isAdmin;
  
  // Transform leaderTeams to FlatTeamItem format for TeamSelect
  const allowedTeams: FlatTeamItem[] = useMemo(() => {
    if (canSelectAnyTeam) return []; // Pass undefined to use all teams
    
    return leaderTeams.map(t => ({
      id: t.team_id,
      name: t.team_name,
      level: 0,
      parentId: null,
    }));
  }, [leaderTeams, canSelectAnyTeam]);
  
  // Should show team selector
  const showTeamSelector = (mode === 'team' || mode === 'both') && (isLeader || canSelectAnyTeam);
  
  // Should show user selector
  const showUserSelector = (mode === 'user' || mode === 'both');
  
  // Handle team selection
  const handleTeamChange = (newTeamId: string | undefined) => {
    if (!newTeamId || !onTeamChange) return;
    
    // Find team name
    let newTeamName = 'Time';
    if (canSelectAnyTeam) {
      // For admins, we might not have the name readily available
      // The parent component should handle this or we trust the select
      newTeamName = 'Time selecionado';
    } else {
      const team = leaderTeams.find(t => t.team_id === newTeamId);
      newTeamName = team?.team_name || 'Time';
    }
    
    onTeamChange(newTeamId, newTeamName);
  };
  
  // Current user display name
  const currentUserName = profile?.display_name || 
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 
    'Usuário';

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "text-sm" : "text-base",
      className
    )}>
      {/* Team selector */}
      {showTeamSelector && (
        <div className="flex items-center gap-2">
          <Users className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          {canSelectAnyTeam ? (
            <TeamSelect
              value={teamId}
              onValueChange={handleTeamChange}
              placeholder="Selecione um time"
              triggerClassName={cn(
                "h-8 border-dashed",
                compact && "text-xs h-7"
              )}
            />
          ) : (
            <TeamSelect
              value={teamId}
              onValueChange={handleTeamChange}
              teams={allowedTeams}
              placeholder="Selecione um time"
              triggerClassName={cn(
                "h-8 border-dashed",
                compact && "text-xs h-7"
              )}
            />
          )}
        </div>
      )}
      
      {/* Read-only team display (when leader has only one team) */}
      {mode === 'team' && !showTeamSelector && teamName && (
        <div className="flex items-center gap-2">
          <Users className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          <Badge variant="secondary" className={cn("font-normal", compact && "text-xs")}>
            {teamName}
          </Badge>
        </div>
      )}
      
      {/* Separator */}
      {showTeamSelector && showUserSelector && (
        <span className="text-muted-foreground mx-1">•</span>
      )}
      
      {/* User selector (admins only) or read-only display */}
      {showUserSelector && (
        <div className="flex items-center gap-2">
          <User className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          {canSelectAnyUser ? (
            <BuUserSelect
              value={userId || profile?.id}
              onValueChange={(newUserId) => onUserChange?.(newUserId ?? '')}
              placeholder="Selecione um usuário"
              teamId={teamId}
              showBadges={false}
              showSearch={false}
              className={cn(
                "w-[200px] h-8 border-dashed",
                compact && "text-xs h-7 w-[160px]"
              )}
            />
          ) : (
            <Badge variant="secondary" className={cn("font-normal", compact && "text-xs")}>
              {currentUserName}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
