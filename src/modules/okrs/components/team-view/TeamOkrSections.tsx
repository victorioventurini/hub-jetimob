import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ObjectiveListItem } from '../dashboard/ObjectiveListItem';
import { ContributingOkrCard } from './ContributingOkrCard';

interface TeamOkrSectionsProps {
  primaryObjectives: any[];
  contributedObjectives: any[];
  teamId: string;
  teamName: string;
  isLoading?: boolean;
  /** Se o usuário pode editar OKRs deste time */
  canEdit?: boolean;
}

/**
 * Component that separates team OKRs into two sections:
 * 1. Primary OKRs - where the team is the primary owner
 * 2. Contributed OKRs - shared OKRs where the team contributes (but is not primary)
 */
export function TeamOkrSections({
  primaryObjectives,
  contributedObjectives,
  teamId,
  teamName,
  isLoading = false,
  canEdit = false,
}: TeamOkrSectionsProps) {
  const hasContributions = contributedObjectives.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Primary OKRs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold">OKRs do {teamName}</h2>
          <Badge variant="outline" className="ml-2">
            {primaryObjectives.length} objetivo{primaryObjectives.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {primaryObjectives.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Este time ainda não possui objetivos próprios.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {primaryObjectives.map((objective) => (
              <ObjectiveListItem
                key={objective.id}
                objective={objective}
                keyResults={objective.key_results || []}
                type="team"
                teamName={teamName}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Contributed OKRs (Shared) */}
      {hasContributions && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-status-purple" />
            <h2 className="text-lg font-semibold">OKRs Compartilhadas</h2>
            <Badge 
              variant="outline" 
              className="ml-2 bg-status-purple-muted text-status-purple border-status-purple/30"
            >
              {contributedObjectives.length} contribuição{contributedObjectives.length !== 1 ? 'ões' : ''}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            OKRs onde o {teamName} atua como time contribuidor.
          </p>

          <div className="space-y-6">
            {contributedObjectives.map((objective) => (
              <ContributingOkrCard
                key={objective.id}
                objective={objective}
                currentTeamId={teamId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
