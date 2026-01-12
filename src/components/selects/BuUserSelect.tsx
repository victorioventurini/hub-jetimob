/**
 * BuUserSelect - Componente canônico para seleção de usuário único
 * 
 * USA OBRIGATORIAMENTE: v_bu_active_profiles via useBuUsersDirectory
 * 
 * REGRA INQUEBRÁVEL: Mostra TODOS os usuários cadastrados na BU,
 * independentemente de primeiro login, onboarding ou membership.
 * 
 * Referência: TCR v2.11.0 - User Directory Global
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OptimizedAvatar } from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBuUsersDirectory, type DirectoryProfile } from "@/hooks/useBuUsersDirectory";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { Search, User, Clock, AlertCircle } from "lucide-react";

export interface BuUserSelectProps {
  value: string | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  excludeUserIds?: string[];
  disabled?: boolean;
  className?: string;
  /** Show informative badges for onboarding pending, no access, etc */
  showBadges?: boolean;
  /** Filter by team ID */
  teamId?: string;
  /** Show search input in dropdown (default: true) */
  showSearch?: boolean;
  /** Allow selecting "none" option */
  allowNone?: boolean;
  /** Label for "none" option (default: "Nenhum") */
  noneLabel?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.slice(0, 2).toUpperCase();
}

/**
 * Single user select component using canonical v_bu_active_profiles view.
 * Shows ALL registered users (even without first login).
 */
export function BuUserSelect({
  value,
  onValueChange,
  placeholder = "Selecione um usuário",
  excludeUserIds = [],
  disabled = false,
  className,
  showBadges = true,
  teamId,
  showSearch = true,
  allowNone = false,
  noneLabel = "Nenhum",
}: BuUserSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  
  // Special value for "none" option
  const NONE_VALUE = "__none__";
  
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  
  const { data: profiles = [], isLoading } = useBuUsersDirectory({
    q: showSearch ? search : undefined,
    teamId,
    pageSize: 200,
  });

  // Separate query to fetch the selected profile when not in list
  // This ensures the selected value is always displayed correctly
  const { data: selectedProfileData, isLoading: isLoadingSelected } = useQuery({
    queryKey: [...queryKeys.profiles.detail(value ?? ""), "bu-select", buId],
    queryFn: async () => {
      if (!supabase || !buId || !value || value === NONE_VALUE) return null;
      
      const { data, error } = await supabase
        .from("v_bu_active_profiles")
        .select(`
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          work_email,
          photo_url,
          team_id,
          team_name,
          job_title_id,
          job_title_name,
          employment_status,
          onboarding_completed,
          has_bu_membership,
          start_date,
          created_at
        `)
        .eq("bu_id", buId)
        .eq("id", value)
        .maybeSingle();
      
      if (error) {
        console.error("[BuUserSelect] Error fetching selected profile:", error);
        return null;
      }
      return data as DirectoryProfile | null;
    },
    enabled: !!supabase && !!buId && !!value && value !== NONE_VALUE,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => !excludeUserIds.includes(p.id));
  }, [profiles, excludeUserIds]);

  // Use selected profile from list if available, fallback to separate query
  const selectedProfile = useMemo(() => {
    return profiles.find((p) => p.id === value) ?? selectedProfileData ?? null;
  }, [profiles, value, selectedProfileData]);
  
  // Handle value for Select (convert null/undefined to NONE_VALUE if allowNone)
  const selectValue = allowNone && !value ? NONE_VALUE : value;
  
  const handleValueChange = (val: string) => {
    if (val === NONE_VALUE) {
      onValueChange(null);
    } else {
      onValueChange(val);
    }
    setOpen(false);
  };

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {selectValue === NONE_VALUE ? (
            <span className="text-muted-foreground">{noneLabel}</span>
          ) : selectedProfile ? (
            <div className="flex items-center gap-2">
              <OptimizedAvatar
                src={selectedProfile.photo_url}
                fallback={getInitials(selectedProfile.display_name)}
                size="sm"
                className="h-5 w-5"
                fallbackClassName="text-[10px]"
              />
              <span className="truncate">
                {selectedProfile.display_name || "Sem nome"}
              </span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
        {showSearch && (
          <div className="p-2 border-b sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="pl-8 h-9"
              />
            </div>
          </div>
        )}
        <ScrollArea className="h-[250px]">
          {/* None option */}
          {allowNone && (
            <SelectItem
              value={NONE_VALUE}
              className={cn(
                "cursor-pointer py-2",
                "focus:bg-primary/10 focus:text-foreground",
                "data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground",
                "data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
              )}
            >
              <span className="text-muted-foreground">{noneLabel}</span>
            </SelectItem>
          )}
          {filteredProfiles.length === 0 && !allowNone ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <User className="h-8 w-8 mb-2" />
              <span className="text-sm">
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
              </span>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <SelectItem
                key={profile.id}
                value={profile.id}
                className={cn(
                  "cursor-pointer py-2",
                  // Match NotificationCenter hover
                  "focus:bg-primary/10 focus:text-foreground",
                  "data-[highlighted]:bg-primary/10 data-[highlighted]:text-foreground",
                  // Keep selected state consistent with hover
                  "data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <OptimizedAvatar
                    src={profile.photo_url}
                    fallback={getInitials(profile.display_name)}
                    size="sm"
                    className="h-7 w-7 flex-shrink-0"
                    fallbackClassName="text-[10px]"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm">
                        {profile.display_name || "Sem nome"}
                      </span>
                      {showBadges && <UserStatusBadges profile={profile} />}
                    </div>
                    {profile.job_title_name && (
                      <span className="text-xs text-muted-foreground truncate">
                        {profile.job_title_name}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

function UserStatusBadges({ profile }: { profile: DirectoryProfile }) {
  return (
    <>
      {!profile.onboarding_completed && (
        <Badge variant="outline" className="h-4 px-1 text-[10px] gap-0.5 text-amber-600 border-amber-300">
          <Clock className="h-2.5 w-2.5" />
          Pendente
        </Badge>
      )}
      {!profile.has_bu_membership && (
        <Badge variant="outline" className="h-4 px-1 text-[10px] gap-0.5 text-muted-foreground">
          <AlertCircle className="h-2.5 w-2.5" />
          Sem acesso
        </Badge>
      )}
    </>
  );
}
