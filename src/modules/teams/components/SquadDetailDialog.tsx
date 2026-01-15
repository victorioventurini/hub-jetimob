import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Building2, 
  Plus, 
  Edit, 
  UserMinus,
  Layers
} from "lucide-react";
import { useSquad, useUpdateSquadMember, useRemoveSquadMember } from "../hooks";
import { 
  SquadWithRelations, 
  SQUAD_PRODUCT_LABELS, 
  SQUAD_PRODUCT_COLORS,
  SQUAD_ROLE_LABELS,
  SquadRole
} from "../types/squad";
import { AddSquadMemberDialog } from "./AddSquadMemberDialog";
import { SquadFormDialog } from "./SquadFormDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface SquadDetailDialogProps {
  squad: SquadWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SquadDetailDialog({ squad, open, onOpenChange }: SquadDetailDialogProps) {
  const { data: fullSquad, isLoading } = useSquad(squad?.id);
  const { has, isWildcard } = usePermissions();
  const updateMember = useUpdateSquadMember();
  const removeMember = useRemoveSquadMember();
  
  // BU admin or global admin can manage squads via permission key
  const canManageSquads = isWildcard || has("teams.squad.update:bu");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const displaySquad = fullSquad || squad;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleRoleChange = async (membershipId: string, role: SquadRole) => {
    if (!displaySquad) return;
    await updateMember.mutateAsync({
      membershipId,
      squadId: displaySquad.id,
      role,
    });
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!displaySquad) return;
    await removeMember.mutateAsync({
      membershipId,
      squadId: displaySquad.id,
    });
  };

  if (!displaySquad) return null;

  // Group members by role
  const leaders = displaySquad.members?.filter((m) => m.role !== "member") || [];
  const regularMembers = displaySquad.members?.filter((m) => m.role === "member") || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-accent" />
                  {displaySquad.name}
                </DialogTitle>
                {displaySquad.description && (
                  <p className="text-sm text-muted-foreground">
                    {displaySquad.description}
                  </p>
                )}
              </div>
              {canManageSquads && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Products */}
            <div className="flex gap-2">
              {displaySquad.products.map((product) => (
                <Badge 
                  key={product} 
                  variant="outline" 
                  className={SQUAD_PRODUCT_COLORS[product]}
                >
                  {SQUAD_PRODUCT_LABELS[product]}
                </Badge>
              ))}
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{displaySquad.member_count || 0} membros</span>
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{displaySquad.teams?.length || 0} times</span>
              </div>
            </div>

            <Separator />

            {/* Linked Teams */}
            <div>
              <h4 className="text-sm font-medium mb-2">Times Vinculados</h4>
              <div className="flex flex-wrap gap-2">
                {displaySquad.teams?.map((team) => (
                  <Badge key={team.id} variant="secondary">
                    {team.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Leaders */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Liderança</h4>
              </div>
              {leaders.length > 0 ? (
                <div className="space-y-2">
                  {leaders.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-accent/10 text-accent">
                            {getInitials(member.user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.user.display_name}</p>
                          <p className="text-xs text-muted-foreground">{member.user.job_title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManageSquads ? (
                          <Select
                            value={member.role}
                            onValueChange={(v: SquadRole) => handleRoleChange(member.id, v)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product_owner">PO</SelectItem>
                              <SelectItem value="tech_lead">Tech Lead</SelectItem>
                              <SelectItem value="ux_ui_lead">UX / UI Lead</SelectItem>
                              <SelectItem value="member">Membro</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {SQUAD_ROLE_LABELS[member.role]}
                          </Badge>
                        )}
                        {canManageSquads && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum líder definido</p>
              )}
            </div>

            <Separator />

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Membros</h4>
                {canManageSquads && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-1"
                    onClick={() => setAddMemberOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>
              {regularMembers.length > 0 ? (
                <div className="space-y-2">
                  {regularMembers.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.photo_url || undefined} />
                          <AvatarFallback className="text-xs bg-accent/10 text-accent">
                            {getInitials(member.user.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.user.display_name}</p>
                          <p className="text-xs text-muted-foreground">{member.user.job_title}</p>
                        </div>
                      </div>
                      {canManageSquads && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(v: SquadRole) => handleRoleChange(member.id, v)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product_owner">PO</SelectItem>
                              <SelectItem value="tech_lead">Tech Lead</SelectItem>
                              <SelectItem value="ux_ui_lead">UX / UI Lead</SelectItem>
                              <SelectItem value="member">Membro</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum membro ainda</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {displaySquad && (
        <>
          <AddSquadMemberDialog
            squadId={displaySquad.id}
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            existingMemberIds={displaySquad.members?.map((m) => m.user_id) || []}
          />
          <SquadFormDialog
            squad={displaySquad}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        </>
      )}
    </>
  );
}
