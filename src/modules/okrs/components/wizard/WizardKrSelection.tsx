/**
 * WizardKrSelection - Passo 1: Seleção de KRs para check-in
 * 
 * Triagem inteligente com filtros: Pendentes, Em Risco, Todos
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock,
  AlertTriangle,
  ListChecks,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamPendingKrs, WizardKr, WizardKrFilter, countKrsByFilter } from '../../hooks/useTeamPendingKrs';
import { formatDaysSince } from '../../hooks/useCycleCheckins';

interface WizardKrSelectionProps {
  cycleId: string;
  teamIds: string[];
  onComplete: (selectedKrs: WizardKr[]) => void;
  onBack: () => void;
}

const statusColors = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  not_started: 'bg-muted-foreground',
};

const statusLabels = {
  green: 'No caminho',
  yellow: 'Em risco',
  red: 'Atrasado',
  not_started: 'Não iniciado',
};

export function WizardKrSelection({ 
  cycleId, 
  teamIds, 
  onComplete, 
  onBack 
}: WizardKrSelectionProps) {
  const [filter, setFilter] = useState<WizardKrFilter>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Fetch all KRs (we filter client-side for counts)
  const { data: allKrs = [], isLoading } = useTeamPendingKrs(cycleId, teamIds, 'all');
  
  // Get counts
  const counts = useMemo(() => countKrsByFilter(allKrs), [allKrs]);
  
  // Filter KRs based on current tab
  const filteredKrs = useMemo(() => {
    if (filter === 'pending') return allKrs.filter(kr => kr.is_pending);
    if (filter === 'at_risk') return allKrs.filter(kr => kr.is_at_risk);
    return allKrs;
  }, [allKrs, filter]);
  
  // Selected KRs
  const selectedKrs = useMemo(() => 
    allKrs.filter(kr => selectedIds.has(kr.id)),
    [allKrs, selectedIds]
  );
  
  // Toggle selection
  const toggleSelection = (krId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(krId)) {
        next.delete(krId);
      } else {
        next.add(krId);
      }
      return next;
    });
  };
  
  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredKrs.map(kr => kr.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };
  
  // Select all pending
  const selectAllPending = () => {
    const pendingIds = allKrs.filter(kr => kr.is_pending).map(kr => kr.id);
    setSelectedIds(new Set(pendingIds));
  };
  
  // Handle continue
  const handleContinue = () => {
    if (selectedKrs.length === 0) return;
    onComplete(selectedKrs);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-6 pt-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as WizardKrFilter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pendentes</span>
              {counts.pending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="at_risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Em Risco</span>
              {counts.atRisk > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.atRisk}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Todos</span>
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">
                {counts.all}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Quick actions */}
      <div className="px-6 py-3 flex items-center gap-2 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAllPending}
          disabled={counts.pending === 0}
        >
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          Selecionar pendentes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={selectAllVisible}
          disabled={filteredKrs.length === 0}
        >
          Selecionar visíveis
        </Button>
        {selectedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground"
          >
            Limpar ({selectedIds.size})
          </Button>
        )}
      </div>
      
      {/* KR List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : filteredKrs.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {filter === 'pending' && 'Nenhum KR pendente! 🎉'}
                {filter === 'at_risk' && 'Nenhum KR em risco!'}
                {filter === 'all' && 'Nenhum KR encontrado.'}
              </p>
            </div>
          ) : (
            filteredKrs.map((kr) => (
              <KrCard
                key={kr.id}
                kr={kr}
                isSelected={selectedIds.has(kr.id)}
                onToggle={() => toggleSelection(kr.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} KR(s) selecionado(s)
          </span>
          <Button 
            onClick={handleContinue}
            disabled={selectedIds.size === 0}
          >
            Fazer check-in
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KR Card Component
// ============================================================

interface KrCardProps {
  kr: WizardKr;
  isSelected: boolean;
  onToggle: () => void;
}

function KrCard({ kr, isSelected, onToggle }: KrCardProps) {
  const ownerInitials = kr.owner_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div
      className={cn(
        "p-4 border rounded-lg cursor-pointer transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2">{kr.title}</h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {kr.objective_title}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  kr.status === 'green' && 'border-green-300 text-green-700',
                  kr.status === 'yellow' && 'border-yellow-300 text-yellow-700',
                  kr.status === 'red' && 'border-red-300 text-red-700'
                )}
              >
                {statusLabels[kr.status]}
              </Badge>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-3">
            <Progress value={kr.progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {Math.round(kr.progress)}%
            </span>
          </div>
          
          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {kr.owner_name && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={kr.owner_photo || undefined} />
                    <AvatarFallback className="text-[8px]">{ownerInitials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[100px]">{kr.owner_name}</span>
                </div>
              )}
              <span className="text-muted-foreground/70">•</span>
              <span>{kr.team_name}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className={cn(kr.is_pending && "text-destructive font-medium")}>
                {kr.last_checkin_at ? formatDaysSince(kr.days_since_checkin) : 'Nunca'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
