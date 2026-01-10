/**
 * AdminContextSwitcher - Permite admins trocarem contexto (time ou usuário) em wizards
 * 
 * Exibe um botão discreto que abre modal para seleção.
 * Só aparece para admin/super_admin.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, User, ChevronDown, Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface TeamOption {
  id: string;
  name: string;
  memberCount?: number;
}

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  teamName?: string;
}

export interface AdminContextSwitcherProps {
  /** Tipo de contexto: time ou usuário */
  type: 'team' | 'user';
  /** Label atual (nome do time ou usuário) */
  currentLabel: string;
  /** Times disponíveis (quando type='team') */
  teams?: TeamOption[];
  /** Usuários disponíveis (quando type='user') */
  users?: UserOption[];
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
}

// ============================================================
// COMPONENT
// ============================================================

export function AdminContextSwitcher({
  type,
  currentLabel,
  teams = [],
  users = [],
  selectedId,
  onSelect,
  isLoading = false,
  disabled = false,
  className,
}: AdminContextSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const Icon = type === 'team' ? Users : User;
  const title = type === 'team' ? 'Selecionar Time' : 'Selecionar Usuário';
  const description = type === 'team' 
    ? 'Escolha o time para executar o ritual' 
    : 'Escolha o usuário para visualizar/executar o check-in';
  const placeholder = type === 'team' ? 'Buscar time...' : 'Buscar usuário...';
  const emptyText = type === 'team' ? 'Nenhum time encontrado' : 'Nenhum usuário encontrado';
  
  // Filter options based on search
  const filteredTeams = useMemo(() => {
    if (!search) return teams;
    const lower = search.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(lower));
  }, [teams, search]);
  
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(lower) || 
      u.email?.toLowerCase().includes(lower) ||
      u.teamName?.toLowerCase().includes(lower)
    );
  }, [users, search]);
  
  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || isLoading}
        className={cn(
          'gap-2 h-8 px-3 border-dashed hover:border-solid',
          'bg-muted/50 hover:bg-muted',
          className
        )}
      >
        <Shield className="h-3 w-3 text-amber-500" />
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
              <Shield className="h-4 w-4 text-amber-500" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          
          <Command className="rounded-lg border shadow-md" shouldFilter={false}>
            <CommandInput 
              placeholder={placeholder} 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              
              {type === 'team' && (
                <CommandGroup heading="Times">
                  <ScrollArea className="max-h-[300px]">
                    {filteredTeams.map((team) => (
                      <CommandItem
                        key={team.id}
                        value={team.id}
                        onSelect={() => handleSelect(team.id)}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{team.name}</p>
                          {team.memberCount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {team.memberCount} membro{team.memberCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        {selectedId === team.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              )}
              
              {type === 'user' && (
                <CommandGroup heading="Usuários">
                  <ScrollArea className="max-h-[300px]">
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleSelect(user.id)}
                        className="flex items-center gap-3 py-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <div className="flex items-center gap-2">
                            {user.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            )}
                            {user.teamName && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {user.teamName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedId === user.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </ScrollArea>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
