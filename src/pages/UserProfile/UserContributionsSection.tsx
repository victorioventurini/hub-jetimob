import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Info } from "lucide-react";
import { useBu } from "@/contexts/BuContext";
import { useMyTeamObjectives, useMyTeamKeyResults } from "@/modules/okrs/hooks";
import { ObjectiveListItem } from "@/modules/okrs/components/dashboard/ObjectiveListItem";

interface UserContributionsSectionProps {
  profileId: string;
  firstName: string;
  buName?: string;
}

/**
 * User Contributions Section - displays OKRs and initiatives where the user contributes directly
 * Uses the same filtering logic as the "Minhas OKRs" view (/okrs?view=my)
 * Read-only - no check-in or edit buttons
 */
export function UserContributionsSection({ profileId, firstName, buName }: UserContributionsSectionProps) {
  const { currentBu } = useBu();
  const buId = currentBu?.id;
  
  const { data: myObjectives, isLoading: objectivesLoading } = useMyTeamObjectives(buId, profileId);
  const { data: myKrs, isLoading: krsLoading } = useMyTeamKeyResults(buId, profileId);
  
  const isLoading = objectivesLoading || krsLoading;
  
  // Filter objectives to only include KRs where the user is responsible (same as OkrDashboardPage)
  const displayObjectives = useMemo(() => {
    if (!myObjectives || !myKrs) return [];
    
    const myKrIds = new Set(myKrs.map((kr: any) => kr.id));
    
    return myObjectives
      .map((objective: any) => ({
        ...objective,
        key_results: (objective.key_results || []).filter((kr: any) => myKrIds.has(kr.id))
      }))
      .filter((obj: any) => obj.key_results.length > 0);
  }, [myObjectives, myKrs]);
  
  // If no objectives/contributions, don't render anything
  if (!isLoading && displayObjectives.length === 0) {
    return null;
  }
  
  const title = buName 
    ? `Contribuições de ${firstName} para os objetivos da ${buName}`
    : `Contribuições de ${firstName} para os objetivos`;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info banner */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" />
          <span>Exibindo apenas KRs e iniciativas onde {firstName} é responsável.</span>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {displayObjectives.map((objective: any) => (
              <ObjectiveListItem
                key={objective.id}
                objective={objective}
                keyResults={objective.key_results || []}
                type="team"
                teamName={objective.team?.name}
                canEdit={false}
                canCheckin={false}
                filterInitiativesForUser={profileId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}