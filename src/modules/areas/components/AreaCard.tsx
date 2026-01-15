/**
 * AreaCard - Displays an area with its leader and team count
 */
import { Building2, Users, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AreaWithRelations } from "../types";

interface AreaCardProps {
  area: AreaWithRelations;
  onEdit?: (area: AreaWithRelations) => void;
  onDelete?: (area: AreaWithRelations) => void;
  onClick?: (area: AreaWithRelations) => void;
}

export function AreaCard({ area, onEdit, onDelete, onClick }: AreaCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="group hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(area)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: area.color ? `${area.color}20` : "hsl(var(--primary) / 0.1)",
            }}
          >
            <Building2
              className="h-5 w-5"
              style={{ color: area.color || "hsl(var(--primary))" }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-base leading-none">{area.name}</h3>
            <Badge
              variant={area.status === "active" ? "default" : "secondary"}
              className="mt-1 text-xs"
            >
              {area.status === "active" ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </div>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(area);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(area);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {area.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {area.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {/* Leader info */}
          <div className="flex items-center gap-2">
            {area.leader ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={area.leader.photo_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(area.leader.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {area.leader.display_name}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Sem líder definido
              </span>
            )}
          </div>

          {/* Team count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {area.team_count || 0} time{(area.team_count || 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
