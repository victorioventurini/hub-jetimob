/**
 * UsersTable Component
 * 
 * Displays a table of user profiles with selection, actions, and empty states.
 * Extracted from Users.tsx for better modularity.
 * 
 * @see docs/engineering/DEVELOPMENT_STANDARDS.md for component guidelines
 */
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Mail,
  Building2,
  MapPin,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { UserHoverCard } from "@/components/user/UserHoverCard";

export interface ProfileWithTeam {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title_name: string;
  job_title_id: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated" | "external";
  team: { id: string; name: string } | null;
  manager: { id: string; display_name: string; photo_url: string | null } | null;
}

interface UsersTableProps {
  profiles: ProfileWithTeam[];
  isLoading: boolean;
  canManageUsers: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (profile: ProfileWithTeam) => void;
  onDelete: (profile: ProfileWithTeam) => void;
  searchQuery: string;
  teamFilter: string;
}

const workModeLabels: Record<string, string> = {
  onsite: "Presencial",
  hybrid: "Híbrido",
  remote: "Remoto",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  vacation: "Férias",
  terminated: "Desligado",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  vacation: "bg-warning/10 text-warning border-warning/20",
  terminated: "bg-muted text-muted-foreground border-muted",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UsersTable({
  profiles,
  isLoading,
  canManageUsers,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onDelete,
  searchQuery,
  teamFilter,
}: UsersTableProps) {
  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {canManageUsers && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold">Cargo</TableHead>
            <TableHead className="font-semibold">Time</TableHead>
            <TableHead className="font-semibold">Gestor</TableHead>
            <TableHead className="font-semibold">Localização</TableHead>
            <TableHead className="font-semibold">Modalidade</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {canManageUsers && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows canManageUsers={canManageUsers} />
          ) : profiles.length > 0 ? (
            profiles.map((profile) => (
              <UserRow
                key={profile.id}
                profile={profile}
                canManageUsers={canManageUsers}
                isSelected={selectedIds.has(profile.id)}
                onToggleSelection={() => onToggleSelection(profile.id)}
                onEdit={() => onEdit(profile)}
                onDelete={() => onDelete(profile)}
              />
            ))
          ) : (
            <EmptyRow 
              canManageUsers={canManageUsers}
              hasFilters={!!searchQuery || teamFilter !== "all"}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Sub-components for better readability

function LoadingRows({ canManageUsers }: { canManageUsers: boolean }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          {canManageUsers && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
          {canManageUsers && <TableCell></TableCell>}
        </TableRow>
      ))}
    </>
  );
}

interface UserRowProps {
  profile: ProfileWithTeam;
  canManageUsers: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function UserRow({
  profile,
  canManageUsers,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
}: UserRowProps) {
  return (
    <TableRow className={`hover:bg-muted/30 ${isSelected ? "bg-accent/5" : ""}`}>
      {canManageUsers && (
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
            aria-label={`Selecionar ${profile.display_name}`}
          />
        </TableCell>
      )}
      <TableCell>
        <Link 
          to={`/users/${profile.id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.photo_url || undefined} />
            <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">
              {getInitials(profile.display_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground hover:text-accent transition-colors">
              {profile.display_name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {profile.work_email}
            </p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm">{profile.job_title_name}</TableCell>
      <TableCell>
        {profile.team ? (
          <Link
            to={`/teams/${profile.team.id}`}
            className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground hover:text-accent transition-colors">{profile.team.name}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {profile.manager ? (
          <UserHoverCard profileId={profile.manager.id}>
            <Link
              to={`/users/${profile.manager.id}`}
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile.manager.photo_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  {getInitials(profile.manager.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </UserHoverCard>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {profile.city}, {profile.state}
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {workModeLabels[profile.work_mode] || profile.work_mode}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={statusColors[profile.employment_status]}
        >
          {statusLabels[profile.employment_status]}
        </Badge>
      </TableCell>
      {canManageUsers && (
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}

function EmptyRow({ canManageUsers, hasFilters }: { canManageUsers: boolean; hasFilters: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={canManageUsers ? 9 : 7} className="h-32">
        <div className="flex flex-col items-center justify-center text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="font-medium">Nenhum Jetimober encontrado</p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Tente ajustar os filtros"
              : "Adicione o primeiro colaborador"}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}
