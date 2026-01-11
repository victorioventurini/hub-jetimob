/**
 * HierarchyContextSwitcher - Seletor de contexto respeitando hierarquia
 * 
 * Para admins/super_admins: mostra todos os times/usuários da BU
 * Para líderes: mostra apenas times/usuários da sua hierarquia
 * 
 * Diferente do AdminContextSwitcher, este componente aparece para líderes
 * que gerenciam mais de um time (incluindo sub-times).
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, User, ChevronDown, Shield, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useManageableTeamsFlat } from '@/modules/okrs/hooks/useManageableTeams';
import type { FlatTeamItem } from '@/modules/teams/hooks/useTeams';
import { useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import { useBuUsersDirectory } from '@/hooks/useBuUsersDirectory';

// ============================================================
// TYPES
// ============================================================

export interface HierarchyContextSwitcherProps {
  /** Tipo de contexto: time ou usuário */
  type: 'team' | 'user';
  /** Label atual (nome do time ou usuário) */
  currentLabel: string;
  /** ID selecionado atualmente */
  selectedId: string | null;
  /** Callback ao selecionar */
  onSelect: (id: string) => void;
  /** Se está carregando opções */
  isLoading?: boolean;
  /** Se está desabilitado */
  disabled?: boolean;
  /** Classes extras */
  className?: string;
  /** IDs de times para filtrar usuários (para type='user') */
  filterTeamIds?: string[];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ============================================================
// TEAM SELECT COMPONENT (respects hierarchy)
// ============================================================

function HierarchyTeamSelect({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { isAdmin } = useAuth();
  const isAdminLevel = isAdmin;
  
  // Use manageable teams for leaders, all teams for admins
  const { teams: manageableTeams, isLoading: isLoadingManageable } = useManageableTeamsFlat();
  const { teams: allTeams, isLoading: isLoadingAll } = useHierarchicalTeamList();
  
  const teams = isAdminLevel ? allTeams : manageableTeams;
  const isLoading = isAdminLevel ? isLoadingAll : isLoadingManageable;
  
  const handleChange = (value: string) => {
    onSelect(value);
    onClose();
  };
  
  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando times...</div>;
  }
  
  if (teams.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Você não tem acesso a nenhum time</p>
      </div>
    );
  }
  
  return (
    <Select value={selectedId || undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um time" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {teams.map((team) => (
          <SelectItem
            key={team.id}
            value={team.id}
            className={cn(
              "relative",
              team.level === 0 && "font-medium",
              team.level > 0 && "text-muted-foreground"
            )}
          >
            <span 
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${team.level * 12}px` }}
            >
              {team.level > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              )}
              {team.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================
// USER SELECT COMPONENT (respects hierarchy)
// ============================================================

function HierarchyUserSelect({
  selectedId,
  onSelect,
  onClose,
  filterTeamIds,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  filterTeamIds?: string[];
}) {
  const { isAdmin, profile } = useAuth();
  const isAdminLevel = isAdmin;
  const [search, setSearch] = useState('');
  
  // For leaders, get only users from their manageable teams
  const { teams: manageableTeams } = useManageableTeamsFlat();
  const teamIdsToFilter = isAdminLevel 
    ? filterTeamIds 
    : manageableTeams.map(t => t.id);
  
  // Fetch users (will be filtered by team if teamId is provided)
  const { data: users = [], isLoading } = useBuUsersDirectory({
    q: search || undefined,
    pageSize: 200,
  });
  
  // Filter users by team IDs for leaders
  const filteredUsers = useMemo(() => {
    if (isAdminLevel || !teamIdsToFilter?.length) {
      return users;
    }
    // For leaders, only show users from their teams
    return users.filter(u => u.team_id && teamIdsToFilter.includes(u.team_id));
  }, [users, isAdminLevel, teamIdsToFilter]);
  
  const handleSelect = (userId: string) => {
    onSelect(userId);
    onClose();
  };
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <ScrollArea className="h-[250px]">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {search ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md text-left",
                  "hover:bg-primary/10 transition-colors",
                  selectedId === user.id && "bg-primary/10"
                )}
              >
                <OptimizedAvatar
                  src={user.photo_url}
                  fallback={getInitials(user.display_name)}
                  size="sm"
                  className="h-8 w-8"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.display_name || 'Sem nome'}
                    {user.id === profile?.id && (
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4">
                        Você
                      </Badge>
                    )}
                  </p>
                  {user.team_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.team_name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function HierarchyContextSwitcher({
  type,
  currentLabel,
  selectedId,
  onSelect,
  isLoading = false,
  disabled = false,
  className,
  filterTeamIds,
}: HierarchyContextSwitcherProps) {
  const { isAdmin } = useAuth();
  const isAdminLevel = isAdmin;
  
  const [open, setOpen] = useState(false);
  
  // For team type, check if user has multiple manageable teams
  const { teams: manageableTeams, isLoading: isLoadingTeams } = useManageableTeamsFlat();
  
  // Only show switcher if:
  // - Admin: always show
  // - Leader: show if has more than 1 manageable team
  const shouldShowSwitcher = useMemo(() => {
    if (type === 'user') {
      // For user selection, only admins can switch
      return isAdminLevel;
    }
    // For team selection
    if (isAdminLevel) return true;
    return manageableTeams.length > 1;
  }, [type, isAdminLevel, manageableTeams.length]);
  
  // Don't render if user shouldn't see the switcher
  if (!shouldShowSwitcher && !isLoadingTeams) {
    return null;
  }
  
  const Icon = type === 'team' ? Users : User;
  const title = type === 'team' ? 'Selecionar Time' : 'Selecionar Usuário';
  const description = type === 'team' 
    ? isAdminLevel 
      ? 'Escolha o time para executar o ritual (modo admin)'
      : 'Escolha o time da sua hierarquia'
    : 'Escolha o usuário para visualizar/executar o check-in';
  
  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || isLoading || isLoadingTeams}
        className={cn(
          'gap-2 h-8 px-3 border-dashed hover:border-solid',
          'bg-muted/50 hover:bg-muted',
          className
        )}
      >
        {isAdminLevel && <Shield className="h-3 w-3 text-amber-500" />}
        <Icon className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate text-xs font-normal">
          {currentLabel}
        </span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
      
      {/* Selection modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdminLevel && <Shield className="h-4 w-4 text-amber-500" />}
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {type === 'team' ? (
              <HierarchyTeamSelect
                selectedId={selectedId}
                onSelect={onSelect}
                onClose={() => setOpen(false)}
              />
            ) : (
              <HierarchyUserSelect
                selectedId={selectedId}
                onSelect={onSelect}
                onClose={() => setOpen(false)}
                filterTeamIds={filterTeamIds}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
