/**
 * AdminContextSwitcher - Permite admins trocarem contexto (time ou usuário) em wizards
 * 
 * Exibe um botão discreto que abre modal para seleção.
 * Só aparece para admin/super_admin.
 * 
 * USA os componentes canônicos:
 * - TeamSelect para seleção de times
 * - BuUserSelect para seleção de usuários
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { Users, User, ChevronDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

export interface AdminContextSwitcherProps {
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
}

// ============================================================
// COMPONENT
// ============================================================

export function AdminContextSwitcher({
  type,
  currentLabel,
  selectedId,
  onSelect,
  isLoading = false,
  disabled = false,
  className,
}: AdminContextSwitcherProps) {
  const [open, setOpen] = useState(false);
  
  const Icon = type === 'team' ? Users : User;
  const title = type === 'team' ? 'Selecionar Time' : 'Selecionar Usuário';
  const description = type === 'team' 
    ? 'Escolha o time para executar o ritual' 
    : 'Escolha o usuário para visualizar/executar o check-in';
  
  const handleSelect = (id: string | null) => {
    if (id) {
      onSelect(id);
      setOpen(false);
    }
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
          
          <div className="py-4">
            {type === 'team' ? (
              <TeamSelect
                value={selectedId || undefined}
                onValueChange={(id) => handleSelect(id || null)}
                placeholder="Selecione um time"
              />
            ) : (
              <BuUserSelect
                value={selectedId || undefined}
                onValueChange={(id) => handleSelect(id)}
                placeholder="Selecione um usuário"
                showBadges
                excludeExternal
                showSearch
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
