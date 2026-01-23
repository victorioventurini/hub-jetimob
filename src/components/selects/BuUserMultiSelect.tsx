/**
 * BuUserMultiSelect - Componente canônico para seleção de múltiplos usuários
 * 
 * USA OBRIGATORIAMENTE: v_bu_active_profiles via useBuUsersDirectory
 * 
 * REGRA INQUEBRÁVEL: Mostra TODOS os usuários cadastrados na BU,
 * independentemente de primeiro login, onboarding ou membership.
 * 
 * Referência: TCR v2.11.0 - User Directory Global
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBuUsersDirectory, type DirectoryProfile } from "@/hooks/useBuUsersDirectory";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Search, Lock, Clock, AlertCircle, Users } from "lucide-react";

export interface BuUserMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  excludeUserIds?: string[];
  /** User IDs that cannot be removed (always selected) */
  lockedUserIds?: string[];
  disabled?: boolean;
  className?: string;
  /** Show informative badges for onboarding pending, no access, etc */
  showBadges?: boolean;
  /** Filter by team ID */
  teamId?: string;
  /** Exclude external users/contacts (default: false) */
  excludeExternal?: boolean;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.slice(0, 2).toUpperCase();
}

/**
 * Multi-select component for users using canonical v_bu_active_profiles view.
 * Shows ALL registered users (even without first login).
 */
export function BuUserMultiSelect({
  value,
  onValueChange,
  placeholder = "Selecione usuários",
  excludeUserIds = [],
  lockedUserIds = [],
  disabled = false,
  className,
  showBadges = false,
  teamId,
  excludeExternal = false,
}: BuUserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading } = useBuUsersDirectory({
    q: open ? search : undefined, // Only search when popover is open
    teamId,
    pageSize: 200,
    excludeExternal,
  });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => !excludeUserIds.includes(p.id));
  }, [profiles, excludeUserIds]);

  const selectedProfiles = useMemo(() => {
    return profiles.filter((p) => value.includes(p.id));
  }, [profiles, value]);

  const handleToggle = (profileId: string) => {
    // Prevent removing locked users
    if (lockedUserIds.includes(profileId) && value.includes(profileId)) {
      return;
    }

    if (value.includes(profileId)) {
      onValueChange(value.filter((id) => id !== profileId));
    } else {
      onValueChange([...value, profileId]);
    }
  };

  const handleRemove = (profileId: string) => {
    if (lockedUserIds.includes(profileId)) {
      return;
    }
    onValueChange(value.filter((id) => id !== profileId));
  };

  const handleClear = () => {
    // Keep locked users when clearing
    onValueChange(value.filter((id) => lockedUserIds.includes(id)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-[40px] h-auto",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled || isLoading}
        >
          <div className="flex flex-wrap gap-1 items-center flex-1">
            {selectedProfiles.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedProfiles.length <= 2 ? (
              selectedProfiles.map((profile) => (
                <Badge key={profile.id} variant="secondary" className="mr-1 gap-1">
                  {lockedUserIds.includes(profile.id) && (
                    <Lock className="h-2.5 w-2.5" />
                  )}
                  {profile.display_name || "Usuário"}
                  {!lockedUserIds.includes(profile.id) && (
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(profile.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedProfiles.length} usuários selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm text-muted-foreground">
            {selectedProfiles.length} selecionado(s)
          </span>
          {value.length > lockedUserIds.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 text-xs"
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-2 space-y-1">
            {filteredProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <span className="text-sm">
                  {search ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
                </span>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const isLocked = lockedUserIds.includes(profile.id);
                const isSelected = value.includes(profile.id);

                return (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-muted",
                      isLocked && isSelected && "cursor-default"
                    )}
                    onClick={() => handleToggle(profile.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isLocked && isSelected}
                      onCheckedChange={() => handleToggle(profile.id)}
                    />
                    <OptimizedAvatar
                      src={profile.photo_url}
                      fallback={getInitials(profile.display_name)}
                      size="sm"
                      className="h-7 w-7"
                      fallbackClassName="text-[10px]"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm truncate">
                          {profile.display_name || "Sem nome"}
                        </span>
                        {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {showBadges && <UserStatusBadges profile={profile} />}
                      </div>
                      {profile.job_title_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {profile.job_title_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function UserStatusBadges({ profile }: { profile: DirectoryProfile }) {
  return (
    <>
      {!profile.onboarding_completed && (
        <Badge variant="outline" className="h-4 px-1 text-[10px] gap-0.5 text-warning border-warning/30">
          <Clock className="h-2.5 w-2.5" />
        </Badge>
      )}
      {!profile.has_bu_membership && (
        <Badge variant="outline" className="h-4 px-1 text-[10px] gap-0.5 text-muted-foreground">
          <AlertCircle className="h-2.5 w-2.5" />
        </Badge>
      )}
    </>
  );
}
