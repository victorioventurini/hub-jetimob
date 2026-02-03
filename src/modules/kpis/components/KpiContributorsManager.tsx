/**
 * KpiContributorsManager - UI para gerenciar contribuidores de dados de um KPI
 * 
 * v2.83.0: Separação clara entre responsável (owner) e contribuidor (data entry)
 * - O responsável é accountable pelo indicador
 * - Contribuidores são pessoas que inserem dados operacionais
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Users,
  UserPlus,
  X,
  Info,
  Crown,
  PenLine,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useKpiContributors } from '@/modules/kpis/hooks/useKpiContributors';
import { useBuUsersDirectory } from '@/hooks/useBuUsersDirectory';
import type { KpiContributorRole, KpiContributor } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

export interface KpiContributorsManagerProps {
  kpiId: string;
  kpiName: string;
  ownerId: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

const ROLE_CONFIG: Record<KpiContributorRole, {
  label: string;
  description: string;
  icon: typeof PenLine;
}> = {
  data_entry: {
    label: 'Contribuidor de Dados',
    description: 'Pode registrar novos valores para este indicador',
    icon: PenLine,
  },
  reviewer: {
    label: 'Revisor',
    description: 'Pode revisar e validar valores inseridos',
    icon: Eye,
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// ============================================================
// COMPONENT
// ============================================================

export function KpiContributorsManager({
  kpiId,
  kpiName,
  ownerId,
  ownerName = 'Responsável',
  ownerAvatarUrl,
  className,
}: KpiContributorsManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<KpiContributorRole>('data_entry');
  const [deleteConfirm, setDeleteConfirm] = useState<KpiContributor | null>(null);

  const {
    contributors,
    isLoading,
    addContributor,
    removeContributor,
    isAddingContributor,
    isRemovingContributor,
  } = useKpiContributors({ kpiId });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useBuUsersDirectory({
    pageSize: 200,
  });

  // Filter out already added users and owner
  const availableUsers = useMemo(() => 
    allUsers.filter(
      (user) =>
        user.id !== ownerId &&
        !contributors.some((c) => c.contributor_user_id === user.id)
    ),
    [allUsers, ownerId, contributors]
  );

  const handleAddContributor = async () => {
    if (!selectedUserId) return;

    await addContributor({
      kpiId: kpiId,
      contributorUserId: selectedUserId,
      role: selectedRole,
    });

    setSelectedUserId(null);
    setSelectedRole('data_entry');
    setIsAddOpen(false);
  };

  const handleRemoveContributor = async () => {
    if (!deleteConfirm) return;

    await removeContributor({ contributorId: deleteConfirm.id });
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contribuidores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contribuidores
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            disabled={availableUsers.length === 0}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        
        {/* Explainer */}
        <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            O <strong>responsável</strong> é accountable pelo indicador.{' '}
            <strong>Contribuidores</strong> são pessoas que inserem dados operacionais.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Owner (always shown) */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <Avatar className="h-9 w-9">
            <AvatarImage src={ownerAvatarUrl} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {getInitials(ownerName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ownerName}</p>
            <p className="text-xs text-muted-foreground">Responsável</p>
          </div>
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        </div>

        {/* Contributors list */}
        {contributors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum contribuidor cadastrado
          </p>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {contributors.map((contributor) => {
                const roleConfig = ROLE_CONFIG[contributor.role];
                const RoleIcon = roleConfig.icon;
                const displayName = contributor.contributor?.display_name || 'Usuário';
                const avatarUrl = contributor.contributor?.photo_url || undefined;

                return (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(contributor)}
                      disabled={isRemovingContributor}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Add Contributor Popover */}
      <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm">Adicionar Contribuidor</h4>
              <p className="text-xs text-muted-foreground">
                Selecione quem pode inserir dados para "{kpiName}"
              </p>
            </div>

            {/* User selector */}
            <div className="space-y-2">
              <Label>Pessoa</Label>
              <Command className="rounded-lg border">
                <CommandInput placeholder="Buscar pessoa..." />
                <CommandList>
                  <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {availableUsers.slice(0, 10).map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.display_name}
                        onSelect={() => setSelectedUserId(user.id)}
                        className={cn(
                          'cursor-pointer',
                          selectedUserId === user.id && 'bg-primary/10'
                        )}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={user.photo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        {user.display_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as KpiContributorRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[selectedRole].description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddContributor}
                disabled={!selectedUserId || isAddingContributor}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contribuidor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {deleteConfirm?.contributor?.display_name || 'este contribuidor'} como contribuidor deste indicador?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveContributor} disabled={isRemovingContributor}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}