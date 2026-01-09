/**
 * WizardSetup - Passo 0: Configuração inicial do wizard
 * 
 * Seleção de ciclo e time antes de iniciar o check-in em grupo
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarDays, 
  Users, 
  ArrowRight, 
  Info,
  AlertCircle,
} from 'lucide-react';
import { useCycles, useActiveCycles } from '../../hooks/useCycleData';
import { useManageableTeamsFlat } from '../../hooks/useManageableTeams';
import { cn } from '@/lib/utils';

interface WizardSetupProps {
  onComplete: (
    cycleId: string,
    cycleName: string,
    teamIds: string[],
    teamName: string
  ) => void;
}

export function WizardSetup({ onComplete }: WizardSetupProps) {
  // Cycles
  const { data: allCycles, isLoading: cyclesLoading } = useCycles();
  const { data: activeCycles } = useActiveCycles();
  
  // Teams
  const { 
    teams: manageableTeams, 
    isLoading: teamsLoading, 
    hasManageableTeams,
    userTeamId,
  } = useManageableTeamsFlat();
  
  // State
  const defaultCycleId = useMemo(() => {
    // Find first active quarterly cycle
    const quarterCycle = activeCycles?.find(c => c.type === 'quarter');
    return quarterCycle?.id || activeCycles?.[0]?.id || '';
  }, [activeCycles]);
  
  const [selectedCycleId, setSelectedCycleId] = useState<string>(defaultCycleId);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeamId || '');
  
  // Update defaults when data loads
  useMemo(() => {
    if (!selectedCycleId && defaultCycleId) {
      setSelectedCycleId(defaultCycleId);
    }
    if (!selectedTeamId && userTeamId && manageableTeams.some(t => t.id === userTeamId)) {
      setSelectedTeamId(userTeamId);
    } else if (!selectedTeamId && manageableTeams.length > 0) {
      setSelectedTeamId(manageableTeams[0].id);
    }
  }, [defaultCycleId, userTeamId, manageableTeams, selectedCycleId, selectedTeamId]);
  
  // Selected cycle info
  const selectedCycle = useMemo(() => 
    allCycles?.find(c => c.id === selectedCycleId),
    [allCycles, selectedCycleId]
  );
  
  // Selected team info
  const selectedTeam = useMemo(() => 
    manageableTeams.find(t => t.id === selectedTeamId),
    [manageableTeams, selectedTeamId]
  );
  
  // Get all team IDs to include (parent + children)
  const teamIdsToInclude = useMemo(() => {
    if (!selectedTeamId) return [];
    
    const ids = [selectedTeamId];
    
    // Add child teams
    const addChildren = (parentId: string) => {
      manageableTeams
        .filter(t => t.parentId === parentId)
        .forEach(child => {
          ids.push(child.id);
          addChildren(child.id);
        });
    };
    
    addChildren(selectedTeamId);
    return ids;
  }, [selectedTeamId, manageableTeams]);
  
  // Can proceed?
  const canProceed = !!selectedCycleId && !!selectedTeamId && hasManageableTeams;
  
  const handleStart = () => {
    if (!selectedCycle || !selectedTeam) return;
    onComplete(
      selectedCycleId,
      selectedCycle.name,
      teamIdsToInclude,
      selectedTeam.name
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Intro */}
      <div className="text-center pb-4">
        <h2 className="text-xl font-semibold mb-2">Vamos começar o check-in!</h2>
        <p className="text-muted-foreground text-sm">
          Selecione o ciclo e o time para fazer check-in nos Key Results.
        </p>
      </div>
      
      {/* No manageable teams warning */}
      {!teamsLoading && !hasManageableTeams && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para gerenciar check-ins de nenhum time.
            Entre em contato com seu líder ou administrador.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Cycle Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Ciclo
        </Label>
        {cyclesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={selectedCycleId}
            onValueChange={setSelectedCycleId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um ciclo" />
            </SelectTrigger>
            <SelectContent>
              {allCycles?.filter(c => c.type === 'quarter').map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  <div className="flex items-center gap-2">
                    {cycle.name}
                    {activeCycles?.some(ac => ac.id === cycle.id) && (
                      <Badge variant="secondary" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Team Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Time
        </Label>
        {teamsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={selectedTeamId}
            onValueChange={setSelectedTeamId}
            disabled={!hasManageableTeams}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um time" />
            </SelectTrigger>
            <SelectContent>
              {manageableTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    {team.level > 0 && (
                      <span className="text-muted-foreground">
                        {'└'.repeat(team.level)}
                      </span>
                    )}
                    {team.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Team scope info */}
        {teamIdsToInclude.length > 1 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Inclui {teamIdsToInclude.length - 1} sub-time(s)
          </p>
        )}
      </div>
      
      {/* Summary Banner */}
      {selectedCycle && selectedTeam && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm">
            <span className="text-muted-foreground">Você está fazendo check-in para:</span>
          </p>
          <p className="font-medium mt-1">
            {selectedTeam.name} — {selectedCycle.name}
          </p>
        </div>
      )}
      
      {/* Action */}
      <div className="pt-4">
        <Button
          onClick={handleStart}
          disabled={!canProceed}
          className="w-full"
          size="lg"
        >
          Começar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
