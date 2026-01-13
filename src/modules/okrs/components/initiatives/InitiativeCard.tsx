import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Calendar, Flag, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InitiativeStatusBadge } from "./InitiativeStatusBadge";
import { getInitiativePriorityLabel, getInitiativePriorityColor, type Initiative } from "../../types/initiative";
import { UserLink } from "@/components/links";

interface InitiativeCardProps {
  initiative: Initiative;
  onQuickUpdate?: (initiative: Initiative) => void;
  onEdit?: (initiative: Initiative) => void;
  onDelete?: (initiative: Initiative) => void;
  showKrInfo?: boolean;
}

export function InitiativeCard({ initiative, onQuickUpdate, onEdit, onDelete, showKrInfo }: InitiativeCardProps) {
  const getOwnerName = () => {
    if (initiative.owner?.display_name) return initiative.owner.display_name;
    if (initiative.owner?.first_name) {
      return `${initiative.owner.first_name}${initiative.owner.last_name ? ' ' + initiative.owner.last_name : ''}`;
    }
    return "Usuário";
  };
  
  const ownerName = getOwnerName();
  const ownerInitials = ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="hover:shadow-sm transition-shadow border-border/50">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Status badge row */}
            <div className="flex items-center gap-2">
              <InitiativeStatusBadge status={initiative.status} />
              {initiative.priority && initiative.priority !== 'medium' && (
                <span className={`flex items-center text-xs ${getInitiativePriorityColor(initiative.priority)}`}>
                  <Flag className="w-3 h-3 mr-0.5" />
                  {getInitiativePriorityLabel(initiative.priority)}
                </span>
              )}
            </div>
            
            {/* Title - same style as ticket list */}
            <h4 className="font-medium text-foreground text-sm leading-snug">
              {initiative.name}
            </h4>

            {/* Metadata row - same style as ticket list */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {/* Owner */}
              <div className="flex items-center gap-1.5">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={initiative.owner?.photo_url || undefined} />
                  <AvatarFallback className="text-[9px]">{ownerInitials}</AvatarFallback>
                </Avatar>
                <UserLink userId={initiative.owner_user_id} displayName={ownerName} className="text-xs" />
              </div>

              {/* Dates */}
              {(initiative.start_date || initiative.expected_end_date) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {initiative.start_date && format(new Date(initiative.start_date), "dd MMM", { locale: ptBR })}
                    {initiative.start_date && initiative.expected_end_date && " - "}
                    {initiative.expected_end_date && format(new Date(initiative.expected_end_date), "dd MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar (if any) */}
            {typeof initiative.progress === 'number' && initiative.progress > 0 && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{initiative.progress}%</span>
                </div>
                <Progress value={initiative.progress} className="h-1" />
              </div>
            )}
          </div>

          {(onQuickUpdate || onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onQuickUpdate && (
                  <DropdownMenuItem onClick={() => onQuickUpdate(initiative)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(initiative)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(initiative)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
