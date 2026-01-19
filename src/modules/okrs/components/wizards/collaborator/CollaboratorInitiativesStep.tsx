/**
 * CollaboratorInitiativesStep - Etapa 3 do Wizard Colaborador (Opcional)
 * 
 * Exibe iniciativas vinculadas aos KRs do colaborador:
 * - Destaca iniciativas paradas, atrasadas ou recém-iniciadas
 * - Permite marcar iniciativas como "em risco"
 * - Permite adicionar comentários rápidos
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  SkipForward,
  Lightbulb,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { InitiativesSummary } from '../shared/InitiativesSummary';
import { MicrocopyQuestion } from '../shared/ReflectionQuestions';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { Initiative } from '@/modules/okrs/types/initiative';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorInitiativesStepProps {
  krs: WizardKr[];
  onContinue: (markedAtRisk: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorInitiativesStep({
  krs,
  onContinue,
  onBack,
  onSkip,
}: CollaboratorInitiativesStepProps) {
  const supabase = useBuScopedSupabase();
  const [markedAtRisk, setMarkedAtRisk] = useState<string[]>([]);

  // Get KR IDs
  const krIds = useMemo(() => krs.map(kr => kr.id), [krs]);

  // Fetch initiatives for all KRs
  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: queryKeys.okrs.initiativesByKrs(krIds),
    queryFn: async () => {
      if (krIds.length === 0) return [];

      const { data, error } = await supabase
        .from('okr_initiatives')
        .select('id, name, description, kr_id, owner_user_id, status, priority, start_date, expected_end_date, progress, notes, updated_at')
        .in('kr_id', krIds)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Initiative[];
    },
    enabled: krIds.length > 0,
  });

  // Group initiatives by KR
  const initiativesByKr = useMemo(() => {
    const grouped = new Map<string, Initiative[]>();
    for (const init of initiatives) {
      const existing = grouped.get(init.kr_id) || [];
      existing.push(init);
      grouped.set(init.kr_id, existing);
    }
    return grouped;
  }, [initiatives]);

  // Stats
  const stats = useMemo(() => {
    const total = initiatives.length;
    const blocked = initiatives.filter(i => i.status === 'blocked').length;
    const overdue = initiatives.filter(i => {
      if (!i.expected_end_date) return false;
      if (i.status === 'completed') return false;
      return new Date(i.expected_end_date) < new Date();
    }).length;
    return { total, blocked, overdue, needsAttention: blocked + overdue };
  }, [initiatives]);

  // Handle mark at risk
  const handleMarkAtRisk = (initiativeId: string, atRisk: boolean) => {
    setMarkedAtRisk(prev => 
      atRisk 
        ? [...prev, initiativeId]
        : prev.filter(id => id !== initiativeId)
    );
  };

  // Handle continue
  const handleContinue = () => {
    onContinue(markedAtRisk);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // If no initiatives, show skip option
  if (initiatives.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="p-4 rounded-full bg-muted/50 inline-block mb-4">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma iniciativa vinculada</h3>
            <p className="text-muted-foreground mb-6">
              Você não possui iniciativas vinculadas aos seus KRs. 
              Isso é normal — iniciativas são opcionais.
            </p>
            <Button onClick={onSkip} size="lg">
              Continuar para reflexão
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-background">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Iniciativas vinculadas</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{stats.total} iniciativas</Badge>
            {stats.needsAttention > 0 && (
              <Badge variant="destructive">{stats.needsAttention} atenção</Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Revise as iniciativas e marque as que precisam de atenção.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Prompt */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                O sistema não força atualização de iniciativas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas revise e sinalize se alguma merece atenção do time ou líder.
              </p>
            </div>
          </div>

          {/* Initiatives by KR */}
          {krs.map(kr => {
            const krInitiatives = initiativesByKr.get(kr.id) || [];
            if (krInitiatives.length === 0) return null;

            return (
              <div key={kr.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {kr.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {krInitiatives.length}
                  </Badge>
                </div>
                
                <InitiativesSummary
                  initiatives={krInitiatives}
                  markedAtRisk={markedAtRisk}
                  onMarkAtRisk={handleMarkAtRisk}
                  editable
                />
              </div>
            );
          })}

          {/* Question */}
          <MicrocopyQuestion 
            question="Alguma iniciativa merece atenção do time ou do líder na próxima reunião?"
            variant="highlight"
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" />
            Pular
          </Button>

          <Button onClick={handleContinue} className="flex-1">
            Continuar
            {markedAtRisk.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {markedAtRisk.length} sinalizadas
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
