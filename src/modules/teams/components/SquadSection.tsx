import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Layers } from "lucide-react";
import { useSquads } from "../hooks/useSquads";
import { SquadCard } from "./SquadCard";
import { SquadFormDialog } from "./SquadFormDialog";
import { SquadDetailDialog } from "./SquadDetailDialog";
import { SquadWithRelations } from "../types/squad";
import { useTeamManagement } from "@/hooks/useTeamManagement";

interface SquadSectionProps {
  teamId: string;
  teamName: string;
}

export function SquadSection({ teamId, teamName }: SquadSectionProps) {
  const { data: squads, isLoading } = useSquads(teamId);
  const { canManageTeam } = useTeamManagement();
  
  // Verificar se usuário pode gerenciar o time pai (e consequentemente squads)
  const canManageSquads = canManageTeam(teamId);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<SquadWithRelations | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            Squads Relacionados ({squads?.length || 0})
          </CardTitle>
          {canManageSquads && (
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Squad
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {squads && squads.length > 0 ? (
            <div className="grid gap-3">
              {squads.map((squad) => (
                <SquadCard 
                  key={squad.id} 
                  squad={squad}
                  onClick={() => setSelectedSquad(squad)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground mb-2">
                Nenhum squad vinculado a este time
              </p>
              {canManageSquads && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                >
                  Criar Squad
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SquadFormDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        defaultTeamId={teamId}
      />

      <SquadDetailDialog
        squad={selectedSquad}
        open={!!selectedSquad}
        onOpenChange={(open) => !open && setSelectedSquad(null)}
      />
    </>
  );
}
