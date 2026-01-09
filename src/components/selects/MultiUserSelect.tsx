/**
 * MultiUserSelect - Multi-select component for users
 * 
 * @deprecated Use BuUserMultiSelect from @/components/selects/BuUserMultiSelect instead.
 * This component is maintained for backward compatibility only.
 * 
 * The new BuUserMultiSelect uses the canonical useBuUsersDirectory hook
 * which correctly shows ALL registered users (even without first login).
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBuUsersDirectory } from "@/hooks/useBuUsersDirectory";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Search, Lock } from "lucide-react";

interface MultiUserSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  excludeUserIds?: string[];
  /** User IDs that cannot be removed (always selected) */
  lockedUserIds?: string[];
  disabled?: boolean;
  className?: string;
}

interface UserOption {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  job_title_name: string | null;
  user_id: string | null;
}

/**
 * @deprecated Use BuUserMultiSelect instead
 */
export function MultiUserSelect({
  value,
  onValueChange,
  placeholder = "Selecione usuários",
  excludeUserIds = [],
  lockedUserIds = [],
  disabled = false,
  className,
}: MultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Use canonical hook - shows ALL registered users
  const { data: profiles = [], isLoading } = useBuUsersDirectory({ pageSize: 200 });
  
  // Map to legacy format for backward compatibility
  const users = useMemo(() => {
    return profiles.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      photo_url: p.photo_url,
      job_title_name: p.job_title_name,
      job_title: p.job_title_name,
      user_id: p.user_id,
    }));
  }, [profiles]);

  const filteredUsers = useMemo(() => {
    let result = users.filter((u: UserOption) => !excludeUserIds.includes(u.id));
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((u: UserOption) => 
        u.display_name?.toLowerCase().includes(searchLower) ||
        u.job_title_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [users, excludeUserIds, search]);

  const selectedUsers = useMemo(() => {
    return users.filter((u: UserOption) => value.includes(u.id));
  }, [users, value]);

  const handleToggle = (userId: string) => {
    // Prevent removing locked users
    if (lockedUserIds.includes(userId) && value.includes(userId)) {
      return;
    }
    
    if (value.includes(userId)) {
      onValueChange(value.filter(id => id !== userId));
    } else {
      onValueChange([...value, userId]);
    }
  };

  const handleRemove = (userId: string) => {
    // Prevent removing locked users
    if (lockedUserIds.includes(userId)) {
      return;
    }
    onValueChange(value.filter(id => id !== userId));
  };

  const handleClear = () => {
    // Keep locked users when clearing
    onValueChange(value.filter(id => lockedUserIds.includes(id)));
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.slice(0, 2).toUpperCase();
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
            {selectedUsers.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedUsers.length <= 2 ? (
              selectedUsers.map((user: UserOption) => (
                <Badge 
                  key={user.id} 
                  variant="secondary" 
                  className="mr-1 gap-1"
                >
                  {lockedUserIds.includes(user.id) && (
                    <Lock className="h-2.5 w-2.5" />
                  )}
                  {user.display_name || "Usuário"}
                  {!lockedUserIds.includes(user.id) && (
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(user.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary">
                {selectedUsers.length} usuários selecionados
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
            {selectedUsers.length} selecionado(s)
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
            {filteredUsers.map((user: UserOption) => {
              const isLocked = lockedUserIds.includes(user.id);
              const isSelected = value.includes(user.id);
              
              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted",
                    isLocked && isSelected && "cursor-default"
                  )}
                  onClick={() => handleToggle(user.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isLocked && isSelected}
                    onCheckedChange={() => handleToggle(user.id)}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm truncate flex items-center gap-1">
                      {user.display_name || "Sem nome"}
                      {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </span>
                    {user.job_title_name && (
                      <span className="text-xs text-muted-foreground truncate">
                        {user.job_title_name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
