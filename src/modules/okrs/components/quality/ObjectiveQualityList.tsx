/**
 * ObjectiveQualityList - Lista de objetivos com indicadores de qualidade
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  ChevronRight, 
  Heart,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { ObjectiveWithHealth } from "../../hooks";
import type { HealthStatus } from "../../types/health";
import { getHealthStatusConfig } from "../../types/health";

interface ObjectiveQualityListProps {
  objectives: ObjectiveWithHealth[];
  isLoading?: boolean;
}

function getStatusBadge(status: HealthStatus, score: number) {
  const config = getHealthStatusConfig(status);
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium gap-1 border-0",
        config.bgColor,
        config.color
      )}
    >
      <Heart className="w-3 h-3" />
      {config.label}
      <span className="font-mono ml-0.5">{score}%</span>
    </Badge>
  );
}

function ObjectiveRow({ objective }: { objective: ObjectiveWithHealth }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors rounded-lg group">
      <div className="p-2 rounded-lg bg-primary/10">
        <Target className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{objective.title}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {objective.krs_updated}/{objective.kr_count} KRs atualizados
          </span>
          {objective.krs_at_risk > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              {objective.krs_at_risk} em risco
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {getStatusBadge(objective.health_status, objective.health_score)}
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <Link to={`/okrs?view=team&team_id=${objective.team_id}`}>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ObjectiveQualityList({ objectives, isLoading }: ObjectiveQualityListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (objectives.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Objetivos do Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum objetivo encontrado para este ciclo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by health score (worst first for visibility)
  const sortedObjectives = [...objectives].sort((a, b) => a.health_score - b.health_score);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          Objetivos do Time
          <Badge variant="secondary" className="ml-auto font-normal">
            {objectives.length} objetivo{objectives.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          {sortedObjectives.map((objective) => (
            <ObjectiveRow key={objective.id} objective={objective} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
